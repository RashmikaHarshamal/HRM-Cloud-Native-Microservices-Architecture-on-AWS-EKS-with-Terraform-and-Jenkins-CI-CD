import { useCallback, useEffect, useRef, useState } from "react";
import { employeeApi, adminApi } from "../services/api";
import { NOTIFICATIONS_CHANGED, announceNotificationsChanged, normalizeNotification } from "./notifications";

/**
 * Loads the signed-in user's notifications and keeps them fresh (polls, and reloads right away when
 * another component marks / deletes one). Admins additionally see pending company registrations.
 *
 * role: "hr" | "employee" | "admin"
 */
export default function useNotifications(role, { pollMs = 5000 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const alive = useRef(true);

  const reload = useCallback(async () => {
    if (!localStorage.getItem("token")) { setLoading(false); return; }
    try {
      const res = await employeeApi.getNotifications();
      let list = (Array.isArray(res?.data) ? res.data : []).map((n) => normalizeNotification(n, role));

      if (role === "admin") {
        try {
          const cRes = await adminApi.getCompanies();
          const companies = cRes?.data || cRes || [];
          const pending = (Array.isArray(companies) ? companies : []).filter((c) => (c.status || "").toUpperCase() === "PENDING");
          const requests = pending.map((c) => ({
            id: `company-${c.id}`,
            local: true,
            title: "New Company Registration Request",
            message: `Application submitted by '${c.companyName || c.name}' (Contact: ${c.contactPersonName || c.email}). Status: PENDING.`,
            category: "COMPANY_REQUEST",
            read: false,
            createdAt: c.createdAt || null,
            link: "/admin/companies",
            subject: {},
          }));
          list = [...requests, ...list];
        } catch { /* admin service unreachable — still show the rest */ }
      }

      if (alive.current) { setNotifications(list); setError(""); }
    } catch (e) {
      if (alive.current) setError(e?.message || "Could not load notifications");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    alive.current = true;
    reload();
    const t = setInterval(reload, pollMs);
    window.addEventListener(NOTIFICATIONS_CHANGED, reload);
    return () => { alive.current = false; clearInterval(t); window.removeEventListener(NOTIFICATIONS_CHANGED, reload); };
  }, [reload, pollMs]);

  const markRead = useCallback(async (n) => {
    if (n.read) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.local) return;
    try { await employeeApi.markNotificationAsRead(n.id); announceNotificationsChanged(); } catch { reload(); }
  }, [reload]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    try { await employeeApi.markAllNotificationsAsRead(); announceNotificationsChanged(); } catch { reload(); }
  }, [reload]);

  const remove = useCallback(async (n) => {
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    if (n.local) return;
    try { await employeeApi.deleteNotification(n.id); announceNotificationsChanged(); } catch { reload(); }
  }, [reload]);

  return { notifications, loading, error, reload, markRead, markAllRead, remove };
}
