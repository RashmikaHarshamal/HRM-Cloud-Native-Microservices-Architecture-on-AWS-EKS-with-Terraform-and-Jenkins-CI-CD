/**
 * RoleSwitch — toggle that lets an HR manager jump between the HR dashboard
 * and their own Employee dashboard without logging out.
 * Renders nothing for anyone who isn't an HR manager.
 *
 * Props:
 *   mode     : 'hr' | 'employee' — which side is currently being viewed
 *   sidebar  : render for the dark sidebar instead of a light topbar
 *   collapsed: hide labels when the sidebar is collapsed
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, UserRound } from "lucide-react";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export const RoleSwitch = ({ mode = "hr", sidebar = false, collapsed = false }) => {
  const navigate = useNavigate();
  if (getStoredUser()?.role !== "HR_MANAGER") return null;

  const options = [
    { key: "hr", label: "HR", icon: Briefcase, path: "/hr/dashboard", active: "bg-teal-500 text-white shadow" },
    { key: "employee", label: "Employee", icon: UserRound, path: "/employee/dashboard", active: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow" },
  ];

  return (
    <div
      className={`${sidebar
        ? `flex ${collapsed ? "flex-col" : "flex-row"} items-stretch bg-white/5 rounded-xl p-1 gap-1`
        : "flex items-center bg-gray-100 rounded-xl p-1 gap-1"}`}
      role="group"
      aria-label="Switch dashboard"
    >
      {options.map(({ key, label, icon: Icon, path, active }) => {
        const isActive = mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => !isActive && navigate(path)}
            aria-pressed={isActive}
            title={`Switch to ${label} dashboard`}
            className={`flex ${collapsed ? "w-full justify-center" : "flex-1 justify-center"} items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? active
                : sidebar
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-800 hover:bg-white"
            }`}
          >
            <Icon size={14} />
            {(!sidebar || !collapsed) && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default RoleSwitch;
