import React from "react";
import { EMP_GRADIENT } from "./employeeTheme";
import { ArrowUpDown, ChevronUp, ChevronDown, Loader2, Search, X } from "lucide-react";

/**
 * Shared UI building blocks for the employee portal pages.
 * Mirrors the structure of the HR Employees page (gradient summary cards,
 * search/filter bar, gradient table header with sortable columns), using the
 * employee sidebar's sky → blue accent.
 */


// ---------------------------------------------------------
// BUTTONS
// ---------------------------------------------------------
export const EmpButton = ({ variant = "primary", className = "", children, ...props }) => {
  const styles = {
    primary: `${EMP_GRADIENT} hover:from-sky-500 hover:to-blue-600 text-white shadow-sm shadow-blue-500/20`,
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
    danger: "bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-sm shadow-red-500/20",
    success: "bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white shadow-sm shadow-emerald-500/20",
  }[variant];

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
};

// ---------------------------------------------------------
// CARDS
// ---------------------------------------------------------
export const SummaryCard = ({ icon, title, value, description, className = EMP_GRADIENT }) => (
  <div className={`rounded-2xl p-5 text-white shadow-sm hover:shadow-md transition-shadow ${className}`}>
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-white">{title}</p>
        <p className="mt-2 text-2xl font-bold text-white truncate">{value}</p>
        {description && <p className="mt-1 text-xs text-white/80">{description}</p>}
      </div>
      {icon && (
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-white/15 text-white flex items-center justify-center">
          {icon}
        </div>
      )}
    </div>
  </div>
);

export const Panel = ({ title, icon, actions, className = "", bodyClassName = "p-5 sm:p-6", children }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
        {title && (
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-3">
            {icon && (
              <span className="h-9 w-9 rounded-xl bg-sky-50 text-blue-600 flex items-center justify-center">{icon}</span>
            )}
            {title}
          </h2>
        )}
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </div>
);

// ---------------------------------------------------------
// SEARCH & FILTER BAR
// ---------------------------------------------------------
export const SearchBar = ({ value, onChange, placeholder = "Search...", children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="relative flex-1 max-w-lg">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
        {value && (
          <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>
      {children && <div className="flex items-center gap-3 flex-wrap">{children}</div>}
    </div>
  </div>
);

export const FilterSelect = ({ value, onChange, children, className = "" }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 ${className}`}
  >
    {children}
  </select>
);

export const ShowingCount = ({ shown, total }) => (
  <span className="text-xs text-slate-500 font-medium">
    Showing <strong className="text-slate-800">{shown}</strong> of {total}
  </span>
);

// ---------------------------------------------------------
// TABLE
// ---------------------------------------------------------
export const TableCard = ({ children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">{children}</div>
);

// Gradient header row; `cols` is a Tailwind grid-cols-[...] class shared with the rows
export const TableHeaderRow = ({ cols, children }) => (
  <div className={`hidden lg:grid ${cols} gap-4 px-6 py-3.5 ${EMP_GRADIENT} border-b border-slate-200 rounded-t-2xl text-white`}>
    {children}
  </div>
);

export const TableHeader = ({ children, className = "", onClick, sortDir }) => (
  <div
    onClick={onClick}
    className={`text-[11px] font-bold uppercase tracking-wider text-white ${onClick ? "flex items-center gap-1 cursor-pointer select-none hover:text-sky-50" : ""} ${className}`}
  >
    {children}
    {onClick &&
      (sortDir ? (
        sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ArrowUpDown size={11} className="opacity-60" />
      ))}
  </div>
);

export const TableRows = ({ children }) => <div className="divide-y divide-slate-100">{children}</div>;

export const TableRow = ({ cols, children, mobile }) => (
  <div className="group px-4 sm:px-6 py-4 hover:bg-sky-50/50 transition-colors">
    <div className={`hidden lg:grid ${cols} gap-4 items-center`}>{children}</div>
    {mobile && <div className="lg:hidden">{mobile}</div>}
  </div>
);

export const LoadingState = ({ title = "Loading...", subtitle }) => (
  <div className="py-20 flex flex-col items-center justify-center text-center">
    <div className="h-11 w-11 rounded-xl bg-sky-50 text-blue-600 flex items-center justify-center mb-4">
      <Loader2 size={22} className="animate-spin" />
    </div>
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

export const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
    <div className="h-16 w-16 rounded-2xl bg-sky-50 text-blue-500 flex items-center justify-center mb-4">{icon}</div>
    <h3 className="text-base font-bold text-slate-800">{title}</h3>
    {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-sm">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ---------------------------------------------------------
// MISC
// ---------------------------------------------------------
export const Alert = ({ message }) => {
  if (!message) return null;
  const ok = message.startsWith("✓");
  return (
    <div
      className={`px-4 py-3 rounded-xl border text-sm font-medium ${
        ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
      }`}
    >
      {message}
    </div>
  );
};

export const IdChip = ({ children }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
    {children}
  </span>
);
