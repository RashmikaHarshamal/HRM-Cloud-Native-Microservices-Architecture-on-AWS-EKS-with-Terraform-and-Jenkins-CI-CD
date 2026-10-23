/**
 * HR Report — data helpers.
 *
 * Everything in here is a pure function of the data the HR pages already load
 * (employees, departments, attendance rows, leave applications, pay sheets,
 * allowance requests), so the report needs no extra backend endpoints.
 *
 * Notes on how numbers are derived:
 *  - The backend only stores PRESENT on clock-in. LATE / HALF_DAY / ABSENT are
 *    derived here from clock-in / clock-out times and approved leave, using the
 *    "attendance rules" (shift start, grace, half-day hours) chosen on the page.
 *  - Working days are Mon–Fri, completed days only (today is excluded because
 *    the day is still in progress).
 */

// ─── Dates ────────────────────────────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseYmd = (s) => {
    if (!s) return null;
    if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const isWeekday = (d) => d.getDay() !== 0 && d.getDay() !== 6;
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
const minDate = (a, b) => (a < b ? a : b);
const maxDate = (a, b) => (a > b ? a : b);

export const eachDay = (start, end) => {
    const out = [];
    for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) out.push(new Date(d));
    return out;
};

/** Number of Mon–Fri days in [a,b] ∩ [from,to] */
export const weekdaysOverlap = (a, b, from, to) => {
    const s = maxDate(a, from), e = minDate(b, to);
    if (e < s) return 0;
    let n = 0;
    for (let d = s; d <= e; d = addDays(d, 1)) if (isWeekday(d)) n++;
    return n;
};

export const PERIODS = [
    { key: "last7", label: "Last 7 days" },
    { key: "last30", label: "Last 30 days" },
    { key: "month", label: "This month" },
    { key: "quarter", label: "This quarter" },
    { key: "year", label: "This year" },
    { key: "custom", label: "Custom range" },
];

