import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Eye, TrendingUp, Users, X, DollarSign } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const AdminPayslip = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingPayslip, setViewingPayslip] = useState(null);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) { const u = JSON.parse(s); if (u.role !== "ADMIN") { navigate("/unauthorized"); return; } setUser(u); }
    else navigate("/login");
  }, [navigate]);

  const deptPayroll = [
    { id:1, department:"IT",         employees:25, totalSalary:1375000, avgSalary:55000, processed:25, pending:0 },
    { id:2, department:"HR",         employees:10, totalSalary:490000,  avgSalary:49000, processed:9,  pending:1 },
    { id:3, department:"Finance",    employees:15, totalSalary:787500,  avgSalary:52500, processed:14, pending:1 },
    { id:4, department:"Marketing",  employees:12, totalSalary:732000,  avgSalary:61000, processed:12, pending:0 },
    { id:5, department:"Operations", employees:18, totalSalary:846000,  avgSalary:47000, processed:18, pending:0 },
  ];
  const stats = {
    employees: deptPayroll.reduce((s,d) => s+d.employees, 0),
    payroll:   deptPayroll.reduce((s,d) => s+d.totalSalary, 0),
    processed: deptPayroll.reduce((s,d) => s+d.processed, 0),
    pending:   deptPayroll.reduce((s,d) => s+d.pending, 0),
  };
  const filtered = deptPayroll.filter(d => d.department.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!user) return null;
  return (
    <PageLayout role="admin" activePage="Payroll" title="System-Wide Payroll" subtitle="Monitor payroll across all departments">
      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label:"Employees",  value:stats.employees,  gradient:"from-indigo-400 to-violet-500" },
            { label:"Total Pay",  value:`Rs.${(stats.payroll/1000000).toFixed(2)}M`, gradient:"from-emerald-400 to-teal-500" },
            { label:"Processed",  value:stats.processed,  gradient:"from-violet-400 to-purple-600" },
            { label:"Pending",    value:stats.pending,    gradient:"from-amber-400 to-orange-500" },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.gradient} p-6 rounded-2xl text-white hover:-translate-y-1 transition-all duration-300`}>
              <p className="text-white/80 text-sm mb-1">{s.label}</p>
              <p className="text-3xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search departments…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
            </div>
            <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Download size={15} /> Export Report
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs">
                  {["Department","Employees","Total Salary","Avg Salary","Processed","Pending","Progress","Actions"].map(h => <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d, i) => {
                  const pct = ((d.processed/d.employees)*100).toFixed(0);
                  return (
                    <tr key={d.id} className={`hover:bg-indigo-50/40 transition-colors ${i%2===1?"bg-gray-50/40":""}`}>
                      <td className="px-5 py-3.5 font-bold text-gray-800">{d.department}</td>
                      <td className="px-5 py-3.5">{d.employees}</td>
                      <td className="px-5 py-3.5 text-emerald-600 font-semibold">Rs.{d.totalSalary.toLocaleString()}</td>
                      <td className="px-5 py-3.5">Rs.{d.avgSalary.toLocaleString()}</td>
                      <td className="px-5 py-3.5"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">{d.processed}</span></td>
                      <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${d.pending>0?"bg-amber-100 text-amber-700":"bg-gray-100 text-gray-500"}`}>{d.pending}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-20">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width:`${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setViewingPayslip(d)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs"><Eye size={13} /> View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 text-sm">Department-Wise Distribution</h3>
            <div className="space-y-3">
              {deptPayroll.map(d => {
                const pct = ((d.totalSalary/stats.payroll)*100).toFixed(1);
                return (
                  <div key={d.department}>
                    <div className="flex justify-between text-sm mb-1.5"><span className="font-medium text-gray-700">{d.department}</span><span className="font-bold text-gray-800">{pct}%</span></div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-700" style={{ width:`${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 text-sm">Monthly Trend</h3>
            <div className="space-y-3">
              {[["January 2026",`Rs.${(stats.payroll/1000000).toFixed(2)}M`,"from-indigo-400 to-violet-500"],["December 2025","Rs.4.15M","from-sky-400 to-blue-500"],["November 2025","Rs.4.10M","from-teal-400 to-emerald-500"]].map(([m,v,g]) => (
                <div key={m} className={`flex items-center justify-between p-4 bg-gradient-to-r ${g} bg-opacity-10 rounded-xl`}>
                  <div><p className="text-xs text-gray-500">{m}</p><p className="text-lg font-bold text-gray-800">{v}</p></div>
                  <TrendingUp size={22} className="text-indigo-500 opacity-50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewingPayslip && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-t-2xl">
              <h3 className="text-xl font-bold">{viewingPayslip.department} – Payroll Details</h3>
              <button onClick={() => setViewingPayslip(null)} className="p-1.5 hover:bg-white/20 rounded-xl"><X size={18} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[["Total Employees",viewingPayslip.employees,"bg-violet-50 text-violet-600"],["Total Salary",`Rs.${viewingPayslip.totalSalary.toLocaleString()}`,"bg-emerald-50 text-emerald-600"],["Avg Salary",`Rs.${viewingPayslip.avgSalary.toLocaleString()}`,"bg-sky-50 text-sky-600"],["Pending",viewingPayslip.pending,"bg-amber-50 text-amber-600"]].map(([l,v,cls]) => (
                  <div key={l} className={`${cls} p-4 rounded-xl`}><p className="text-xs text-gray-500 mb-1">{l}</p><p className="text-2xl font-bold">{v}</p></div>
                ))}
              </div>
              <button onClick={() => setViewingPayslip(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
export default AdminPayslip;
