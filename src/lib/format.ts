const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "14 Oct 2026". Fixed timezone and locale so server and browser print the same text. */
export const formatDate = (iso: string) => date.format(new Date(iso));

const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
/** "09:41" (UTC, like formatDate). */
export const formatTime = (iso: string) => time.format(new Date(iso));

/** "https://www.example.org/a?b" -> "example.org"; anything that is not an address stays as it is. */
export function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/** "engineering" -> "Engineering" */
export const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 12840 -> "12.8K" */
export const formatCount = (n: number) => compact.format(n);

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. Rendered on the server, so the same for everyone. */
export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)} d ago`;
  return dayMonth.format(new Date(iso));
}
