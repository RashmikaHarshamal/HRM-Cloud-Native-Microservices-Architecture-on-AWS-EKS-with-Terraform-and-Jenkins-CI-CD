import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Shield, Edit2, Save, X, Lock, Bell, Briefcase, Award, Settings, MapPin } from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

const ProfilePage = ({ role = "admin" }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = role === "admin";
  const accentGrad = isAdmin ? "from-indigo-500 to-violet-600" : "from-teal-500 to-emerald-600";
  const ringColor  = isAdmin ? "focus:ring-indigo-500" : "focus:ring-teal-500";

  const defaultProfile = isAdmin ? {
    fullName: "System Administrator",
    email: "admin@hrmsystem.com",
    phone: "+92 300 9876543",
    role: "ADMIN",
    privileges: ["Full System Access","User Management","Data Management","System Configuration"],
    systemInfo: { lastLogin: "2026-01-21 09:00 AM", accountCreated: "2020-01-01", accessLevel: "Super Admin" },
  } : {
    fullName: "HR Manager",
    email: "hr.manager@company.com",
    phone: "+92 300 1234567",
    address: "123 Business Street, Karachi",
    employeeId: "HR001",
    designation: "HR Manager",
    department: "Human Resources",
    joiningDate: "2020-01-15",
    experience: "6 years",
    education: "MBA in Human Resource Management",
    certifications: ["SHRM-CP","PHR","CIPD Level 5"],
    skills: ["Recruitment","Employee Relations","Payroll Management","Performance Appraisal"],
  };

  const [profileData, setProfileData] = useState(defaultProfile);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      const allowed = isAdmin ? u.role === "ADMIN" : u.role === "HR_MANAGER" || u.role === "ADMIN";
      if (!allowed) { navigate("/unauthorized"); return; }
      setUser(u);
      setProfileData(prev => ({ ...prev, fullName: u.fullName || prev.fullName, email: u.email || prev.email }));
    } else navigate("/login");
  }, [navigate, isAdmin]);

  const handleSave = () => { setIsEditing(false); alert("Profile updated successfully!"); };

  const field = (label, key, type = "text", disabled = false) => (
    <div key={key}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
      <input type={type} value={profileData[key] || ""} disabled={disabled || !isEditing} onChange={e => setProfileData({ ...profileData, [key]: e.target.value })}
        className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${ringColor} disabled:bg-gray-50 disabled:cursor-not-allowed transition-all`} />
    </div>
  );

  const tabs = isAdmin
    ? [["personal","Personal","User"],["security","Security","Lock"],["system","System","Settings"]]
    : [["personal","Personal","User"],["employment","Employment","Briefcase"],["qualifications","Qualifications","Award"],["settings","Settings","Settings"]];

  if (!user) return null;
  return (
    <PageLayout role={role} activePage="Profile" title={isAdmin ? "Administrator Profile" : "My Profile"} subtitle="Manage your personal information and settings"
      actions={
        isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"><Save size={15} /> Save</button>
            <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"><X size={15} /> Cancel</button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className={`flex items-center gap-2 bg-gradient-to-r ${accentGrad} text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg`}><Edit2 size={15} /> Edit Profile</button>
        )
      }
    >
      <div className="space-y-6">
        {/* Profile Hero */}
        <div className={`bg-gradient-to-r ${accentGrad} rounded-2xl p-8 text-white shadow-xl`}>
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-5xl font-bold shadow-xl border-2 border-white/40">
              {profileData.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">{profileData.fullName}</h2>
              <p className="text-white/80 text-base mb-3">{isAdmin ? profileData.systemInfo?.accessLevel : profileData.designation}</p>
              <div className="flex flex-wrap gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1.5"><Mail size={14} />{profileData.email}</span>
                <span className="flex items-center gap-1.5"><Phone size={14} />{profileData.phone}</span>
                {!isAdmin && <span className="flex items-center gap-1.5"><Shield size={14} />ID: {profileData.employeeId}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex gap-1 p-3 border-b border-gray-100 overflow-x-auto">
            {tabs.map(([key,label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === key ? `bg-gradient-to-r ${accentGrad} text-white shadow-md` : "text-gray-600 hover:bg-gray-100"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "personal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {field("Full Name","fullName")}
                {field("Email Address","email","email")}
                {field("Phone Number","phone","tel")}
                {isAdmin ? field("Role","role","text",true) : field("Address","address")}
                {isAdmin && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Admin Privileges</p>
                    <div className="flex flex-wrap gap-2">
                      {profileData.privileges.map((p,i) => <span key={i} className={`px-3 py-1.5 bg-gradient-to-r ${accentGrad} text-white rounded-xl text-xs font-semibold shadow`}>{p}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "employment" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {field("Employee ID","employeeId","text",true)}
                {field("Designation","designation")}
                {field("Department","department")}
                {field("Joining Date","joiningDate","date",true)}
                {field("Experience","experience")}
              </div>
            )}
            {activeTab === "qualifications" && (
              <div className="space-y-6">
                {field("Education","education")}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {profileData.certifications.map((c,i) => <span key={i} className={`px-3 py-1.5 bg-gradient-to-r ${accentGrad} text-white rounded-xl text-xs font-semibold shadow`}>{c}</span>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map((s,i) => <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">{s}</span>)}
                  </div>
                </div>
              </div>
            )}
            {(activeTab === "security" || activeTab === "settings") && (
              <div className="space-y-5">
                <div className={`bg-gradient-to-r ${accentGrad} bg-opacity-10 border border-indigo-200 rounded-2xl p-5`}>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4"><Shield size={18} className="text-indigo-500" /> Account Security</h3>
                  {isAdmin && activeTab === "security" && (
                    <div className="space-y-2 mb-4 text-sm">
                      {[["Last Login",profileData.systemInfo?.lastLogin],["Account Created",profileData.systemInfo?.accountCreated]].map(([l,v]) => (
                        <div key={l} className="flex justify-between bg-white p-3 rounded-xl"><span className="text-gray-500">{l}</span><span className="font-semibold">{v}</span></div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button className={`px-5 py-2.5 bg-gradient-to-r ${accentGrad} text-white rounded-xl text-sm font-semibold shadow transition-all hover:shadow-md`}>Change Password</button>
                    <button className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow transition-colors">Enable 2FA</button>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4"><Bell size={18} className="text-gray-500" /> Notification Preferences</h3>
                  <div className="space-y-3">
                    {["System alerts and updates","User activity notifications","Security notifications","Email notifications"].map((p,i) => (
                      <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked={i < 3} className="w-4 h-4 rounded" />
                        <span className="text-sm text-gray-700">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {isAdmin && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                    <h3 className="font-semibold text-gray-800 mb-4">System Configuration</h3>
                    <div className="flex flex-wrap gap-3">
                      <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors">Manage Settings</button>
                      <button className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors">View Audit Logs</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export const AdminProfile = () => <ProfilePage role="admin" />;
export const HRProfile = () => <ProfilePage role="hr" />;
export default AdminProfile;
