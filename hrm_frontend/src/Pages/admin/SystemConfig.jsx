import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Activity, ShieldCheck, FileText, Server, Database, Cpu, HardDrive, Clock, CheckCircle, AlertCircle, Save, Users } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const AdminSystemConfig = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [saved, setSaved] = useState(false);

  const [leaveSettings, setLeaveSettings] = useState({
    annualLeaveDays: 14, sickLeaveDays: 7, casualLeaveDays: 5, emergencyLeaveDays: 3,
    carryForwardAllowed: true, maxCarryForwardDays: 5,
  });
  const [payrollSettings, setPayrollSettings] = useState({
    basicSalaryPercent: 60, hraPercent: 20, pfPercent: 12, taxPercent: 10,
    overtimeMultiplier: 1.5, payrollCycleDay: 28,
  });
  const auditLogs = [
    { id:1, user:"Alice Johnson",       action:"Approved leave request",             module:"Leave",        timestamp:"2026-02-24 09:15", severity:"info" },
    { id:2, user:"Admin (David Lee)",   action:"Created new company: Tech Solutions", module:"Companies",    timestamp:"2026-02-24 08:45", severity:"info" },
    { id:3, user:"Admin (Frank Brown)", action:"Updated payroll formula",             module:"System Config",timestamp:"2026-02-23 17:30", severity:"warning" },
    { id:4, user:"Bob Williams",        action:"Failed login attempt",                module:"Auth",         timestamp:"2026-02-23 14:10", severity:"error" },
    { id:5, user:"Carol Smith",         action:"Rejected company: Blue Sky Retail",   module:"Companies",    timestamp:"2026-02-23 11:00", severity:"info" },
    { id:6, user:"System",             action:"Automated payroll run completed",      module:"Payroll",      timestamp:"2026-02-22 00:00", severity:"info" },
  ];
  const health = { serverUptime: 99.9, databaseLoad: 45, apiResponse: 78, storage: 62, activeConnections: 124, errorRate: 0.3 };

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) { const u = JSON.parse(s); if (u.role !== "ADMIN") { navigate("/unauthorized"); return; } setUser(u); }
    else navigate("/login");
  }, [navigate]);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const severityStyle = (s) => ({ error:"bg-red-100 text-red-700", warning:"bg-amber-100 text-amber-700" }[s] || "bg-sky-100 text-sky-700");
  const barColor = (v) => v >= 90 ? "bg-emerald-500" : v >= 60 ? "bg-amber-500" : "bg-red-500";

  if (!user) return null;

  const tabs = [
    { key:"settings", label:"Global Settings", icon:Settings },
    { key:"health",   label:"System Health",   icon:Activity },
    { key:"audit",    label:"Audit Logs",       icon:ShieldCheck },
  ];

  return (
    <PageLayout role="admin" activePage="System Config" title="System Configuration" subtitle="Manage global settings, monitor system health, and review audit logs">
      <div className="space-y-6">
        {/* Tab bar */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === t.key ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-5">
                <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><FileText size={16} className="text-indigo-600" /></span>
                Default Leave Policy
              </h3>
              <div className="space-y-4">
                {[
                  ["Annual Leave (days)","annualLeaveDays"],["Sick Leave (days)","sickLeaveDays"],
                  ["Casual Leave (days)","casualLeaveDays"],["Emergency Leave (days)","emergencyLeaveDays"],
                  ["Max Carry-Forward Days","maxCarryForwardDays"],
                ].map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">{label}</label>
                    <input type="number" min={0} value={leaveSettings[key]} onChange={e => setLeaveSettings({...leaveSettings,[key]:Number(e.target.value)})}
                      className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">Allow Carry-Forward</label>
                  <button onClick={() => setLeaveSettings({...leaveSettings, carryForwardAllowed: !leaveSettings.carryForwardAllowed})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${leaveSettings.carryForwardAllowed ? "bg-indigo-500" : "bg-gray-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${leaveSettings.carryForwardAllowed ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-5">
                <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center"><Activity size={16} className="text-violet-600" /></span>
                Payroll Formula
              </h3>
              <div className="space-y-4">
                {[
                  ["Basic Salary (%)","basicSalaryPercent",1],["HRA (%)","hraPercent",1],
                  ["PF Deduction (%)","pfPercent",1],["Tax Deduction (%)","taxPercent",1],
                  ["Overtime Multiplier (x)","overtimeMultiplier",0.1],["Payroll Cycle Day","payrollCycleDay",1],
                ].map(([label, key, step]) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">{label}</label>
                    <input type="number" min={0} step={step} value={payrollSettings[key]} onChange={e => setPayrollSettings({...payrollSettings,[key]:Number(e.target.value)})}
                      className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500 bg-gray-50" />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex items-center gap-4">
              <button onClick={handleSave} className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all">
                <Save size={16} /> Save Settings
              </button>
              {saved && <span className="flex items-center gap-2 text-emerald-600 font-semibold text-sm animate-pulse"><CheckCircle size={16} /> Settings saved!</span>}
            </div>
          </div>
        )}

        {/* Health Tab */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label:"Server Uptime",       value:`${health.serverUptime}%`,  icon:"🖥",  gradient:"from-indigo-400 to-violet-500" },
                { label:"Active Connections",  value:health.activeConnections,    icon:"🔗",  gradient:"from-emerald-400 to-teal-500" },
                { label:"Error Rate",          value:`${health.errorRate}%`,      icon:"⚠️",  gradient:"from-red-400 to-rose-500" },
              ].map(s => (
                <div key={s.label} className={`bg-gradient-to-br ${s.gradient} p-6 rounded-2xl text-white hover:-translate-y-1 transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-2"><p className="text-white/80 text-sm">{s.label}</p><span className="text-2xl">{s.icon}</span></div>
                  <p className="text-4xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-5">Performance Metrics</h3>
              <div className="space-y-4">
                {[["Server Uptime",health.serverUptime,Server],["Database Load",health.databaseLoad,Database],["API Response",health.apiResponse,Cpu],["Storage Used",health.storage,HardDrive]].map(([label,value,Icon]) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-2 text-gray-600"><Icon size={14} className="text-indigo-500" />{label}</span>
                      <span className="font-semibold text-gray-800">{value}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor(value)} rounded-full transition-all duration-700`} style={{ width:`${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2"><ShieldCheck size={18} className="text-indigo-500" /> System Audit Logs</h3>
              <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{auditLogs.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs">
                    {["User","Action","Module","Timestamp","Severity"].map(h => <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {auditLogs.map((log, i) => (
                    <tr key={log.id} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{log.user}</td>
                      <td className="px-5 py-3.5 text-gray-600">{log.action}</td>
                      <td className="px-5 py-3.5"><span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-semibold">{log.module}</span></td>
                      <td className="px-5 py-3.5 text-gray-400 flex items-center gap-1"><Clock size={12} /> {log.timestamp}</td>
                      <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${severityStyle(log.severity)}`}>{log.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};
export default AdminSystemConfig;