/** Small helpers shared by every template. */

/** Escape text destined for HTML. Everything user-facing goes through this. */
export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Escape for an attribute value. */
export const attr = (s) => esc(s).replace(/'/g, "&#39;");

/** Join class names, dropping falsy ones. */
export const cx = (...xs) => xs.filter(Boolean).join(" ");

/** Render a list, dropping nullish results. */
export const map = (xs, fn) => (xs ?? []).map(fn).filter(Boolean).join("");

/** Render `s` only when `cond` is truthy. */
export const when = (cond, s) => (cond ? (typeof s === "function" ? s() : s) : "");

/**
 * Initials for an avatar fallback. Two letters, uppercase.
 * "Suthaarshiny R S" → "SR", "Jeyashri" → "JE".
 */
export function initials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Stable id from a label, for anchors and aria-labelledby. */
export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse an ISO date as a local calendar date (not UTC — avoids off-by-one). */
export function parseDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso) {
  const d = parseDate(iso);
  return { day: String(d.getDate()).padStart(2, "0"), month: MONTHS[d.getMonth()], year: String(d.getFullYear()) };
}

/** Full readable date, e.g. "18 September 2026". */
export function longDate(iso) {
  const d = parseDate(iso);
  const full = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${d.getDate()} ${full[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Split events into upcoming and past against today. An event counts as
 * upcoming through the end of its last day, so a multi-day bootcamp does not
 * flip to "past" on its opening morning.
 */
export function splitEvents(events, today = new Date()) {
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = [];
  const past = [];
  for (const e of events) {
    const end = parseDate(e.endDate ?? e.date);
    (end >= midnight ? upcoming : past).push(e);
  }
  upcoming.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  past.sort((a, b) => parseDate(b.date) - parseDate(a.date));
  return { upcoming, past };
}
