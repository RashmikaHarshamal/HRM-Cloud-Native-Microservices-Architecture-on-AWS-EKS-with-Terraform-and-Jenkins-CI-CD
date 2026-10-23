import { hrApi, userHrApi } from "../services/api";

export const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));

export const norm = (v) => (v == null ? "" : String(v).trim().replace(/\s+/g, " ").toLowerCase());
// "6 Month Internship", "6 Months  Internship" and "6-month internship" all compare equal
export const typeKey = (v) => norm(v).replace(/months/g, "month").replace(/[^a-z0-9]/g, "");

/**
 * The pay sheet of an employee. Uses the server pay sheet when it found the job role salary;
 * otherwise works it out from the basic_payments rows (job role title, own department preferred,
 * employment type) and the employee's additional_payments rows.
 */
export const resolveSheet = (emp, serverSheet, basicPayments, additionalPayments) => {
  if (serverSheet?.configured) return serverSheet;
  const email = norm(emp.email);
  const items = serverSheet?.additionalItems?.length
    ? serverSheet.additionalItems
    : additionalPayments.filter(a => norm(a.employeeEmail) === email);
  const title = norm(emp.designation);
  const dept = norm(emp.departmentName);
  const type = typeKey(emp.employmentType);
  let forRole = title ? basicPayments.filter(p => norm(p.jobRoleTitle) === title) : [];
  const sameDept = dept ? forRole.filter(p => norm(p.departmentName) === dept) : [];
  if (sameDept.length) forRole = sameDept;
  const match = type
    ? forRole.find(p => typeKey(p.employmentTypeName) === type)
    : (forRole.length === 1 ? forRole[0] : null);

  const extraAllowance = items.filter(i => i.type === "ALLOWANCE").reduce((s, i) => s + num(i.amount), 0);
  const extraDeduction = items.filter(i => i.type === "DEDUCTION").reduce((s, i) => s + num(i.amount), 0);
  const roleAllowance = match ? num(match.allowance) : 0;
  const roleDeduction = match ? num(match.deduction) : 0;
  const basic = match ? num(match.basicSalary) : 0;
  return {
    ...(serverSheet || {}),
    employeeEmail: emp.email,
    designation: emp.designation,
    employmentType: emp.employmentType,
    configured: !!match,
    basicPaymentId: match?.id,
    period: match?.period,
    basicSalary: basic,
    roleAllowance,
    roleDeduction,
    additionalItems: items,
    additionalAllowance: extraAllowance,
    additionalDeduction: extraDeduction,
    totalAllowance: roleAllowance + extraAllowance,
    totalDeduction: roleDeduction + extraDeduction,
    netTotal: basic + roleAllowance + extraAllowance - roleDeduction - extraDeduction,
    configuredEmploymentTypes: match ? [] : [...new Set(forRole.map(p => p.employmentTypeName))],
  };
};


/**
 * Loads everything the payroll pages need: employees (user database), their pay sheets and the raw
 * job role salary / individual allowance rows (hrm_db_hr), and the departments.
 * Returns { rows, departments } where each row is
 *   { id, email, empId, name, department, departmentCode, designation, employmentType, sheet }.
 */
export const loadPayrollRows = async () => {
  const empRes = await userHrApi.getEmployees();
  const emps = (empRes.data || []).filter(e => e.email);
  const [sheetRes, basicRes, additionalRes, deptRes] = await Promise.all([
    hrApi.getPaySheets(emps.map(e => ({
      email: e.email,
      employeeCode: e.employeeId,
      fullName: e.fullName,
      departmentName: e.departmentName,
      designation: e.designation,
      employmentType: e.employmentType,
    }))),
    hrApi.getBasicPayments().catch(() => ({ data: [] })),
    hrApi.getAdditionalPayments().catch(() => ({ data: [] })),
    hrApi.getDepartments().catch(() => ({ data: [] })),
  ]);
  const sheets = sheetRes.data || [];
  const basicPayments = basicRes.data || [];
  const additionalPayments = additionalRes.data || [];
  const departments = deptRes.data || [];

  const byEmail = new Map(sheets.map(sh => [(sh.employeeEmail || "").toLowerCase(), sh]));
  const codeByName = new Map(departments.map(d => [norm(d.name), d.shortCode || ""]));
  const rows = emps.map(emp => ({
    id: emp.id,
    email: emp.email,
    empId: emp.employeeId || `EMP${emp.id}`,
    name: emp.fullName,
    department: emp.departmentName || "—",
    departmentCode: codeByName.get(norm(emp.departmentName)) || "",
    designation: emp.designation || "—",
    employmentType: emp.employmentType || "",
    sheet: resolveSheet(emp, byEmail.get(emp.email.trim().toLowerCase()), basicPayments, additionalPayments),
  }));
  return { rows, departments };
};
