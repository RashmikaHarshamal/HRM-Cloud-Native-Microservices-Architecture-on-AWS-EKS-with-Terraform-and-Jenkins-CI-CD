import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Filter, CheckCircle, XCircle, Clock, TrendingUp, Users } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const AdminAttendance = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) { const u = JSON.parse(s); if (u.role !== "ADMIN") { navigate("/unauthorized"); return; } setUser(u); }
    else navigate("/login");
  }, [navigate]);

  const departmentData = [
    { id:1, department:"IT",         totalEmployees:25, present:22, absent:2, halfDay:1, lateCount:5,  avgWorkHours:"8.5" },
    { id:2, department:"HR",         totalEmployees:10, present:9,  absent:1, halfDay:0, lateCount:2,  avgWorkHours:"9.0" },
    { id:3, department:"Finance",    totalEmployees:15, present:13, absent:1, halfDay:1, lateCount:3,  avgWorkHours:"8.7" },
    { id:4, department:"Marketing",  totalEmployees:12, present:11, absent:1, halfDay:0, lateCount:4,  avgWorkHours:"8.3" },
    { id:5, department:"Operations", totalEmployees:18, present:16, absent:2, halfDay:0, lateCount:6,  avgWorkHours:"8.8" },
  ];
  const stats = {
    total:    departmentData.reduce((s,d) => s + d.totalEmployees, 0),
    present:  departmentData.reduce((s,d) => s + d.present, 0),
    absent:   departmentData.reduce((s,d) => s + d.absent, 0),
    late:     departmentData.reduce((s,d) => s + d.lateCount, 0),
    avg:      ((departmentData.reduce((s,d) => s + d.present,0) / departmentData.reduce((s,d) => s + d.totalEmployees,0))*100).toFixed(1),
  };
  const filtered = departmentData.filter(d =>
    d.department.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterDepartment === "all" || d.department === filterDepartment)
  );

  if (!user) return null;
  return (
    <PageLayout role="admin" activePage="Attendance" title="System-Wide Attendance" subtitle="Monitor attendance across all departments"
      actions={
        <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Download size={16} /> Export
        </button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { label:"Total",         value:stats.total,   gradient:"from-indigo-400 to-violet-500", icon:"👥" },
            { label:"Present",       value:stats.present, gradient:"from-emerald-400 to-teal-500",  icon:"✅" },
            { label:"Absent",        value:stats.absent,  gradient:"from-red-400 to-rose-500",      icon:"❌" },
            { label:"Late Arrivals", value:stats.late,    gradient:"from-amber-400 to-orange-500",  icon:"⏰" },
            { label:"Avg Rate",      value:`${stats.avg}%`,gradient:"from-sky-400 to-blue-500",    icon:"📊" },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.gradient} p-5 rounded-2xl text-white hover:-translate-y-1 transition-all duration-300`}>
              <div className="flex items-center justify-between mb-1"><p className="text-white/80 text-xs">{s.label}</p><span className="text-xl">{s.icon}</span></div>
              <p className="text-3xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search departments…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
            </div>
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 appearance-none">
                <option value="all">All Departments</option>
                {departmentData.map(d => <option key={d.id} value={d.department}>{d.department}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs">
                  {["Department","Total","Present","Absent","Half Day","Late","Avg Hours","Rate"].map(h => <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d, i) => {
                  const pct = ((d.present / d.totalEmployees) * 100).toFixed(1);
                  const barColor = pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <tr key={d.id} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                      <td className="px-5 py-3.5 font-bold text-gray-800">{d.department}</td>
                      <td className="px-5 py-3.5">{d.totalEmployees}</td>
                      <td className="px-5 py-3.5"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">{d.present}</span></td>
                      <td className="px-5 py-3.5"><span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">{d.absent}</span></td>
                      <td className="px-5 py-3.5"><span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">{d.halfDay}</span></td>
                      <td className="px-5 py-3.5 text-orange-600 font-semibold">{d.lateCount}</td>
                      <td className="px-5 py-3.5 font-semibold">{d.avgWorkHours}h</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 w-20 overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width:`${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
export default AdminAttendance;
