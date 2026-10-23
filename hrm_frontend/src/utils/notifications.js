/**
 * Shared helpers for the notification bell popup and the HR notifications page.
 * The backend (Employee_Backend /employee/notifications) returns, per notification:
 *   id, title, message, type, isRead, createdAt, category, link, refId,
 *   subjectName / subjectEmployeeCode / subjectDepartment / subjectJobRole (birthdays)
 */

export const NOTIFICATIONS_CHANGED = "hrm:notifications-changed";

/** Tell every mounted bell / notifications page to reload now (instead of waiting for the next poll). */
export const announceNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

export const isBirthday = (n) => n.category === "BIRTHDAY" || n.category === "BIRTHDAY_WISH";

/** Turns an API row into what the UI renders. */
export const normalizeNotification = (n, role) => ({
  id: n.id,
  title: n.title || "Notification",
  message: n.message || "",
  category: n.category || "GENERAL",
  read: !!n.isRead,
  createdAt: n.createdAt || null,
  refId: n.refId || null,
  // Birthdays never navigate; everything else opens the page named by the backend.
  // (Admin's older company-request notifications have no link, so they open the Companies page.)
  link: isBirthday(n) ? null : n.link || (role === "admin" ? "/admin/companies" : null),
  subject: {
    name: n.subjectName || null,
    employeeId: n.subjectEmployeeCode || null,
    department: n.subjectDepartment || null,
    jobRole: n.subjectJobRole || null,
  },
});

/** "just now", "5 min ago", "3 h ago", "Yesterday", or a date. */
export const timeAgo = (iso) => {
  if (!iso) return "Recently";
  const d = new Date(iso);
  if (isNaN(d)) return "Recently";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
};

/** Short label for the "go to" hint under a clickable notification. */
export const linkLabel = (n) => {
  switch (n.category) {
    case "LEAVE_REQUEST": return "Review leave request";
    case "ALLOWANCE_REQUEST": return "Review allowance request";
    case "LEAVE_APPROVED":
    case "LEAVE_REJECTED": return "Open my leave";
    case "ALLOWANCE_APPROVED":
    case "ALLOWANCE_REJECTED": return "Open my allowance requests";
    case "PAYSLIP": return "Open payslip";
    default: return n.link && n.link.startsWith("/admin") ? "Open companies" : "Open";
  }
};

/** Role colour themes: HR = teal/emerald (the HR sidebar), employee = sky/blue, admin = indigo. */
export const NOTIF_THEME = {
  hr: {
    header: "from-teal-600 to-emerald-600",
    headerSub: "text-teal-100",
    headerIcon: "text-teal-100",
    unreadRow: "bg-teal-50/70 border-teal-100",
    hoverRow: "hover:bg-teal-50",
    link: "text-teal-700 hover:text-teal-900",
    dot: "bg-teal-500",
    tabOn: "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow",
    action: "text-teal-600 hover:text-teal-800",
    ring: "focus:ring-teal-500",
  },
  employee: {
    header: "from-sky-500 to-blue-600",
    headerSub: "text-sky-100",
    headerIcon: "text-sky-100",
    unreadRow: "bg-sky-50/70 border-sky-100",
    hoverRow: "hover:bg-sky-50",
    link: "text-sky-700 hover:text-sky-900",
    dot: "bg-sky-500",
    tabOn: "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow",
    action: "text-sky-600 hover:text-sky-800",
    ring: "focus:ring-sky-500",
  },
  admin: {
    header: "from-slate-900 to-indigo-950",
    headerSub: "text-indigo-200",
    headerIcon: "text-indigo-300",
    unreadRow: "bg-indigo-50/60 border-indigo-100",
    hoverRow: "hover:bg-indigo-50",
    link: "text-indigo-600 hover:text-indigo-800",
    dot: "bg-indigo-500",
    tabOn: "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow",
    action: "text-indigo-600 hover:text-indigo-800",
    ring: "focus:ring-indigo-500",
  },
};