/** Resolves a period key into { start, end, prevStart, prevEnd, days, label }. */
export const resolveRange = (key, custom, now = new Date()) => {
    const today = startOfDay(now);
    let start = addDays(today, -29), end = today;
    if (key === "last7") start = addDays(today, -6);
    else if (key === "month") start = new Date(today.getFullYear(), today.getMonth(), 1);
    else if (key === "quarter") start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    else if (key === "year") start = new Date(today.getFullYear(), 0, 1);
    else if (key === "custom") {
        const f = parseYmd(custom?.from), t = parseYmd(custom?.to);
        if (f && t && f <= t) { start = f; end = minDate(t, today); if (end < start) end = start; }
    }
    const days = daysBetween(start, end) + 1;
    const prevEnd = addDays(start, -1);
    const prevStart = addDays(prevEnd, -(days - 1));
    return { start, end, prevStart, prevEnd, days, key };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (d) => `${MONTHS[d.getMonth()]}${d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(2)}` : ""}`;
export const fmtDate = (d) => {
    const x = d instanceof Date ? d : parseYmd(d);
    return x ? `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}` : "—";
};
export const fmtDayMonth = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const rangeText = (r) => `${fmtDate(r.start)} – ${fmtDate(r.end)}`;

// ─── Formatting ───────────────────────────────────────────────────────────────
export const fmtNum = (n) => Number(n || 0).toLocaleString();
export const fmtMoney = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString()}`;
export const fmtMoneyShort = (v) => {
    const n = Number(v) || 0, a = Math.abs(n);
    if (a >= 1e9) return `Rs. ${(n / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `Rs. ${(n / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
    if (a >= 1e3) return `Rs. ${(n / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
    return `Rs. ${Math.round(n)}`;
};
export const fmtPct = (v, d = 1) => (v == null || !isFinite(v) ? "—" : `${v.toFixed(d)}%`);
export const fmtHours = (min) => (min == null || !isFinite(min) ? "—" : `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, "0")}m`);
export const titleCase = (s) => String(s || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const tally = (items, keyFn) => {
    const m = new Map();
    items.forEach((it) => { const k = keyFn(it); m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};
const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

// ─── Normalisers ──────────────────────────────────────────────────────────────
export const normEmployees = (list = []) =>
    list.map((e) => ({
        id: e.id,
        code: e.employeeId || "",
        name: e.fullName || e.email || "Unknown",
        email: (e.email || "").toLowerCase(),
        role: (e.role || "").toUpperCase(),
        dept: e.departmentName || "Unassigned",
        designation: e.designation || "Not set",
        type: e.employmentType || "Not set",
        gender: (e.gender || "").toUpperCase(),
        status: (e.status || "ACTIVE").toUpperCase(),
        join: parseYmd(e.joiningDate),
        term: parseYmd(e.terminationDate),
        dob: parseYmd(e.dob),
        raw: e,
    }));

export const normLeaves = (list = []) =>
    list.map((l) => ({
        id: l.id,
        empId: l.employeeId,
        code: l.employeeIdNumber || "",
        name: l.employeeName || "Unknown",
        dept: l.departmentName || "Unassigned",
        type: l.leaveTypeName || "Other",
        start: parseYmd(l.startDate),
        end: parseYmd(l.endDate),
        days: Number(l.numberOfDays) || 0,
        status: (l.status || "").toUpperCase(),
        reason: l.reason || "",
        created: l.createdAt ? new Date(l.createdAt) : null,
        approvedAt: l.approvedAt ? new Date(l.approvedAt) : null,
    })).filter((l) => l.start && l.end);

// ─── Workforce ────────────────────────────────────────────────────────────────
export const AGE_BANDS = ["Under 25", "25–34", "35–44", "45–54", "55+", "Unknown"];
export const TENURE_BANDS = ["< 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years", "Unknown"];

const yearsBetween = (a, b) => (b - a) / (365.25 * 86400000);

export function computeWorkforce(emps, range, today) {
    const active = emps.filter((e) => e.status === "ACTIVE");
    const employedOn = (d) => emps.filter((e) => (!e.join || e.join <= d) && (!e.term || e.term > d)).length;
    const inRange = (d, s, e) => d && d >= s && d <= e;

    const hires = emps.filter((e) => inRange(e.join, range.start, range.end));
    const exits = emps.filter((e) => inRange(e.term, range.start, range.end));
    const prevHires = emps.filter((e) => inRange(e.join, range.prevStart, range.prevEnd));
    const prevExits = emps.filter((e) => inRange(e.term, range.prevStart, range.prevEnd));
    const startHC = employedOn(addDays(range.start, -1));
    const endHC = employedOn(range.end);
    const avgHC = (startHC + endHC) / 2;
    const attritionRate = avgHC > 0 ? (exits.length / avgHC) * 100 : null;

    // last 12 months hires vs exits
    const months = [];
    for (let i = 11; i >= 0; i--) months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
    const sameMonth = (d, m) => d && d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
    const monthly = {
        labels: months.map(monthLabel),
        hires: months.map((m) => emps.filter((e) => sameMonth(e.join, m)).length),
        exits: months.map((m) => emps.filter((e) => sameMonth(e.term, m)).length),
    };

    const ageBand = (e) => {
        if (!e.dob) return "Unknown";
        const a = yearsBetween(e.dob, today);
        return a < 25 ? "Under 25" : a < 35 ? "25–34" : a < 45 ? "35–44" : a < 55 ? "45–54" : "55+";
    };
    const tenureBand = (e) => {
        if (!e.join) return "Unknown";
        const y = yearsBetween(e.join, today);
        return y < 1 ? "< 1 year" : y < 3 ? "1–3 years" : y < 5 ? "3–5 years" : y < 10 ? "5–10 years" : "10+ years";
    };
    const bandCounts = (bands, fn) => bands.map((b) => active.filter((e) => fn(e) === b).length);

    const tenures = active.filter((e) => e.join).map((e) => yearsBetween(e.join, today));
    const avgTenure = tenures.length ? sum(tenures) / tenures.length : null;

    const genderLabel = (g) => (g === "MALE" ? "Male" : g === "FEMALE" ? "Female" : g === "OTHER" ? "Other" : "Not set");

    const month = today.getMonth();
    const birthdays = active
        .filter((e) => e.dob && e.dob.getMonth() === month)
        .map((e) => ({ name: e.name, dept: e.dept, day: e.dob.getDate(), age: today.getFullYear() - e.dob.getFullYear() }))
        .sort((a, b) => a.day - b.day);
    const anniversaries = active
        .filter((e) => e.join && e.join.getMonth() === month && e.join.getFullYear() < today.getFullYear())
        .map((e) => ({ name: e.name, dept: e.dept, day: e.join.getDate(), years: today.getFullYear() - e.join.getFullYear() }))
        .sort((a, b) => a.day - b.day);

    const byDeptMap = new Map();
    active.forEach((e) => {
        const r = byDeptMap.get(e.dept) || { name: e.dept, count: 0, tenure: [] };
        r.count++; if (e.join) r.tenure.push(yearsBetween(e.join, today));
        byDeptMap.set(e.dept, r);
    });

    return {
        active,
        total: emps.length,
        activeCount: active.length,
        inactiveCount: emps.filter((e) => e.status === "INACTIVE").length,
        terminatedCount: emps.filter((e) => e.status === "TERMINATED").length,
        hires, exits, prevHires, prevExits, startHC, endHC, attritionRate,
        monthly,
        byDept: tally(active, (e) => e.dept),
        byType: tally(active, (e) => e.type),
        byGender: tally(active, (e) => genderLabel(e.gender)),
        byRole: tally(active, (e) => titleCase(e.role || "Employee")),
        byStatus: tally(emps, (e) => titleCase(e.status)),
        byDesignation: tally(active, (e) => e.designation).slice(0, 8),
        ageBands: { labels: AGE_BANDS, values: bandCounts(AGE_BANDS, ageBand) },
        tenureBands: { labels: TENURE_BANDS, values: bandCounts(TENURE_BANDS, tenureBand) },
        avgTenure,
        deptTenure: Object.fromEntries([...byDeptMap.values()].map((r) => [r.name, r.tenure.length ? sum(r.tenure) / r.tenure.length : null])),
        noDept: active.filter((e) => e.dept === "Unassigned").length,
        birthdays, anniversaries,
        recentJoiners: [...emps].filter((e) => e.join && e.status === "ACTIVE").sort((a, b) => b.join - a.join).slice(0, 6),
    };
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export const DEFAULT_RULES = { shiftStart: "09:00", graceMin: 15, halfDayHours: 4 };

const toMin = (t) => {
    if (!t) return null;
    const [h = 0, m = 0, s = 0] = String(t).split(":").map(Number);
    return h * 60 + m + s / 60;
};

export const ARRIVAL_BINS = (() => {
    const bins = [{ label: "Before 7:00", from: -Infinity, to: 420 }];
    for (let m = 420; m < 720; m += 30) {
        const h = Math.floor(m / 60), mm = m % 60;
        bins.push({ label: `${h}:${pad2(mm)}`, from: m, to: m + 30 });
    }
    bins.push({ label: "After 12:00", from: 720, to: Infinity });
    return bins;
})();

const EMPTY_ATT = {
    rate: null, expectedDays: 0, attendedDays: 0, lateDays: 0, halfDays: 0, absentDays: 0, leaveDays: 0, openDays: 0,
    avgMinutes: null, perEmp: [], perDate: [], dates: [], byDept: {}, arrival: ARRIVAL_BINS.map(() => 0),
    methods: { GPS: 0, MANUAL: 0 }, categories: { onTime: 0, late: 0, half: 0, absent: 0 },
};

/**
 * @param rows   raw attendance rows (AttendanceDTO[]) covering the range
 * @param emps   normalised employees in scope (already department-filtered)
 * @param leaves normalised leave applications
 */
export function computeAttendance({ rows, emps, leaves, range, today, rules }) {
    const startMin = (toMin(rules.shiftStart) ?? 540) + (Number(rules.graceMin) || 0);
    const halfMin = (Number(rules.halfDayHours) || 0) * 60;

    const lastDay = minDate(range.end, addDays(startOfDay(today), -1)); // completed days only
    const dates = eachDay(range.start, lastDay).filter(isWeekday);
    if (!dates.length) return { ...EMPTY_ATT, arrival: ARRIVAL_BINS.map(() => 0) };
    const dateStrs = dates.map(ymd);

    const empByCode = new Map(emps.filter((e) => e.code).map((e) => [e.code, e]));
    const empById = new Map(emps.map((e) => [e.id, e]));
    const resolve = (code, id) => empByCode.get(code) || empById.get(id);

    // approved leave → set of weekday strings per employee
    const leaveMap = new Map();
    leaves.filter((l) => l.status === "APPROVED").forEach((l) => {
        const e = resolve(l.code, l.empId);
        if (!e) return;
        const set = leaveMap.get(e.id) || new Set();
        eachDay(maxDate(l.start, range.start), minDate(l.end, lastDay)).forEach((d) => isWeekday(d) && set.add(ymd(d)));
        leaveMap.set(e.id, set);
    });

    // employee → date → sessions
    const idx = new Map();
    rows.forEach((r) => {
        const e = resolve(r.employeeIdNumber, r.employeeId);
        if (!e || !r.date) return;
        const days = idx.get(e.id) || new Map();
        const arr = days.get(r.date) || [];
        arr.push(r);
        days.set(r.date, arr);
        idx.set(e.id, days);
    });

    const perDateMap = new Map(dateStrs.map((d) => [d, { expected: 0, attended: 0, onTime: 0, late: 0, half: 0, absent: 0, leave: 0 }]));
    const arrival = ARRIVAL_BINS.map(() => 0);
    const methods = { GPS: 0, MANUAL: 0 };
    const categories = { onTime: 0, late: 0, half: 0, absent: 0 };
    const perEmp = [];

    emps.filter((e) => e.status === "ACTIVE").forEach((e) => {
        const rec = { e, expected: 0, attended: 0, present: 0, late: 0, half: 0, absent: 0, leave: 0, open: 0, minutes: 0, closedDays: 0 };
        const lset = leaveMap.get(e.id);
        const days = idx.get(e.id);
        dates.forEach((d, i) => {
            if ((e.join && d < e.join) || (e.term && d > e.term)) return;
            const ds = dateStrs[i], P = perDateMap.get(ds);
            const sess = days?.get(ds);
            const onLeave = lset?.has(ds);
            if (onLeave && !sess) { rec.leave++; P.leave++; return; }
            rec.expected++; P.expected++;
            const sorted = sess ? [...sess].sort((a, b) => String(a.clockInTime || "").localeCompare(String(b.clockInTime || ""))) : [];
            const first = sorted[0];
            if (!first || String(first.status).toUpperCase() === "ABSENT") { rec.absent++; P.absent++; categories.absent++; return; }

            const inMin = toMin(first.clockInTime);
            const closed = sorted.every((s) => s.clockOutTime);
            let minutes = 0;
            sorted.forEach((s) => { const a = toMin(s.clockInTime), b = toMin(s.clockOutTime); if (a != null && b != null && b > a) minutes += b - a; });
            const status = String(first.status).toUpperCase();
            const late = status === "LATE" || (inMin != null && inMin > startMin);
            const half = status === "HALF_DAY" || (closed && minutes > 0 && minutes < halfMin);
            const value = half ? 0.5 : 1;

            rec.present++; rec.attended += value; P.attended += value;
            if (late) rec.late++;
            if (half) rec.half++;
            if (!closed) rec.open++;
            if (closed && minutes > 0) { rec.minutes += minutes; rec.closedDays++; }
            if (half) { P.half++; categories.half++; } else if (late) { P.late++; categories.late++; } else { P.onTime++; categories.onTime++; }
            if (inMin != null) arrival[ARRIVAL_BINS.findIndex((b) => inMin >= b.from && inMin < b.to)]++;
            const t = String(first.attendanceType || "MANUAL").toUpperCase();
            methods[t === "GPS" ? "GPS" : "MANUAL"]++;
        });
        rec.rate = rec.expected ? Math.min(100, (rec.attended / rec.expected) * 100) : null;
        rec.avgMinutes = rec.closedDays ? rec.minutes / rec.closedDays : null;
        perEmp.push(rec);
    });

    const expectedDays = sum(perEmp, (r) => r.expected);
    const attendedDays = sum(perEmp, (r) => r.attended);
    const closedDays = sum(perEmp, (r) => r.closedDays);

    const deptMap = new Map();
    perEmp.forEach((r) => {
        const d = deptMap.get(r.e.dept) || { expected: 0, attended: 0, late: 0, minutes: 0, closedDays: 0, absent: 0 };
        d.expected += r.expected; d.attended += r.attended; d.late += r.late; d.minutes += r.minutes; d.closedDays += r.closedDays; d.absent += r.absent;
        deptMap.set(r.e.dept, d);
    });
    const byDept = Object.fromEntries([...deptMap.entries()].map(([k, d]) => [k, {
        rate: d.expected ? Math.min(100, (d.attended / d.expected) * 100) : null,
        late: d.late, absent: d.absent, avgMinutes: d.closedDays ? d.minutes / d.closedDays : null,
    }]));

    return {
        rate: expectedDays ? Math.min(100, (attendedDays / expectedDays) * 100) : null,
        expectedDays, attendedDays,
        lateDays: sum(perEmp, (r) => r.late), halfDays: sum(perEmp, (r) => r.half),
        absentDays: sum(perEmp, (r) => r.absent), leaveDays: sum(perEmp, (r) => r.leave),
        openDays: sum(perEmp, (r) => r.open),
        avgMinutes: closedDays ? sum(perEmp, (r) => r.minutes) / closedDays : null,
        perEmp, dates, dateStrs, perDate: dateStrs.map((d) => ({ date: d, ...perDateMap.get(d) })),
        byDept, arrival, methods, categories,
    };
}

/** Group per-date rows into daily / weekly / monthly buckets depending on range length. */
export function bucketize(perDate) {
    const n = perDate.length;
    const mode = n <= 31 ? "day" : n <= 130 ? "week" : "month";
    const keyOf = (ds) => {
        const d = parseYmd(ds);
        if (mode === "day") return ds;
        if (mode === "week") { const s = addDays(d, -((d.getDay() + 6) % 7)); return ymd(s); }
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    };
    const labelOf = (key) => {
        if (mode === "month") { const [y, m] = key.split("-").map(Number); return monthLabel(new Date(y, m - 1, 1)); }
        return fmtDayMonth(parseYmd(key));
    };
    const map = new Map();
    perDate.forEach((p) => {
        const k = keyOf(p.date);
        const b = map.get(k) || { key: k, label: labelOf(k), expected: 0, attended: 0, onTime: 0, late: 0, half: 0, absent: 0, leave: 0 };
        ["expected", "attended", "onTime", "late", "half", "absent", "leave"].forEach((f) => { b[f] += p[f]; });
        map.set(k, b);
    });
    return { mode, buckets: [...map.values()].map((b) => ({ ...b, rate: b.expected ? Math.min(100, (b.attended / b.expected) * 100) : null })) };
}

/** Live snapshot for today from the fetched rows + approved leave. */
export function computeToday({ rows, emps, leaves, today }) {
    const ts = ymd(today);
    const active = emps.filter((e) => e.status === "ACTIVE");
    const ids = new Set(active.map((e) => e.id)), codes = new Map(active.map((e) => [e.code, e.id]));
    const inSet = new Set(), openSet = new Set();
    rows.filter((r) => r.date === ts).forEach((r) => {
        const id = codes.get(r.employeeIdNumber) ?? (ids.has(r.employeeId) ? r.employeeId : null);
        if (id == null) return;
        inSet.add(id);
        if (!r.clockOutTime) openSet.add(id);
    });
    const leaveSet = new Set();
    leaves.filter((l) => l.status === "APPROVED" && l.start <= today && l.end >= today).forEach((l) => {
        const id = codes.get(l.code) ?? (ids.has(l.empId) ? l.empId : null);
        if (id != null && !inSet.has(id)) leaveSet.add(id);
    });
    const total = active.length;
    return { total, clockedIn: inSet.size, working: openSet.size, onLeave: leaveSet.size, notYet: Math.max(0, total - inSet.size - leaveSet.size) };
}

// ─── Leave ────────────────────────────────────────────────────────────────────
export function computeLeave({ leaves, range, today }) {
    const t0 = startOfDay(today);
    const approved = leaves.filter((l) => l.status === "APPROVED");
    const takenIn = (from, to, list = approved) => sum(list, (l) => weekdaysOverlap(l.start, l.end, from, minDate(to, t0)));
    const takenDays = takenIn(range.start, range.end);
    const prevTakenDays = takenIn(range.prevStart, range.prevEnd);

    const createdIn = (l, a, b) => l.created && startOfDay(l.created) >= a && startOfDay(l.created) <= b;
    const submitted = leaves.filter((l) => createdIn(l, range.start, range.end));
    const prevSubmitted = leaves.filter((l) => createdIn(l, range.prevStart, range.prevEnd));
    const statusCounts = ["APPROVED", "PENDING", "REJECTED", "CANCELLED"].map((s) => ({ label: titleCase(s), key: s, value: submitted.filter((l) => l.status === s).length }));

    const daysBy = (keyFn) => {
        const m = new Map();
        approved.forEach((l) => {
            const d = weekdaysOverlap(l.start, l.end, range.start, minDate(range.end, t0));
            if (d > 0) m.set(keyFn(l), (m.get(keyFn(l)) || 0) + d);
        });
        return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    };

    const months = [];
    for (let i = 11; i >= 0; i--) months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
    const monthEnd = (m) => new Date(m.getFullYear(), m.getMonth() + 1, 0);
    const monthly = {
        labels: months.map(monthLabel),
        days: months.map((m) => sum(approved, (l) => weekdaysOverlap(l.start, l.end, m, monthEnd(m)))),
        requests: months.map((m) => leaves.filter((l) => l.created && l.created.getFullYear() === m.getFullYear() && l.created.getMonth() === m.getMonth()).length),
    };

    const dow = [0, 0, 0, 0, 0];
    submitted.filter((l) => l.status !== "CANCELLED" && l.status !== "REJECTED").forEach((l) => { const g = l.start.getDay(); if (g >= 1 && g <= 5) dow[g - 1]++; });

    const pending = leaves.filter((l) => l.status === "PENDING")
        .map((l) => ({ ...l, ageDays: l.created ? Math.max(0, daysBetween(l.created, t0)) : 0 }))
        .sort((a, b) => b.ageDays - a.ageDays);

    const turnaround = approved.filter((l) => l.approvedAt && l.created && createdIn(l, range.start, range.end));
    const avgTurnaroundHrs = turnaround.length ? sum(turnaround, (l) => (l.approvedAt - l.created) / 3600000) / turnaround.length : null;

    const takers = new Map();
    approved.forEach((l) => {
        const d = weekdaysOverlap(l.start, l.end, range.start, minDate(range.end, t0));
        if (d <= 0) return;
        const r = takers.get(l.name) || { name: l.name, dept: l.dept, days: 0, requests: 0 };
        r.days += d; r.requests++;
        takers.set(l.name, r);
    });

    const horizon = addDays(t0, 14);
    return {
        takenDays, prevTakenDays, submitted, prevSubmitted, statusCounts,
        byType: daysBy((l) => l.type), byDept: daysBy((l) => l.dept),
        monthly, dow, pending,
        onLeaveToday: approved.filter((l) => l.start <= t0 && l.end >= t0),
        upcoming: approved.filter((l) => l.start > t0 && l.start <= horizon).sort((a, b) => a.start - b.start),
        avgTurnaroundHrs,
        topTakers: [...takers.values()].sort((a, b) => b.days - a.days),
        inPeriod: leaves.filter((l) => l.start <= range.end && l.end >= range.start || createdIn(l, range.start, range.end)),
    };
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
const monthlyFactor = (p) => (p === "WEEKLY" ? 52 / 12 : p === "ANNUAL" ? 1 / 12 : 1);

const niceStep = (raw) => {
    if (!isFinite(raw) || raw <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / pow;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
};

export function computePayroll(sheets, allowanceReqs) {
    const rows = sheets.map((s) => {
        const f = monthlyFactor(String(s.period || "MONTHLY").toUpperCase());
        return {
            email: s.employeeEmail, code: s.employeeCode, name: s.employeeName || s.employeeEmail,
            dept: s.departmentName || "Unassigned", designation: s.designation || "Not set", type: s.employmentType || "Not set",
            configured: !!s.configured, period: s.period,
            basic: (Number(s.basicSalary) || 0) * f,
            allowance: (Number(s.totalAllowance) || 0) * f,
            deduction: (Number(s.totalDeduction) || 0) * f,
            net: (Number(s.netTotal) || 0) * f,
        };
    });
    const cfg = rows.filter((r) => r.configured);
    const groupSum = (keyFn) => {
        const m = new Map();
        cfg.forEach((r) => { const k = keyFn(r); const g = m.get(k) || { label: k, value: 0, count: 0 }; g.value += r.net; g.count++; m.set(k, g); });
        return [...m.values()].sort((a, b) => b.value - a.value);
    };

    let histogram = { labels: [], values: [] };
    if (cfg.length) {
        const nets = cfg.map((r) => r.net), lo = Math.min(...nets), hi = Math.max(...nets);
        const step = niceStep((hi - lo) / 6 || hi || 1);
        const start = Math.floor(lo / step) * step;
        const n = Math.min(10, Math.max(1, Math.ceil((hi - start) / step + (hi === start + Math.ceil((hi - start) / step) * step ? 1 : 0))));
        const short = (v) => (v >= 1e6 ? `${+(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}K` : `${Math.round(v)}`);
        for (let i = 0; i < n; i++) {
            const a = start + i * step, b = a + step;
            histogram.labels.push(`${short(a)}–${short(b)}`);
            histogram.values.push(nets.filter((v) => v >= a && (i === n - 1 ? v <= b : v < b)).length);
        }
    }

    const reqs = allowanceReqs.map((r) => ({ ...r, amount: Number(r.amount) || 0, status: String(r.status || "").toUpperCase(), created: r.createdAt ? new Date(r.createdAt) : null }));
    const pendingReqs = reqs.filter((r) => r.status === "PENDING").sort((a, b) => (a.created || 0) - (b.created || 0));

    const desig = new Map();
    cfg.forEach((r) => { const g = desig.get(r.designation) || { label: r.designation, total: 0, count: 0 }; g.total += r.net; g.count++; desig.set(r.designation, g); });

    return {
        rows, configuredCount: cfg.length, unconfigured: rows.filter((r) => !r.configured),
        basic: sum(cfg, (r) => r.basic), allowance: sum(cfg, (r) => r.allowance), deduction: sum(cfg, (r) => r.deduction), net: sum(cfg, (r) => r.net),
        avgNet: cfg.length ? sum(cfg, (r) => r.net) / cfg.length : 0,
        byDept: groupSum((r) => r.dept), byType: groupSum((r) => r.type),
        byDesignation: [...desig.values()].map((g) => ({ label: g.label, value: g.total / g.count, count: g.count })).sort((a, b) => b.value - a.value).slice(0, 8),
        histogram,
        allowanceStatus: ["PENDING", "APPROVED", "REJECTED"].map((s) => ({ label: titleCase(s), key: s, value: reqs.filter((r) => r.status === s).length, amount: sum(reqs.filter((r) => r.status === s), (r) => r.amount) })),
        pendingReqs, pendingAmount: sum(pendingReqs, (r) => r.amount),
    };
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
export const downloadCsv = (filename, headers, rows) => {
    const esc = (v) => {
        if (v == null) return "";
        let s = String(v);
        if (typeof v === "string" && /^[=+@]/.test(s)) s = `'${s}`; // spreadsheet formula guard
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};