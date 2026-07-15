const MONTH_ABBR = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseDueDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  let dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt;

  const m = s.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})$/i);
  if (m) {
    const mon = MONTH_ABBR[m[2].toLowerCase()];
    if (mon != null) {
      dt = new Date(Number(m[3]), mon, Number(m[1]));
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }

  return null;
}

export function formatDueDateDisplay(value) {
  const d = parseDueDate(value);
  if (!d) return value ? String(value) : "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

const istDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Submissions on the due date are still allowed (IST). */
export function isDueDatePassed(value, now = new Date()) {
  const due = parseDueDate(value);
  if (!due) return false;
  const todayStr = istDayFormatter.format(now);
  const dueStr = istDayFormatter.format(due);
  return todayStr > dueStr;
}
