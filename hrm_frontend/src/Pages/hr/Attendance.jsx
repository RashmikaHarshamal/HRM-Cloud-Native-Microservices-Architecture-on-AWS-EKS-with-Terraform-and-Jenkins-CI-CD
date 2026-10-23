import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Filter, Calendar, MapPin, Users, UserCheck, CalendarOff, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { hrApi, userHrApi } from "../../services/api";
import { formatMinutes, groupSessionsByEmployee, toLocalDateString, useNow } from "../../utils/attendance";

const mapLink = (location) => (location ? `https://www.google.com/maps?q=${location}` : null);

const calculateStats = (rows) => {
  let present = 0, absent = 0, halfDay = 0, late = 0;
  rows.forEach((r) => {
    if (r.status === "PRESENT") present++;
    else if (r.status === "ABSENT") absent++;
    else if (r.status === "HALF_DAY") halfDay++;
    else if (r.status === "LATE") late++;
  });
  return { total: rows.length, present, absent, halfDay, late, onTime: present - late };
};

const HRAttendance = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(() => toLocalDateString(new Date()));
  const [filterStatus, setFilterStatus] = useState("all");
  const [rawSessions, setRawSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [onLeaveToday, setOnLeaveToday] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 9;

  const now = useNow(filterDate === toLocalDateString(new Date()));
  const rows = useMemo(() => groupSessionsByEmployee(rawSessions, now), [rawSessions, now]);
  const stats = useMemo(() => calculateStats(rows), [rows]);

  // Absent isn't its own attendance status — it's everyone who isn't
  // accounted for by a present-type attendance record or an approved leave.
  // Clamped at 0 so it can never show a negative number while data is
  // still loading (e.g. totalEmployees hasn't arrived yet).
  const absentToday = Math.max(0, totalEmployees - (stats.present + onLeaveToday));

  const filtered = rows.filter((r) =>
    ((r.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.empId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.department || "").toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === "all" || r.status === filterStatus)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate, filterStatus]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      if (u.role !== "HR_MANAGER" && u.role !== "ADMIN") { navigate("/unauthorized"); return; }
      setUser(u);
    } else navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAttendance();
    fetchEmployeeCount();
    fetchOnLeaveCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterDate]);

  // "On Leave Today" card — count of employees whose approved leave covers
  // the selected date. Recomputed whenever the selected date changes, same
  // as the attendance records.
  const fetchOnLeaveCount = async () => {
    try {
      const res = await hrApi.getOnLeaveCount(filterDate);
      const count = typeof res?.data === "number" ? res.data : 0;
      setOnLeaveToday(count);
    } catch (err) {
      console.error("Failed to load on-leave count:", err);
      setOnLeaveToday(0);
    }
  };

  // Total Employee card — real headcount from the employee database,
  // same source used by the Employee and Department pages.
  const fetchEmployeeCount = async () => {
    try {
      const res = await userHrApi.getEmployees();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setTotalEmployees(list.length);
    } catch (err) {
      console.error("Failed to load employee count:", err);
      setTotalEmployees(0);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await hrApi.getDailyAttendance(filterDate);
      setRawSessions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError(err.message || "Failed to load attendance data");
      setRawSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return "-";
    const [hours, minutes] = time.split(":").slice(0, 2);
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const statusBadge = (s) => ({
    PRESENT: "bg-emerald-100 text-emerald-700",
    ABSENT: "bg-red-100 text-red-700",
    HALF_DAY: "bg-amber-100 text-amber-700",
    LATE: "bg-violet-100 text-violet-700",
  }[s] || "bg-gray-100 text-gray-600");

  const statusLabel = (s) => ({
    PRESENT: "Present",
    ABSENT: "Absent",
    HALF_DAY: "Half Day",
    LATE: "Late",
  }[s] || s || "-");

  const exportCsv = () => {
    const header = ["Emp ID", "Employee", "Department", "Date", "Check In", "Check Out", "Hours", "Status"];
    const lines = filtered.map((r) => [
      r.empId, r.name, r.department || "", r.date, formatTime(r.clockInTime), formatTime(r.clockOutTime),
      formatMinutes(r.totalWorkingMinutes), statusLabel(r.status),
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-${filterDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;
  return (
    <PageLayout role="hr" activePage="Attendance" title="Attendance Management" subtitle="Track and manage employee attendance"
      actions={
        <button onClick={exportCsv} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Download size={16} /> Export
        </button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Employee", value: totalEmployees, description: "Registered in employee database", gradient: "from-teal-400 to-emerald-500", icon: <Users size={20} /> },
            { label: "Today Present", value: stats.present, description: "From today's attendance records", gradient: "from-yellow-400 to-yellow-500", icon: <UserCheck size={20} /> },
            { label: "On Leave Today", value: onLeaveToday, description: "Employees on approved leave", gradient: "from-amber-400 to-orange-500", icon: <CalendarOff size={20} /> },
            { label: "Absent Today", value: absentToday, description: "Total − (present + on leave)", gradient: "from-red-400 to-rose-500", icon: <UserX size={20} /> },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.gradient} p-5 rounded-2xl text-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 min-h-[108px] flex flex-col justify-center`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white">{s.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{s.value}</p>
                  <p className="mt-1 text-xs text-white/80">{s.description}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center flex-shrink-0">
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, ID, department…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50" />
            </div>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50" />
            </div>
            <div className="relative">
              <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 appearance-none">
                <option value="all">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="LATE">Late</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs">
                  {["Emp ID", "Employee", "Department", "Date", "Check In", "Check Out", "Hours", "Location", "Status"].map(h => <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">No records found</td></tr>
                ) : paginated.map((r, i) => (
                  <tr key={r.employeeId ?? i} className={`hover:bg-teal-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                    <td className="px-5 py-3.5 font-mono font-semibold text-gray-700">{r.empId}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">
                      {r.name}
                      {r.sessionCount > 1 && (
                        <span className="ml-1.5 text-xs font-semibold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full align-middle">×{r.sessionCount}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{r.department || "-"}</td>
                    <td className="px-5 py-3.5 text-gray-500">{r.date}</td>
                    <td className="px-5 py-3.5 text-gray-600">{formatTime(r.clockInTime)}</td>
                    <td className="px-5 py-3.5 text-gray-600">{formatTime(r.clockOutTime)}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800">{formatMinutes(r.totalWorkingMinutes)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        {r.clockInLocation && (
                          <a href={mapLink(r.clockInLocation)} target="_blank" rel="noopener noreferrer" title="Clock-in location" className="text-sky-500 hover:text-sky-700">
                            <MapPin size={15} />
                          </a>
                        )}
                        {r.clockOutLocation && (
                          <a href={mapLink(r.clockOutLocation)} target="_blank" rel="noopener noreferrer" title="Clock-out location" className="text-orange-500 hover:text-orange-700">
                            <MapPin size={15} />
                          </a>
                        )}
                        {!r.clockInLocation && !r.clockOutLocation && <span className="text-gray-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span></td>
                  </tr>
                ))}
                {!loading && paginated.length > 0 && paginated.length < ROWS_PER_PAGE &&
                  Array.from({ length: ROWS_PER_PAGE - paginated.length }).map((_, idx) => (
                    <tr key={`filler-${idx}`} aria-hidden="true">
                      <td colSpan={9} className="px-5 py-3.5">&nbsp;</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="flex flex-col items-center gap-2 px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`h-8 min-w-[2rem] px-2 rounded-lg text-xs font-semibold transition-colors ${
                      p === currentPage
                        ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm"
                        : "text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Showing{" "}
                <strong className="text-gray-800">
                  {(currentPage - 1) * ROWS_PER_PAGE + 1}-
                  {Math.min(currentPage * ROWS_PER_PAGE, filtered.length)}
                </strong>{" "}
                of <strong className="text-gray-800">{filtered.length}</strong> records
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};
export default HRAttendance;