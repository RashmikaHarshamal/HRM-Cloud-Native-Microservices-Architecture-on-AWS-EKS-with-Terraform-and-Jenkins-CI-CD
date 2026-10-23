// Builds the monthly / yearly HR report workbook from the data the Reports page already loaded.
import {
  computeAttendance, computeLeave, computeWorkforce, resolveRange, titleCase, ymd,
} from "./reportData";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const count = (v) => (Array.isArray(v) ? v.length : Number(v) || 0);
const pct = (v) => (v == null || !isFinite(v) ? "" : Math.round(v * 10) / 10);

/** { from, to } (yyyy-mm-dd) for a monthly ("2026-09") or yearly ("2026") report. */
export const periodBounds = (kind, value) => {
  if (kind === "monthly") {
    const [y, m] = String(value).split("-").map(Number);
    if (!y || !m) return null;
    return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)), label: `${MONTH_NAMES[m - 1]} ${y}`, file: `${y}-${String(m).padStart(2, "0")}` };
  }
  const y = Number(value);
  if (!y) return null;
  return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Year ${y}`, file: `${y}` };
};

/**
 * @param kind      "monthly" | "yearly"
 * @param value     "2026-09" | "2026"
 * @param attRows   raw attendance rows covering the period
 * @param emps      normalised employees in scope
 * @param leaves    normalised leaves in scope
 * @param pay       computePayroll() result (monthly figures)
 * @param departments raw departments (for manager names)
 */
export function buildPeriodReport({ kind, value, attRows, emps, leaves, pay, departments, rules, today, deptLabel }) {
  const b = periodBounds(kind, value);
  if (!b) throw new Error("Choose a month or year first.");
  if (new Date(`${b.from}T00:00:00`) > today) throw new Error(`${b.label} has not started yet — there is no data to report.`);

  const range = resolveRange("custom", { from: b.from, to: b.to }, today);
  const wf = computeWorkforce(emps, range, today);
  const att = computeAttendance({ rows: attRows, emps, leaves, range, today, rules });
  const lv = computeLeave({ leaves, range, today });

  // Months covered so far (payroll is monthly, so a period's cost = monthly net × months elapsed)
  const monthsInPeriod = kind === "monthly" ? 1 : range.end.getMonth() + 1;
  const stamp = `${new Date().toLocaleString()}`;
  const scope = `${b.label} · ${deptLabel} · generated ${stamp}`;
  const sheets = [];

  // 1 ── Summary
  sheets.push({
    name: "Summary",
    title: `HR ${kind === "monthly" ? "Monthly" : "Yearly"} Report — ${b.label}`,
    subtitle: `${scope}${range.end < new Date(`${b.to}T00:00:00`) ? ` · data up to ${ymd(range.end)}` : ""}`,
    headers: ["Metric", "Value"],
    rows: [
      ["Reporting period", `${ymd(range.start)} to ${ymd(range.end)}`],
      ["Department scope", deptLabel],
      ["Active employees", wf.activeCount],
      ["Inactive employees", wf.inactiveCount],
      ["Terminated employees", wf.terminatedCount],
      ["Attendance rate (%)", pct(att.rate)],
      ["Days attended", att.attendedDays],
      ["Expected working days (all employees)", att.expectedDays],
      ["Late arrivals", att.lateDays],
      ["Half days", att.halfDays],
      ["Absences", att.absentDays],
      ["Days on approved leave", att.leaveDays],
      ["Missed clock-outs", att.openDays],
      ["Leave days taken", lv.takenDays],
      ["Leave requests submitted", count(lv.submitted)],
      ["Employees with a salary set up", pay.configuredCount],
      ["Employees without a salary set up", pay.unconfigured.length],
      ["Net payroll per month", r2(pay.net)],
      [`Estimated net payroll for period (${monthsInPeriod} month${monthsInPeriod === 1 ? "" : "s"})`, r2(pay.net * monthsInPeriod)],
    ],
  });

  // 2 ── Month-by-month (yearly report only)
  if (kind === "yearly") {
    const rows = [];
    for (let m = 0; m < 12; m++) {
      const from = new Date(range.start.getFullYear(), m, 1);
      if (from > today) break;
      const mr = resolveRange("custom", { from: ymd(from), to: ymd(new Date(from.getFullYear(), m + 1, 0)) }, today);
      const a = computeAttendance({ rows: attRows, emps, leaves, range: mr, today, rules });
      const l = computeLeave({ leaves, range: mr, today });
      rows.push([MONTH_NAMES[m], pct(a.rate), a.attendedDays, a.lateDays, a.halfDays, a.absentDays, l.takenDays, count(l.submitted), r2(pay.net)]);
    }
    sheets.push({
      name: "Monthly Breakdown",
      title: `Month by month — ${b.label}`,
      subtitle: "Payroll column uses the current pay sheets for every month.",
      headers: ["Month", "Attendance %", "Days attended", "Late", "Half days", "Absences", "Leave days taken", "Leave requests", "Net payroll (current pay sheets)"],
      rows,
    });
  }

  // 3 ── Department scorecard
  const pick = (arr, name) => arr.find((x) => x.label === name);
  const deptNames = new Set(wf.byDept.map((d) => d.label));
  departments.filter((d) => d.active !== false && d.name && (deptLabel === "All departments" || d.name === deptLabel)).forEach((d) => deptNames.add(d.name));
  sheets.push({
    name: "Departments",
    title: `Department scorecard — ${b.label}`,
    headers: ["Department", "Manager", "Employees", "Attendance %", "Late days", "Leave days", "Net payroll / month", "Avg net pay"],
    rows: [...deptNames].map((name) => {
      const p = pick(pay.byDept, name);
      return [
        name, departments.find((d) => d.name === name)?.managerName || "",
        pick(wf.byDept, name)?.value || 0, pct(att.byDept[name]?.rate), att.byDept[name]?.late || 0,
        pick(lv.byDept, name)?.value || 0, r2(p?.value), p ? r2(p.value / p.count) : "",
      ];
    }),
  });

  // 4 ── Attendance per employee
  sheets.push({
    name: "Attendance",
    title: `Attendance by employee — ${b.label}`,
    headers: ["Employee ID", "Name", "Department", "Working days", "Present", "Late", "Half days", "Absent", "On leave", "Missed clock-out", "Avg hours/day", "Attendance %"],
    rows: att.perEmp.map((r) => [r.e.code, r.e.name, r.e.dept, r.expected, r.present, r.late, r.half, r.absent, r.leave, r.open, r.avgMinutes != null ? r2(r.avgMinutes / 60) : "", pct(r.rate)]),
  });

  // 5 ── Leave
  sheets.push({
    name: "Leave",
    title: `Leave requests — ${b.label}`,
    headers: ["Employee ID", "Name", "Department", "Leave type", "From", "To", "Days", "Status", "Submitted"],
    rows: lv.inPeriod.map((l) => [l.code, l.name, l.dept, l.type, ymd(l.start), ymd(l.end), l.days, titleCase(l.status), l.created ? ymd(l.created) : ""]),
  });

  // 6 ── Payroll
  const payRows = pay.rows.map((r) => [
    r.code, r.name, r.dept, r.designation, r.type, r2(r.basic), r2(r.allowance), r2(r.deduction), r2(r.net),
    r2(r.net * monthsInPeriod), r.configured ? "Yes" : "No",
  ]);
  const col = (i) => payRows.reduce((t, r) => t + (Number(r[i]) || 0), 0);
  sheets.push({
    name: "Payroll",
    title: `Payroll — ${b.label}`,
    subtitle: `Monthly figures come from the current pay sheets (job role salary + individual allowances / deductions). Period total = monthly net × ${monthsInPeriod}.`,
    headers: ["Employee ID", "Name", "Department", "Designation", "Employment type", "Basic / month", "Allowances / month", "Deductions / month", "Net / month", `Net for period (${monthsInPeriod} mo)`, "Salary set up"],
    rows: payRows,
    totals: ["Total", "", "", "", "", col(5), col(6), col(7), col(8), col(9), ""],
  });

  // 7 ── Workforce
  sheets.push({
    name: "Workforce",
    title: `Workforce — ${b.label}`,
    headers: ["Employee ID", "Name", "Email", "Department", "Designation", "Employment type", "Role", "Status", "Joined", "Terminated"],
    rows: emps.map((e) => [e.code, e.name, e.email, e.dept, e.designation, e.type, titleCase(e.role), titleCase(e.status), e.join ? ymd(e.join) : "", e.term ? ymd(e.term) : ""]),
  });

  // Cover page for the PDF: headline numbers + a few plain-English key points
  const money = (n) => `Rs. ${Math.round(n).toLocaleString("en-US")}`;
  const kpis = [
    { label: "Active employees", value: wf.activeCount, note: `${wf.inactiveCount} inactive, ${wf.terminatedCount} terminated` },
    { label: "Attendance rate", value: att.rate == null ? "-" : `${pct(att.rate)}%`, note: `${att.attendedDays} days attended` },
    { label: "Leave days taken", value: lv.takenDays, note: `${count(lv.submitted)} requests submitted` },
    { label: `Net payroll (${monthsInPeriod} mo)`, value: money(pay.net * monthsInPeriod), note: `${money(pay.net)} per month` },
  ];
  const highlights = [
    `${b.label} covers ${ymd(range.start)} to ${ymd(range.end)} for ${deptLabel.toLowerCase() === "all departments" ? "all departments" : `the ${deptLabel} department`}.`,
    `${wf.activeCount} employees are active. ${att.rate == null ? "There is not enough attendance data to calculate a rate." : `Attendance was ${pct(att.rate)}% (${att.attendedDays} of ${att.expectedDays} expected working days).`}`,
    `There were ${att.lateDays} late arrivals, ${att.halfDays} half days, ${att.absentDays} absences and ${att.openDays} missed clock-outs.`,
    `${lv.takenDays} leave days were taken across ${count(lv.submitted)} leave requests.`,
    pay.unconfigured.length
      ? `Payroll: ${pay.configuredCount} employees have a salary set up and ${pay.unconfigured.length} do not - their pay is not included in the totals.`
      : `Payroll: all ${pay.configuredCount} employees have a salary set up. Estimated net payroll for the period is ${money(pay.net * monthsInPeriod)}.`,
  ];

  return {
    sheets,
    kpis,
    highlights,
    title: `HR ${kind === "monthly" ? "Monthly" : "Yearly"} Report - ${b.label}`,
    subtitle: `${b.label} | ${deptLabel}${range.end < new Date(`${b.to}T00:00:00`) ? ` | data up to ${ymd(range.end)}` : ""}`,
    filename: `hr-${kind}-report-${b.file}.pdf`,
    range,
  };
}
