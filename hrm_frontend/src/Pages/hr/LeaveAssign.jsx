import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Save, Building2, Briefcase, History, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { hrApi } from "../../services/api";

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) => (error?.message || fallback).replace(/^\d{3}:\s*/, "");

const PERIODS = [
  { value: "ANNUAL", label: "Annual" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY", label: "Weekly" },
];
const periodLabel = (p) => PERIODS.find(x => x.value === p)?.label || p;

const newRow = () => ({ key: `${Date.now()}-${Math.random()}`, employmentTypeId: "", leaveTypeId: "", period: "ANNUAL", days: "" });

// Pre-fills a row from an existing allocation so the edit form opens with its current values
const rowFromAllocation = (a) => ({
  key: `${Date.now()}-${Math.random()}`,
  employmentTypeId: a.employmentTypeId != null ? String(a.employmentTypeId) : "",
  leaveTypeId: a.leaveTypeId != null ? String(a.leaveTypeId) : "",
  period: a.period || "ANNUAL",
  days: a.days != null ? String(a.days) : "",
});

const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50";

const LeaveAssign = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");

  // popup state
  const [activeRole, setActiveRole] = useState(null);
  const [rows, setRows] = useState([newRow()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  // set when the popup was opened via the Edit action on a specific allocation row,
  // so Save can update that exact row instead of adding a new one
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (!s) { navigate("/login"); return; }
    const u = JSON.parse(s);
    if (u.role !== "HR_MANAGER" && u.role !== "ADMIN") { navigate("/unauthorized"); return; }
    setUser(u);
    loadReferenceData();
  }, [navigate]);

  useEffect(() => {
    if (user) loadHistory(departmentId);
  }, [user, departmentId]);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [deptRes, typeRes, empTypeRes] = await Promise.all([
        hrApi.getDepartments(),
        hrApi.getLeaveTypes(),
        hrApi.getEmploymentTypes(),
      ]);
      setDepartments((deptRes.data || []).filter(d => d.active !== false));
      setLeaveTypes(typeRes.data || []);
      setEmploymentTypes(empTypeRes.data || []);
    } catch (e) {
      setPageError(errorText(e, "Failed to load departments and leave types"));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (deptId) => {
    try {
      const res = await hrApi.getLeaveAllocations(deptId || null);
      setHistory(res.data || []);
    } catch (e) {
      setPageError(errorText(e, "Failed to load assigned leaves"));
    }
  };

  const department = useMemo(
    () => departments.find(d => String(d.id) === String(departmentId)),
    [departments, departmentId]
  );
  const jobRoles = department?.jobRoles || [];

  const openRole = (role) => {
    setActiveRole(role);
    setRows([newRow()]);
    setEditingAllocation(null);
    setFormError("");
  };

  // Opens the same assign popup but pre-filled with one existing allocation's data
  const openEditAllocation = (a) => {
    if (String(a.departmentId) !== String(departmentId)) setDepartmentId(String(a.departmentId));
    setActiveRole({ id: a.jobRoleId, jobTitle: a.jobRoleTitle });
    setRows([rowFromAllocation(a)]);
    setEditingAllocation(a);
    setFormError("");
  };

  const closeModal = () => { if (!saving) { setActiveRole(null); setEditingAllocation(null); } };

  const updateRow = (key, field, value) => setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)));
  const removeRow = (key) => setRows(prev => (prev.length > 1 ? prev.filter(r => r.key !== key) : prev));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFormError("");

      // If editing a row and the employment type / leave type changed, the update-in-place
      // upsert on the backend would leave the original row behind, so remove it first.
      if (editingAllocation) {
        const row = rows[0];
        const changedCombo =
          String(row.employmentTypeId) !== String(editingAllocation.employmentTypeId) ||
          String(row.leaveTypeId) !== String(editingAllocation.leaveTypeId);
        if (changedCombo) {
          await hrApi.deleteLeaveAllocation(editingAllocation.id);
        }
      }

      const res = await hrApi.saveLeaveAllocations(activeRole.id, rows.map(r => ({
        employmentTypeId: r.employmentTypeId ? Number(r.employmentTypeId) : null,
        leaveTypeId: r.leaveTypeId ? Number(r.leaveTypeId) : null,
        period: r.period,
        days: r.days === "" ? null : Number(r.days),
      })));
      setActiveRole(null);
      setEditingAllocation(null);
      setMessage(`✓ ${editingAllocation ? "Leave updated for" : (res.message || "Leaves assigned") + " to"} ${activeRole.jobTitle}`);
      setTimeout(() => setMessage(""), 3000);
      loadHistory(departmentId);
    } catch (e2) {
      setFormError(errorText(e2, "Failed to assign leaves"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllocation = async (a) => {
    if (!window.confirm(`Remove ${a.leaveTypeName} (${a.employmentTypeName}) from ${a.jobRoleTitle}?`)) return;
    try {
      setDeletingId(a.id);
      setPageError("");
      const res = await hrApi.deleteLeaveAllocation(a.id);
      setMessage(`✓ ${res.message || "Leave entitlement removed"}`);
      setTimeout(() => setMessage(""), 3000);
      loadHistory(departmentId);
    } catch (e) {
      setPageError(errorText(e, "Failed to remove leave entitlement"));
    } finally {
      setDeletingId(null);
    }
  };

  // What this role already has, shown in the popup so HR doesn't re-enter it by mistake
  const roleAssigned = activeRole ? history.filter(a => a.jobRoleId === activeRole.id) : [];

  if (!user) return null;

  return (
    <PageLayout
      role="hr"
      activePage="Leave Management"
      title="Assign Leaves for Job Roles"
      subtitle="Set how much of each leave type a job role gets"
      actions={
        <button onClick={() => navigate("/hr/leave")}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <ArrowLeft size={16} /> Back to Leave Management
        </button>
      }
    >
      <div className="space-y-6">
        {message && <div className="p-4 rounded-lg text-white bg-green-500">{message}</div>}
        {pageError && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{pageError}</div>}

        {/* Department picker */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Building2 size={16} className="text-teal-600" /> Department
          </label>
          <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} disabled={loading}
            className="w-full md:w-96 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50">
            <option value="">{loading ? "Loading departments..." : "Select a department"}</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {!loading && leaveTypes.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-4">
              No leave types yet.{" "}
              <button onClick={() => navigate("/hr/leave/types")} className="font-semibold underline">Add leave types</button>{" "}
              before assigning leaves.
            </p>
          )}
          {!loading && employmentTypes.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-4">
              No employment types yet.{" "}
              <button onClick={() => navigate("/hr/leave/employment-types")} className="font-semibold underline">Add employment types</button>{" "}
              before assigning leaves.
            </p>
          )}
        </div>

        {/* Job roles of the selected department */}
        {department && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Briefcase size={18} className="text-teal-600" /> Job roles in {department.name}
            </h2>
            {jobRoles.length === 0 ? (
              <p className="text-sm text-gray-400">This department has no job roles yet. Add them on the Departments page.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {jobRoles.map(role => {
                  const count = history.filter(a => a.jobRoleId === role.id).length;
                  return (
                    <button key={role.id} onClick={() => openRole(role)}
                      className="flex items-center justify-between text-left border border-gray-100 hover:border-teal-300 hover:bg-teal-50/50 rounded-xl px-4 py-3.5 transition-all group">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{role.jobTitle}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{count ? `${count} leave(s) assigned` : "No leaves assigned"}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-500" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <History size={18} className="text-teal-600" /> Assigned Leave History
              <span className="text-xs font-normal text-gray-400">{department ? `· ${department.name}` : "· all departments"}</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs">
                  {["Department", "Job Role", "Employment Type", "Leave Type", "Period", "No. of Leaves", "Assigned By", "Last Updated", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((a, i) => (
                  <tr key={a.id} className={`hover:bg-teal-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                    <td className="px-5 py-3 text-gray-600">{a.departmentName}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{a.jobRoleTitle}</td>
                    <td className="px-5 py-3 text-gray-600">{a.employmentTypeName}</td>
                    <td className="px-5 py-3 text-gray-600">{a.leaveTypeName}</td>
                    <td className="px-5 py-3 text-gray-600">{periodLabel(a.period)}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">{a.days}</td>
                    <td className="px-5 py-3 text-gray-500">{a.createdByName || "—"}</td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{a.updatedAt ? a.updatedAt.replace("T", " ").slice(0, 16) : "—"}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEditAllocation(a)} title="Edit"
                          className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => handleDeleteAllocation(a)} disabled={deletingId === a.id} title="Delete"
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">No leaves assigned yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assign popup */}
      {activeRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold">{editingAllocation ? "Edit Leave" : "Assign Leaves"} · {activeRole.jobTitle}</h3>
                <p className="text-white/80 text-xs">{department?.name}</p>
              </div>
              <button type="button" onClick={closeModal} className="p-1.5 hover:bg-white/20 rounded-xl"><X size={18} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {roleAssigned.length > 0 && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="font-semibold text-gray-600">Already assigned: </span>
                  {roleAssigned.map(a => `${a.leaveTypeName} (${a.employmentTypeName}) ${a.days}/${periodLabel(a.period).toLowerCase()}`).join(" · ")}
                  <span className="block mt-1 text-gray-400">Assigning the same employment type and leave type again updates it.</span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left px-2 py-2 font-semibold">Job Role</th>
                      <th className="text-left px-2 py-2 font-semibold">Employment Type *</th>
                      <th className="text-left px-2 py-2 font-semibold">Leave Type *</th>
                      <th className="text-left px-2 py-2 font-semibold">Period *</th>
                      <th className="text-left px-2 py-2 font-semibold">No. of Leaves *</th>
                      {!editingAllocation && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key}>
                        <td className="px-2 py-2 font-medium text-gray-800 whitespace-nowrap">{activeRole.jobTitle}</td>
                        <td className="px-2 py-2 min-w-[210px]">
                          <select required value={row.employmentTypeId} onChange={e => updateRow(row.key, "employmentTypeId", e.target.value)} className={fieldCls}>
                            <option value="">Select</option>
                            {employmentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2 min-w-[170px]">
                          <select required value={row.leaveTypeId} onChange={e => updateRow(row.key, "leaveTypeId", e.target.value)} className={fieldCls}>
                            <option value="">Select</option>
                            {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <select required value={row.period} onChange={e => updateRow(row.key, "period", e.target.value)} className={fieldCls}>
                            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2 min-w-[110px]">
                          <input required type="number" min="0.5" max="366" step="0.5" value={row.days}
                            onChange={e => updateRow(row.key, "days", e.target.value)} placeholder="e.g. 14" className={fieldCls} />
                        </td>
                        {!editingAllocation && (
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removeRow(row.key)} disabled={rows.length === 1} title="Remove row"
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400">
                              <X size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!editingAllocation && (
                <button type="button" onClick={() => setRows(prev => [...prev, newRow()])}
                  className="w-full border-2 border-dashed border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-600 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                  <Plus size={16} strokeWidth={2.5} /> Add another row
                </button>
              )}

              {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{formError}</div>}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button type="button" onClick={closeModal}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
              <button type="submit" disabled={saving || leaveTypes.length === 0 || employmentTypes.length === 0}
                className="inline-flex items-center gap-2 bg-gradient-to-br from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-all">
                <Save size={16} /> {saving ? "Saving..." : editingAllocation ? "Update Leave" : "Assign Leaves"}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
};

export default LeaveAssign;
