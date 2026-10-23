import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Plus, X, Save, User, Building2, Briefcase, Search, SlidersHorizontal } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { hrApi } from "../../services/api";
import { loadPayrollRows, num, norm } from "../../utils/payroll";

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) => (error?.message || fallback).replace(/^\d{3}:\s*/, "");

const money = (v) => `Rs.${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const periodLabel = (p) => ({ MONTHLY: "Monthly", WEEKLY: "Weekly", ANNUAL: "Annual" }[p] || p || "");

// Wraps the part of `text` that matches the typed letters so HR sees why an employee is listed
const highlight = (text, q) => {
  const t = String(text ?? "");
  const i = q ? t.toLowerCase().indexOf(q) : -1;
  if (i < 0) return t;
  return <>{t.slice(0, i)}<mark className="bg-yellow-100 text-inherit rounded px-0.5">{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>;
};

const newRow = () => ({ key: `${Date.now()}-${Math.random()}`, name: "", type: "ALLOWANCE", amount: "" });

const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50";
const cardCls = "bg-white rounded-2xl shadow-sm border border-gray-100 p-5";

/**
 * Full page to set an employee's individual allowances / deductions (hrm_db_hr.additional_payments).
 * Pick a department, then an employee (search by name or ID): the employee's job role salary
 * (basic, allowance, deduction from "Add Salaries for Job Roles") is shown, and the individual
 * allowances / deductions below are added on top of it.
 *
 * Navigation state (optional): { email } opens with that employee selected,
 *                              { email, prefillItem } also adds an approved allowance request as a row.
 */
const IndividualAllowance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || "";
  const prefillItem = location.state?.prefillItem || null;

  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [deptName, setDeptName] = useState("");
  const [roleName, setRoleName] = useState(""); // "" = all job roles of the department
  const [activeIdx, setActiveIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [empQuery, setEmpQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const [rows, setRows] = useState([newRow()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [liveSheet, setLiveSheet] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (!s) { navigate("/login"); return; }
    const u = JSON.parse(s);
    if (u.role !== "HR_MANAGER" && u.role !== "ADMIN") { navigate("/unauthorized"); return; }
    setUser(u);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        const { rows: list, departments: depts } = await loadPayrollRows();
        setEmployees(list);
        setDepartments(depts);
        // Opened for one employee (the $ button on the Payroll table or an approved request)
        const emp = initialEmail && list.find(e => norm(e.email) === norm(initialEmail));
        if (emp) {
          setEmail(emp.email);
          setDeptName(emp.department && emp.department !== "—" ? emp.department : "");
          setRoleName(emp.designation && emp.designation !== "—" ? emp.designation : "");
          setEmpQuery(`${emp.name} · ${emp.empId}`);
        }
      } catch (e) {
        setPageError(errorText(e, "Failed to load employees"));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const empLabel = (e) => `${e.name} · ${e.empId}`;

  const deptOptions = useMemo(() => {
    const seen = new Map(departments.filter(d => d.active !== false).map(d => [norm(d.name), { name: d.name, code: d.shortCode || "" }]));
    employees.forEach(e => {
      if (e.department && e.department !== "—" && !seen.has(norm(e.department))) seen.set(norm(e.department), { name: e.department, code: e.departmentCode || "" });
    });
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [departments, employees]);

  const deptEmployees = useMemo(() => employees.filter(e => norm(e.department) === norm(deptName)), [employees, deptName]);
  // Job roles of the selected department: the ones defined for it plus any an employee already holds
  const roleOptions = useMemo(() => {
    if (!deptName) return [];
    const map = new Map();
    const dept = departments.find(d => norm(d.name) === norm(deptName));
    (dept?.jobRoles || []).forEach(r => {
      const t = r.jobTitle || r.title;
      if (t && r.active !== false) map.set(norm(t), t);
    });
    deptEmployees.forEach(e => {
      if (e.designation && e.designation !== "—" && !map.has(norm(e.designation))) map.set(norm(e.designation), e.designation);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b))
      .map(title => ({ title, count: deptEmployees.filter(e => norm(e.designation) === norm(title)).length }));
  }, [departments, deptName, deptEmployees]);

  const roleEmployees = useMemo(
    () => (roleName ? deptEmployees.filter(e => norm(e.designation) === norm(roleName)) : deptEmployees),
    [deptEmployees, roleName]);

  const employee = employees.find(e => e.email === email);
  const query = employee && empQuery === empLabel(employee) ? "" : empQuery.trim().toLowerCase();
  const matches = roleEmployees.filter(e =>
    !query || (e.name || "").toLowerCase().includes(query) || String(e.empId || "").toLowerCase().includes(query));

  useEffect(() => { setActiveIdx(0); }, [query, deptName, roleName]);

  const changeDept = (value) => { setDeptName(value); setRoleName(""); setEmail(""); setEmpQuery(""); setListOpen(false); };
  const changeRole = (value) => { setRoleName(value); setEmail(""); setEmpQuery(""); setListOpen(false); };
  const pickEmployee = (e) => { setEmail(e.email); setEmpQuery(empLabel(e)); setListOpen(false); };

  const onEmployeeKeyDown = (ev) => {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setListOpen(true); setActiveIdx(i => Math.min(i + 1, Math.max(matches.length - 1, 0))); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (ev.key === "Enter") { ev.preventDefault(); if (listOpen && matches[activeIdx]) pickEmployee(matches[activeIdx]); }
    else if (ev.key === "Escape") setListOpen(false);
  };

  // The job role salary of the selected employee, fetched fresh so a salary HR just added shows straight away
  useEffect(() => {
    setLiveSheet(null);
    if (!employee) return undefined;
    let cancelled = false;
    setSheetLoading(true);
    hrApi.getPaySheets([{
      email: employee.email,
      employeeCode: employee.empId,
      fullName: employee.name,
      departmentName: employee.department && employee.department !== "—" ? employee.department : "",
      designation: employee.designation && employee.designation !== "—" ? employee.designation : "",
      employmentType: employee.employmentType || "",
    }])
      .then(res => { if (!cancelled) setLiveSheet((res.data || [])[0] || null); })
      .catch(() => { /* fall back to the pay sheet loaded with the page */ })
      .finally(() => { if (!cancelled) setSheetLoading(false); });
    return () => { cancelled = true; };
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  const sheet = liveSheet?.configured ? liveSheet : employee?.sheet;

  // Start from what the employee has saved right now (fetched fresh, so an allowance approved a
  // moment ago is included and is not wiped by saving an out-of-date list).
  useEffect(() => {
    let cancelled = false;
    const toRows = (list) => (list || [])
      .map(i => ({ key: `existing-${i.id}`, id: i.id, name: i.name, type: i.type, amount: String(i.amount ?? "") }));
    const apply = (items) => {
      if (cancelled) return;
      const list = [...items];
      if (prefillItem && norm(email) === norm(initialEmail) && !list.some(i => i.name === prefillItem.name && i.amount === String(prefillItem.amount ?? ""))) {
        list.push({ ...newRow(), name: prefillItem.name, type: prefillItem.type || "ALLOWANCE", amount: String(prefillItem.amount ?? "") });
      }
      setRows(list.length ? list : [newRow()]);
      setFormError("");
    };
    if (!email) { apply([]); return () => { cancelled = true; }; }
    apply(toRows(employee?.sheet?.additionalItems));
    hrApi.getAdditionalPayments(email)
      .then(res => { if (!cancelled) apply(toRows(res.data)); })
      .catch(() => { /* keep the rows from the pay sheet */ });
    return () => { cancelled = true; };
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (key, field, value) => setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)));
  const removeRow = (key) => setRows(prev => {
    const next = prev.filter(r => r.key !== key);
    return next.length ? next : [newRow()];
  });

  // A single untouched blank row means "no individual allowances / deductions"
  const filledRows = rows.filter(r => r.name.trim() !== "" || r.amount !== "");

  const roleTotal = sheet ? num(sheet.basicSalary) + num(sheet.roleAllowance) - num(sheet.roleDeduction) : 0;
  const extraAllowance = filledRows.filter(r => r.type === "ALLOWANCE").reduce((s, r) => s + num(r.amount), 0);
  const extraDeduction = filledRows.filter(r => r.type === "DEDUCTION").reduce((s, r) => s + num(r.amount), 0);
  const netTotal = roleTotal + extraAllowance - extraDeduction;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!employee) { setFormError("Select a department, job role and employee"); return; }
    try {
      setSaving(true);
      setFormError("");
      const res = await hrApi.saveAdditionalPayments({
        employeeEmail: employee.email,
        employeeCode: employee.empId,
        employeeName: employee.name,
        items: filledRows.map(r => ({ id: r.id || null, name: r.name, type: r.type, amount: r.amount === "" ? null : Number(r.amount) })),
      });
      navigate("/hr/payslip", { state: { message: `✓ ${res.message || "Saved"} for ${employee.name}` } });
    } catch (e2) {
      setFormError(errorText(e2, "Failed to save allowances / deductions"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const showLoadingSalary = employee && sheetLoading && !sheet?.configured;

  return (
    <PageLayout
      role="hr"
      activePage="Payroll"
      title="Individual Allowance & Deduction"
      subtitle="Add allowances and deductions for one employee on top of their job role salary"
      actions={
        <button onClick={() => navigate("/hr/payslip")}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <ArrowLeft size={16} /> Back to Payroll
        </button>
      }
    >
      <form onSubmit={handleSave} className="space-y-6">
        {pageError && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{pageError}</div>}

        {/* Step 1 & 2: department, then employee */}
        <div className={cardCls}>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <SlidersHorizontal size={18} className="text-teal-600" /> Select employee
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center">1</span>
                <Building2 size={16} className="text-teal-600" /> Department
              </label>
              <select value={deptName} onChange={e => changeDept(e.target.value)} disabled={loading}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50">
                <option value="">{loading ? "Loading departments..." : "Select a department"}</option>
                {deptOptions.map(d => <option key={d.name} value={d.name}>{d.name}{d.code ? ` (${d.code})` : ""}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center">2</span>
                <Briefcase size={16} className="text-teal-600" /> Job Role
              </label>
              <select value={roleName} onChange={e => changeRole(e.target.value)} disabled={!deptName}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 disabled:opacity-70">
                <option value="">{deptName ? `All job roles (${deptEmployees.length})` : "Select a department first"}</option>
                {roleOptions.map(r => <option key={r.title} value={r.title}>{r.title} ({r.count})</option>)}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center">3</span>
                <User size={16} className="text-teal-600" /> Employee
              </label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={empQuery} disabled={!deptName} autoComplete="off"
                  onChange={e => { setEmpQuery(e.target.value); if (email) setEmail(""); setListOpen(true); }}
                  onFocus={() => setListOpen(true)}
                  onBlur={() => setTimeout(() => setListOpen(false), 120)}
                  onKeyDown={onEmployeeKeyDown}
                  placeholder={deptName ? "Type name or ID number…" : "Select a department first"}
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 disabled:opacity-70" />
              </div>
              {listOpen && deptName && (
                <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                  {matches.map((e, idx) => (
                    <li key={e.email}>
                      <button type="button" onMouseDown={ev => ev.preventDefault()} onClick={() => pickEmployee(e)} onMouseEnter={() => setActiveIdx(idx)}
                        className={`w-full text-left px-4 py-2 text-sm ${idx === activeIdx ? "bg-teal-50" : ""} ${e.email === email ? "font-semibold" : ""}`}>
                        <span className="font-medium text-gray-800">{highlight(e.name, query)}</span>
                        <span className="text-gray-500 font-mono text-xs"> · {highlight(e.empId, query)}</span>
                        {!roleName && e.designation && e.designation !== "—" && <span className="block text-xs text-gray-400">{e.designation}</span>}
                      </button>
                    </li>
                  ))}
                  {matches.length === 0 && (
                    <li className="px-4 py-3 text-sm text-gray-400">
                      No employees found{query ? ` for “${empQuery.trim()}”` : ""} in {roleName ? `${roleName}, ` : ""}{deptName}
                    </li>
                  )}
                </ul>
              )}
              {deptName && <p className="text-[11px] text-gray-400 mt-1">{roleEmployees.length} employee(s) · type letters of the name or the ID number to find one</p>}
            </div>
          </div>
        </div>

        {prefillItem && employee && norm(employee.email) === norm(initialEmail) && (
          <div className="text-sm rounded-xl px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700">
            Approved allowance request <b>{prefillItem.name}</b> ({money(prefillItem.amount)}) is added as the last row. Click <b>Save</b> to apply it to this employee's pay.
          </div>
        )}

        {/* Job role salary of the selected employee */}
        {employee && (
          showLoadingSalary ? (
            <div className="text-sm rounded-xl px-4 py-3 bg-gray-50 border border-gray-100 text-gray-500">Loading this employee's job role salary…</div>
          ) : sheet?.configured ? (
            <div className={cardCls}>
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">
                Job role salary · {employee.designation}{sheet.employmentType ? ` · ${sheet.employmentType}` : ""}{sheet.period ? ` · ${periodLabel(sheet.period)}` : ""}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100"><p className="text-xs text-gray-400">Basic salary</p><p className="font-bold text-gray-800">{money(sheet.basicSalary)}</p></div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100"><p className="text-xs text-gray-400">Job role allowance</p><p className="font-bold text-emerald-600">+{money(sheet.roleAllowance)}</p></div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100"><p className="text-xs text-gray-400">Job role deduction</p><p className="font-bold text-red-600">-{money(sheet.roleDeduction)}</p></div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100"><p className="text-xs text-gray-400">Job role total</p><p className="font-bold text-teal-700">{money(roleTotal)}</p></div>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">These come from Add Salaries for Job Roles. Add this employee's own allowances / deductions below.</p>
            </div>
          ) : (
            <div className="text-sm rounded-xl px-4 py-3 bg-amber-50 border border-amber-100 text-amber-700">
              {(sheet?.configuredEmploymentTypes || []).length > 0 ? (
                <><b>{employee.designation}</b> has a salary only for {sheet.configuredEmploymentTypes.join(", ")}, not for <b>{employee.employmentType || "this employee's employment type"}</b>. Add one under <button type="button" onClick={() => navigate("/hr/payroll/salaries")} className="font-semibold underline">Add Salaries for Job Roles</button>. Until then only the amounts below are counted.</>
              ) : (
                <>No job role salary is set for {employee.designation || "this employee's job role"}{employee.employmentType ? ` (${employee.employmentType})` : ""} yet, so only the amounts below are counted. Add it under <button type="button" onClick={() => navigate("/hr/payroll/salaries")} className="font-semibold underline">Add Salaries for Job Roles</button>.</>
              )}
            </div>
          )
        )}

        {/* Individual allowances / deductions */}
        <div className={cardCls}>
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Individual allowances / deductions {employee ? `for ${employee.name}` : ""}
          </h2>
          {!employee ? (
            <p className="text-sm text-gray-400">Select a department, job role and employee above to add allowances and deductions.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left px-2 py-2 font-semibold">Name *</th>
                      <th className="text-left px-2 py-2 font-semibold">Allowance / Deduction *</th>
                      <th className="text-left px-2 py-2 font-semibold">Amount *</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const required = rows.length > 1 || row.name.trim() !== "" || row.amount !== "";
                      return (
                        <tr key={row.key}>
                          <td className="px-2 py-2 min-w-[220px]">
                            <input required={required} value={row.name} maxLength={100}
                              onChange={e => updateRow(row.key, "name", e.target.value)} placeholder="e.g. Fuel allowance" className={fieldCls} />
                          </td>
                          <td className="px-2 py-2 min-w-[170px]">
                            <select value={row.type} onChange={e => updateRow(row.key, "type", e.target.value)}
                              className={`${fieldCls} ${row.type === "ALLOWANCE" ? "text-emerald-700" : "text-red-600"}`}>
                              <option value="ALLOWANCE">Allowance</option>
                              <option value="DEDUCTION">Deduction</option>
                            </select>
                          </td>
                          <td className="px-2 py-2 min-w-[140px]">
                            <input required={required} type="number" min="0.01" step="0.01" value={row.amount}
                              onChange={e => updateRow(row.key, "amount", e.target.value)} placeholder="0.00" className={fieldCls} />
                          </td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removeRow(row.key)} title="Remove row"
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><X size={15} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={() => setRows(prev => [...prev, newRow()])}
                className="mt-3 w-full border-2 border-dashed border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-600 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <Plus size={16} strokeWidth={2.5} /> Add another allowance / deduction
              </button>

              <div className="bg-gray-50 rounded-2xl p-4 text-sm space-y-1.5 mt-4 md:max-w-md md:ml-auto">
                <div className="flex justify-between"><span className="text-gray-500">Job role salary</span><span className="font-semibold text-gray-800">{money(roleTotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Individual allowances</span><span className="font-semibold text-emerald-600">+{money(extraAllowance)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Individual deductions</span><span className="font-semibold text-red-600">-{money(extraDeduction)}</span></div>
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200">
                  <span className="font-bold text-gray-800">Net Total</span>
                  <span className={`text-xl font-bold ${netTotal < 0 ? "text-red-600" : "text-teal-700"}`}>{money(netTotal)}</span>
                </div>
              </div>
            </>
          )}

          {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-4">{formError}</div>}

          <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-100">
            <button type="button" onClick={() => navigate("/hr/payslip")} disabled={saving}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
            <button type="submit" disabled={saving || !employee}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-all">
              <Save size={16} /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
};

export default IndividualAllowance;
