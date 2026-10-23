import { useEffect, useState } from "react";

// Shared attendance helpers for the employee Dashboard and Attendance pages.

export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => {
        let msg = "Unable to retrieve your location";
        if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied. Please enable location access to clock in/out.";
        else if (error.code === error.POSITION_UNAVAILABLE) msg = "Location information is unavailable";
        else if (error.code === error.TIMEOUT) msg = "Location request timed out";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

// "YYYY-MM-DD" in the browser's local time zone (toISOString would give the UTC date).
export const toLocalDateString = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// "HH:mm[:ss[.SSS]]" -> minutes since midnight (fractional, so seconds count).
const timeToMinutes = (time) => {
  const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
  return h * 60 + m + s / 60;
};

const nowToMinutes = (now) => now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

// A session with no clock-out is still running only if it's from today; it counts up to `now`.
const sessionMinutes = (session, now) => {
  if (!session.clockInTime) return 0;
  let end;
  if (session.clockOutTime) end = timeToMinutes(session.clockOutTime);
  else if (now && session.date === toLocalDateString(now)) end = nowToMinutes(now);
  else return 0;
  return Math.max(0, end - timeToMinutes(session.clockInTime));
};

export const formatMinutes = (totalMinutes, withSeconds = false) => {
  const totalSeconds = Math.floor(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return withSeconds ? `${hours}h ${minutes}m ${seconds}s` : `${hours}h ${minutes}m`;
};

const byClockIn = (a, b) => (a.clockInTime || "").localeCompare(b.clockInTime || "");

// Today's sessions (raw API rows) -> one summary object for the "Today's Attendance" card.
export const summarizeSessions = (sessions, now) => {
  if (!sessions || sessions.length === 0) return null;
  const sorted = [...sessions].sort(byClockIn);
  const last = sorted[sorted.length - 1];
  return {
    ...last,
    sessions: sorted,
    totalWorkingMinutes: sorted.reduce((sum, s) => sum + sessionMinutes(s, now), 0),
    isClockedIn: !last.clockOutTime,
  };
};

// Raw session rows (possibly several per day) -> one summary row per calendar day, most recent day first.
export const groupSessionsByDate = (sessions, now) => {
  const byDate = {};
  (sessions || []).forEach((s) => {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  });
  return Object.keys(byDate)
    .sort()
    .reverse()
    .map((date) => {
      const daySessions = [...byDate[date]].sort(byClockIn);
      const last = daySessions[daySessions.length - 1];
      return {
        date,
        status: last.status,
        clockInTime: last.clockInTime,
        clockOutTime: last.clockOutTime,
        clockInLocation: last.clockInLocation,
        clockOutLocation: last.clockOutLocation,
        totalWorkingMinutes: daySessions.reduce((sum, s) => sum + sessionMinutes(s, now), 0),
        sessionCount: daySessions.length,
      };
    });
};

// Raw session rows for a company/day (possibly several per employee, e.g. multiple
// clock-in/out pairs) -> one summary row per employee. Used by the HR attendance page.
export const groupSessionsByEmployee = (sessions, now) => {
  const byEmployee = {};
  (sessions || []).forEach((s) => {
    const key = s.employeeId ?? s.employeeIdNumber ?? s.employeeName;
    if (!byEmployee[key]) byEmployee[key] = [];
    byEmployee[key].push(s);
  });
  return Object.values(byEmployee).map((empSessions) => {
    const sorted = [...empSessions].sort(byClockIn);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      employeeId: first.employeeId,
      empId: first.employeeIdNumber,
      name: first.employeeName,
      department: first.departmentName,
      date: first.date,
      status: last.status,
      clockInTime: first.clockInTime,
      clockOutTime: last.clockOutTime,
      clockInLocation: first.clockInLocation,
      clockOutLocation: last.clockOutLocation,
      totalWorkingMinutes: sorted.reduce((sum, s) => sum + sessionMinutes(s, now), 0),
      sessionCount: sorted.length,
      isClockedIn: !last.clockOutTime,
    };
  });
};

// Current time, re-rendering every `intervalMs` while `active` (e.g. only while clocked in).
export const useNow = (active, intervalMs = 1000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setNow(new Date());
    if (!active) return undefined;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
};
