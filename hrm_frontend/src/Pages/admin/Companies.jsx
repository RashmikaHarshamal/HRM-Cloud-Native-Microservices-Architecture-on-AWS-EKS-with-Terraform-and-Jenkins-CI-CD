import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Search, Filter, Eye, CheckCircle, XCircle, Clock, X, AlertCircle, Loader2 } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { ADMIN_URL } from "../../services/api";

const AdminCompanies = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [viewingCompany, setViewingCompany] = useState(null);
  const [rejectingCompany, setRejectingCompany] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      if (u.role !== "ADMIN") {
        navigate("/unauthorized");
        return;
      }
      setUser(u);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ADMIN_URL}/admin/companies`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch companies list");
      }

      const responseData = await res.json();
      const list = responseData.data || responseData || [];
      setCompanies(list);
    } catch (err) {
      console.warn("Failed to fetch company list from Admin_Backend", err);
      setError(err.message || "Unable to fetch company list from Admin_Backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ADMIN_URL}/admin/companies/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Failed to approve company application (HTTP ${res.status}).`);
      }

      setSuccessMsg(`Company approved! The HR account (${viewingCompany?.email || "company email"}) was created and its login details were emailed to the client.`);
      setViewingCompany(null);
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResend = async (id) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ADMIN_URL}/admin/companies/${id}/resend-credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Failed to resend credentials (HTTP ${res.status}).`);
      }
      setSuccessMsg("A new temporary password was saved for the HR account and emailed to the client.");
      setViewingCompany(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingCompany) return;

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");
      const url = `${ADMIN_URL}/admin/companies/${rejectingCompany.id}/reject?reason=${encodeURIComponent(rejectionReason)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Failed to reject company application (HTTP ${res.status}).`);
      }

      setSuccessMsg("Company application rejected and rejection notification email sent to client.");
      setRejectingCompany(null);
      setViewingCompany(null);
      setRejectionReason("");
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const stats = {
    total: companies.length,
    pending: companies.filter((c) => (c.status || "").toUpperCase() === "PENDING").length,
    active: companies.filter((c) => (c.status || "").toUpperCase() === "ACTIVE" || (c.status || "").toUpperCase() === "APPROVED").length,
    rejected: companies.filter((c) => (c.status || "").toUpperCase() === "REJECTED").length,
  };

  const filtered = companies.filter((c) => {
    const nameStr = (c.companyName || c.name || "").toLowerCase();
    const indStr = (c.industry || "").toLowerCase();
    const matchesSearch = nameStr.includes(searchTerm.toLowerCase()) || indStr.includes(searchTerm.toLowerCase());

    const statusVal = (c.status || "").toLowerCase();
    const matchesStatus =
      filterStatus === "all" ||
      statusVal === filterStatus.toLowerCase() ||
      (filterStatus === "active" && statusVal === "approved");

    return matchesSearch && matchesStatus;
  });

  const statusBadge = (s) => {
    const norm = (s || "").toUpperCase();
    if (norm === "ACTIVE" || norm === "APPROVED") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (norm === "REJECTED") return "bg-red-100 text-red-700 border border-red-200";
    if (norm === "PENDING") return "bg-amber-100 text-amber-700 border border-amber-200";
    return "bg-gray-100 text-gray-600";
  };

  if (!user) return null;

  return (
    <PageLayout role="admin" activePage="Companies" title="Company Management" subtitle="Review, approve, and manage all registered company requests">
      <div className="space-y-6">

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold text-xs">Dismiss</button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold text-xs">Dismiss</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label: "Total Applications", value: stats.total, icon: "🏢", gradient: "from-indigo-400 to-violet-500" },
            { label: "Pending Review", value: stats.pending, icon: "⏳", gradient: "from-amber-400 to-orange-500" },
            { label: "Active / Approved", value: stats.active, icon: "✅", gradient: "from-emerald-400 to-teal-500" },
            { label: "Rejected", value: stats.rejected, icon: "❌", gradient: "from-red-400 to-rose-500" },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.gradient} p-6 rounded-2xl text-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <p className="text-4xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company name or industry…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              />
            </div>
            <div className="relative">
              <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 appearance-none font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active / Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs">
                  {["Company Name", "Industry", "Registration No", "Contact Person", "Contact Email", "Submitted", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin text-indigo-600" />
                        <span>Loading registered company applications...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-gray-400">
                      No company applications found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => (
                    <tr key={c.id || i} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                      <td className="px-5 py-3.5 font-bold text-gray-800">{c.companyName || c.name}</td>
                      <td className="px-5 py-3.5 text-gray-600">{c.industry || "General"}</td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">{c.registrationNumber || "N/A"}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-700">{c.contactPersonName || c.contact || "N/A"}</td>
                      <td className="px-5 py-3.5 text-gray-600">{c.email}</td>
                      <td className="px-5 py-3.5 text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : c.submittedOn || "N/A"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full font-semibold uppercase text-[10px] ${statusBadge(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => { setError(null); setSuccessMsg(null); setViewingCompany(c); }}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition-colors"
                        >
                          <Eye size={14} /> Inspect & Action
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Action Modal */}
      {viewingCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white">
              <div>
                <h3 className="text-xl font-bold">Company Application Request</h3>
                <p className="text-indigo-200 text-xs mt-0.5">Application Details & Approval Decision</p>
              </div>
              <button onClick={() => setViewingCompany(null)} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {[
                  ["Company Name", viewingCompany.companyName || viewingCompany.name],
                  ["Registration Number", viewingCompany.registrationNumber],
                  ["Industry / Sector", viewingCompany.industry || "N/A"],
                  ["Estimated Employees", viewingCompany.employeeCount || "N/A"],
                  ["Business Email", viewingCompany.email],
                  ["Phone Number", viewingCompany.phone || "N/A"],
                  ["Contact Person", viewingCompany.contactPersonName || viewingCompany.contact || "N/A"],
                  ["Designation / Role", viewingCompany.contactPersonRole || "N/A"],
                  ["Website", viewingCompany.website || "N/A"],
                  ["Submitted Date", viewingCompany.createdAt ? new Date(viewingCompany.createdAt).toLocaleString() : viewingCompany.submittedOn || "N/A"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="font-semibold text-gray-800">{val}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Office Address</p>
                <p className="bg-gray-50 p-3 rounded-xl text-gray-700 border border-gray-100">{viewingCompany.address || "N/A"}</p>
              </div>

              {viewingCompany.notes && (
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Applicant Notes</p>
                  <p className="bg-amber-50/60 p-3 rounded-xl text-amber-900 border border-amber-200/60 italic">{viewingCompany.notes}</p>
                </div>
              )}

              {viewingCompany.rejectionReason && (
                <div>
                  <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wider mb-1">Rejection Reason</p>
                  <p className="bg-red-50 p-3 rounded-xl text-red-800 border border-red-200">{viewingCompany.rejectionReason}</p>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-500 font-medium">Application Status:</span>
                <span className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] ${statusBadge(viewingCompany.status)}`}>
                  {viewingCompany.status}
                </span>
              </div>

              {error && !rejectingCompany && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-500 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {/* Action Buttons for Pending Applications */}
              {(viewingCompany.status || "").toUpperCase() === "PENDING" && (
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(viewingCompany.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {actionLoading ? "Creating HR account & sending email..." : "Approve & Provision HR Account"}
                  </button>
                  <button
                    onClick={() => setRejectingCompany(viewingCompany)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Reject Application
                  </button>
                </div>
              )}

              {(viewingCompany.status || "").toUpperCase() === "APPROVED" && (
                <button
                  onClick={() => handleResend(viewingCompany.id)}
                  disabled={actionLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "Resetting HR password & sending email..." : "Resend HR Credentials (new temporary password)"}
                </button>
              )}

              <button
                onClick={() => setViewingCompany(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-xs transition-colors mt-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-800">Reject Application</h3>
              <button onClick={() => setRejectingCompany(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-600">
              Please state the reason for rejecting <span className="font-semibold text-gray-800">{rejectingCompany.companyName || rejectingCompany.name}</span>. This reason will be emailed to the client.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State rejection reason (e.g., Unable to verify registration document / incomplete information)..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              ></textarea>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectingCompany(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default AdminCompanies;