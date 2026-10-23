import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, CheckCircle, Clock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { ADMIN_URL } from "../../services/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [systemUsersCount, setSystemUsersCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.role !== "ADMIN") {
        navigate("/unauthorized");
        return;
      }
      setUser(userData);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. Fetch live companies
      const compRes = await fetch(`${ADMIN_URL}/admin/companies`, { headers });
      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(compData.data || compData || []);
      }

      // 2. Fetch live system users count
      const usersRes = await fetch(`${ADMIN_URL}/admin/users`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const list = usersData.data || usersData || [];
        setSystemUsersCount(list.length);
      }
    } catch (err) {
      console.warn("Failed to fetch live admin dashboard data:", err);
      setError("Unable to connect to Admin_Backend service. Please check if services are running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (!user) return null;

  const totalCompanies = companies.length;
  const pendingCompanies = companies.filter((c) => (c.status || "").toUpperCase() === "PENDING");
  const activeCompanies = companies.filter((c) => (c.status || "").toUpperCase() === "ACTIVE" || (c.status || "").toUpperCase() === "APPROVED");
  const rejectedCompanies = companies.filter((c) => (c.status || "").toUpperCase() === "REJECTED");

  return (
    <PageLayout role="admin" activePage="Overview" title="Admin Dashboard" subtitle="System Overview & Pending Company Onboarding Applications">
      <div className="space-y-6 animate-fade-in">
        
        {/* Error Notification */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-2xl text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-amber-700 hover:text-amber-900 font-bold text-xs">Dismiss</button>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-white shadow-xl"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #6d28d9 100%)" }}
        >
          <div
            className="absolute -top-10 -right-10 w-56 h-56 rounded-full opacity-25"
            style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Administrator Portal</p>
              <h2 className="text-2xl md:text-3xl font-bold">Welcome back, {user.fullName?.split(" ")[0]} 👋</h2>
              <p className="text-indigo-200 text-xs mt-1">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-2 rounded-xl bg-white/20 text-xs font-bold backdrop-blur-md flex items-center gap-2">
                🏢 {totalCompanies} Total Companies
              </span>
              <span className="px-4 py-2 rounded-xl bg-amber-400/30 text-xs font-bold backdrop-blur-md flex items-center gap-2 border border-amber-300/40">
                ⏳ {pendingCompanies.length} Pending Approvals
              </span>
            </div>
          </div>
        </div>

        {/* Live Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { title: "Total Companies", value: totalCompanies, icon: "🏢", gradient: "from-indigo-500 to-violet-600", sub: `${activeCompanies.length} active` },
            { title: "Pending Applications", value: pendingCompanies.length, icon: "⏳", gradient: "from-amber-400 to-orange-500", sub: "Needs review" },
            { title: "Active System Users", value: systemUsersCount, icon: "👥", gradient: "from-emerald-400 to-teal-500", sub: "Across all tenants" },
            { title: "Rejected Applications", value: rejectedCompanies.length, icon: "❌", gradient: "from-rose-400 to-red-500", sub: "Audit logged" },
          ].map((s) => (
            <div key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${s.gradient} text-white shadow-md`}>
                  {s.icon}
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{s.sub}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{loading ? "..." : s.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{s.title}</p>
            </div>
          ))}
        </div>

        {/* Middle Section: Live Pending Approvals Table & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Pending Applications List (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  🏢 Pending Company Onboarding Approvals
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Real-time submitted requests awaiting administrator review</p>
              </div>
              <button
                onClick={() => navigate("/admin/companies")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 uppercase tracking-wider border-b border-gray-100 text-[10px]">
                    <th className="text-left py-2 px-3 font-semibold">Company Name</th>
                    <th className="text-left py-2 px-3 font-semibold">Contact Email</th>
                    <th className="text-left py-2 px-3 font-semibold">Industry</th>
                    <th className="text-left py-2 px-3 font-semibold">Submitted</th>
                    <th className="text-right py-2 px-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin text-indigo-600" />
                          <span>Fetching pending company requests...</span>
                        </div>
                      </td>
                    </tr>
                  ) : pendingCompanies.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <CheckCircle size={24} className="text-emerald-500 mb-1" />
                          <p className="font-semibold text-gray-700">No Pending Applications</p>
                          <p className="text-[11px] text-gray-400">All submitted company registration requests have been reviewed.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendingCompanies.map((c) => (
                      <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-800">{c.companyName || c.name}</p>
                          <p className="text-[10px] text-gray-400">{c.registrationNumber || "Reg N/A"}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{c.email}</td>
                        <td className="py-3 px-3 text-gray-500">{c.industry || "General"}</td>
                        <td className="py-3 px-3 text-gray-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : c.submittedOn || "Recent"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => navigate("/admin/companies")}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-[11px] shadow-xs transition-colors"
                          >
                            Review & Action
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Activity Feed (1 Col) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
              🔔 Recent System Activity
            </h3>
            
            <div className="space-y-3.5 flex-1">
              {companies.slice(0, 4).map((c, i) => {
                const isPending = (c.status || "").toUpperCase() === "PENDING";
                const isApproved = (c.status || "").toUpperCase() === "APPROVED" || (c.status || "").toUpperCase() === "ACTIVE";
                return (
                  <div key={c.id || i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${isPending ? "bg-amber-100 text-amber-700" : isApproved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 truncate">{c.companyName || c.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {isPending ? "Registration request pending review" : isApproved ? "Company approved & HR provisioned" : "Application rejected"}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 inline-block">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "System Record"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {companies.length === 0 && !loading && (
                <div className="p-6 text-center text-xs text-gray-400">
                  No system activity logs available.
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/admin/companies")}
              className="mt-4 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs text-center transition-colors"
            >
              Go to Companies Directory
            </button>
          </div>

        </div>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;
