import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, FileText, X, Plus, Briefcase, Tag } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { NameListModal } from "../../components/NameListModal";
import { hrApi } from "../../services/api";

const LeaveManagement = ({ role = "hr" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const handledNavKey = useRef(null);
  const reloadedForNav = useRef(null);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewingRequest, setViewingRequest] = useState(null);
  const [showLeaveTypes, setShowLeaveTypes] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      const allowed = role === "admin" ? u.role === "ADMIN" : u.role === "HR_MANAGER" || u.role === "ADMIN";
      if (!allowed) { navigate("/unauthorized"); return; }
      setUser(u);
    } else navigate("/login");
  }, [navigate, role]);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actingId, setActingId] = useState(null);
  // Leave being rejected — HR must give a comment, which the employee sees on their Leave page
  const [rejecting, setRejecting] = useState(null);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectError, setRejectError] = useState("");

  // API rows (Employee_Backend LeaveApplicationDTO) -> the shape this table renders
  const toRow = (l) => ({
    id: l.id,
    empId: l.employeeIdNumber || "—",
    name: l.employeeName || "—",
    department: l.departmentName || "—",
    leaveType: l.leaveTypeName || "—",
    startDate: l.startDate,
    endDate: l.endDate,
    days: l.numberOfDays,
    reason: l.reason || "",
    appliedOn: l.createdAt ? l.createdAt.split("T")[0] : "—",
    status: l.status ? l.status.charAt(0) + l.status.slice(1).toLowerCase() : "",
    rejectionReason: l.rejectionReason,
    reviewedBy: l.approvedByName,
  });

  const flash = (text) => { setMessage(text); setTimeout(() => setMessage(""), 3500); };
  // Server errors come back as "400: <reason>"; show just the reason
  const errorText = (e, fallback) => (e?.message || fallback).replace(/^\d{3}:\s*/, "");

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const res = await hrApi.getLeaveRequests();
      setLeaveRequests((res.data || []).map(toRow));
    } catch (e) {
      flash("✗ " + errorText(e, "Failed to load leave requests"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadLeaves(); }, [user]);

  // Arriving from a notification (/hr/leave?view=<id>): open that request's form, so HR can approve or reject it.
  useEffect(() => {
    const viewId = new URLSearchParams(location.search).get("view");
    if (!user || !viewId || loading || handledNavKey.current === location.key) return;
    const found = leaveRequests.find(r => String(r.id) === viewId);
    if (found) {
      handledNavKey.current = location.key;
      setViewingRequest(found);
    } else if (reloadedForNav.current !== location.key) {
      reloadedForNav.current = location.key; // brand-new request: refresh the list once and look again
      loadLeaves();
    } else {
      handledNavKey.current = location.key;
      flash("✗ That leave request could not be found");
    }
  }, [user, loading, leaveRequests, location.key, location.search]);

  const stats = {
    total:    leaveRequests.length,
    pending:  leaveRequests.filter(r => r.status === "Pending").length,
    approved: leaveRequests.filter(r => r.status === "Approved").length,
    rejected: leaveRequests.filter(r => r.status === "Rejected").length,
  };

  const filtered = leaveRequests.filter(r =>
    (r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.empId.toLowerCase().includes(searchTerm.toLowerCase()) || r.department.toLowerCase().includes(searchTerm.toLowerCase()) || r.leaveType.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === "all" || r.status.toLowerCase() === filterStatus.toLowerCase())
  );

  const handleApprove = async (id) => {
    try {
      setActingId(id);
      const res = await hrApi.approveLeave(id);
      setLeaveRequests(prev => prev.map(r => r.id === id ? toRow(res.data) : r));
      setViewingRequest(null);
      flash("✓ Leave approved");
    } catch (e) {
      flash("✗ " + errorText(e, "Failed to approve leave"));
    } finally {
      setActingId(null);
    }
  };

  const openReject = (r) => { setRejecting(r); setRejectComment(""); setRejectError(""); };

  const handleReject = async (e) => {
    e.preventDefault();
    const comment = rejectComment.trim();
    if (!comment) { setRejectError("Please add a comment explaining the rejection"); return; }
    const id = rejecting.id;
    try {
      setActingId(id);
      const res = await hrApi.rejectLeave(id, comment);
      setLeaveRequests(prev => prev.map(r => r.id === id ? toRow(res.data) : r));
      setRejecting(null);
      setViewingRequest(null);
      flash("✓ Leave rejected");
    } catch (err) {
      setRejectError(errorText(err, "Failed to reject leave"));
    } finally {
      setActingId(null);
    }
  };

  const statusBadge = (s) => ({ Approved:"bg-emerald-100 text-emerald-700", Rejected:"bg-red-100 text-red-700", Pending:"bg-amber-100 text-amber-700" }[s] || "bg-gray-100 text-gray-600");
  const accentFrom = role === "admin" ? "from-indigo-500 to-violet-600" : "from-teal-500 to-emerald-600";

  if (!user) return null;
  return (
    <PageLayout role={role} activePage={role === "admin" ? "Leave" : "Leave Management"}
      title={role === "admin" ? "System-Wide Leave" : "Leave Management"}
      subtitle="Approve and manage employee leave requests"
      actions={role === "hr" && (
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLeaveTypes(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-all duration-200">
            <Plus size={17} strokeWidth={2.5} /> Add Leave Types
          </button>
          <button onClick={() => navigate("/hr/leave/assign")}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-all duration-200">
            <Briefcase size={17} strokeWidth={2.5} /> Assign Leaves for Job Roles
          </button>
        </div>
      )}
    >
      <div className="space-y-6">
        {message && (
          <div className={`p-4 rounded-xl text-white text-sm font-medium ${message.startsWith("✓") ? "bg-emerald-500" : "bg-red-500"}`}>{message}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label:"Total",    value:stats.total,    gradient:"from-indigo-400 to-violet-500" },
            { label:"Pending",  value:stats.pending,  gradient:"from-amber-400 to-orange-500" },
            { label:"Approved", value:stats.approved, gradient:"from-emerald-400 to-teal-500" },
            { label:"Rejected", value:stats.rejected, gradient:"from-red-400 to-rose-500" },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.gradient} p-6 rounded-2xl text-white hover:-translate-y-1 transition-all duration-300`}>
              <p className="text-white/80 text-sm mb-1">{s.label}</p>
              <p className="text-4xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, ID, department, or leave type…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50" />
            </div>
            <div className="relative">
              <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 appearance-none">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`bg-gradient-to-r ${accentFrom} text-white text-xs`}>
                  {["Emp ID","Employee","Dept","Leave Type","Duration","Days","Applied","Status","Actions"].map(h => <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-teal-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                    <td className="px-5 py-3.5 font-mono font-semibold text-gray-700">{r.empId}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{r.name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{r.department}</td>
                    <td className="px-5 py-3.5 text-gray-600">{r.leaveType}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{r.startDate} → {r.endDate}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800">{r.days}</td>
                    <td className="px-5 py-3.5 text-gray-400">{r.appliedOn}</td>
                    <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(r.status)}`}>{r.status}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setViewingRequest(r)} className="flex items-center gap-1 text-teal-600 hover:text-teal-800 font-semibold text-xs"><Eye size={13} /> View</button>
                        {r.status === "Pending" && (
                          <>
                            <button onClick={() => handleApprove(r.id)} disabled={actingId === r.id}
                              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold text-xs disabled:opacity-50"><CheckCircle size={13} /> Approve</button>
                            <button onClick={() => openReject(r)} disabled={actingId === r.id}
                              className="flex items-center gap-1 text-red-600 hover:text-red-800 font-semibold text-xs disabled:opacity-50"><XCircle size={13} /> Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading leave requests…</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-gray-400">No leave requests found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className={`flex items-center justify-between p-6 bg-gradient-to-r ${accentFrom} text-white rounded-t-2xl`}>
              <h3 className="text-xl font-bold">Leave Request Details</h3>
              <button onClick={() => setViewingRequest(null)} className="p-1.5 hover:bg-white/20 rounded-xl"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Employee ID",viewingRequest.empId],["Name",viewingRequest.name],["Department",viewingRequest.department],["Leave Type",viewingRequest.leaveType],["Start Date",viewingRequest.startDate],["End Date",viewingRequest.endDate],["Total Days",`${viewingRequest.days} day(s)`],["Applied On",viewingRequest.appliedOn]].map(([l,v]) => (
                  <div key={l}><p className="text-xs text-gray-400 mb-0.5">{l}</p><p className="font-semibold text-gray-800">{v}</p></div>
                ))}
              </div>
              <div><p className="text-xs text-gray-400 mb-1">Reason</p><p className="bg-gray-50 p-3 rounded-xl text-sm text-gray-700">{viewingRequest.reason}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">Status</p><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(viewingRequest.status)}`}>{viewingRequest.status}</span>
                {viewingRequest.reviewedBy && viewingRequest.status !== "Pending" && <span className="ml-2 text-xs text-gray-400">by {viewingRequest.reviewedBy}</span>}
              </div>
              {viewingRequest.status === "Rejected" && viewingRequest.rejectionReason && (
                <div><p className="text-xs text-gray-400 mb-1">Rejection Comment</p><p className="bg-red-50 p-3 rounded-xl text-sm text-red-700">{viewingRequest.rejectionReason}</p></div>
              )}
              {viewingRequest.status === "Pending" && (
                <div className="flex gap-3">
                  <button onClick={() => handleApprove(viewingRequest.id)} disabled={actingId === viewingRequest.id} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"><CheckCircle size={15} /> Approve</button>
                  <button onClick={() => openReject(viewingRequest)} disabled={actingId === viewingRequest.id} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"><XCircle size={15} /> Reject</button>
                </div>
              )}
              <button onClick={() => setViewingRequest(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject — comment is required and shown to the employee */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form onSubmit={handleReject} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-t-2xl">
              <h3 className="text-xl font-bold">Reject Leave Request</h3>
              <button type="button" onClick={() => setRejecting(null)} className="p-1.5 hover:bg-white/20 rounded-xl"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{rejecting.name}</span> · {rejecting.leaveType} · {rejecting.startDate} → {rejecting.endDate} ({rejecting.days} day(s))
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comment *</label>
                <textarea value={rejectComment} onChange={e => { setRejectComment(e.target.value); setRejectError(""); }} rows={4} autoFocus
                  placeholder="Tell the employee why this request is rejected…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50 resize-none" />
              </div>
              {rejectError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{rejectError}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={actingId === rejecting.id} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                  <XCircle size={15} /> {actingId === rejecting.id ? "Rejecting…" : "Reject Leave"}
                </button>
                <button type="button" onClick={() => setRejecting(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm transition-colors">Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add / manage leave types — centered popup with blurred backdrop, like Add Employment Types */}
      {role === "hr" && (
        <NameListModal
          open={showLeaveTypes}
          onClose={() => setShowLeaveTypes(false)}
          title="Add Leave Types"
          subtitle="Define the kinds of leave your company offers"
          heading="Leave Types"
          hint="Add as many as you need, e.g. Sick Leave, Annual Leave"
          placeholder="Leave type, e.g. Sick Leave"
          addLabel="Add another leave"
          saveLabel="Save Leave Types"
          existingLabel="Existing leave types"
          emptyLabel="No leave types added yet"
          icon={Tag}
          load={hrApi.getLeaveTypes}
          save={hrApi.createLeaveTypes}
          onUpdate={hrApi.updateLeaveType}
          onDelete={hrApi.deleteLeaveType}
        />
      )}
    </PageLayout>
  );
};

// Export both HR and Admin leave pages from this shared component
export const HRLeave = () => <LeaveManagement role="hr" />;
export const AdminLeave = () => <LeaveManagement role="admin" />;
export default HRLeave;
