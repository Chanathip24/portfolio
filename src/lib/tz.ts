import { TZDate } from "@date-fns/tz";
import { addDays as addDaysTo, format } from "date-fns";
import { owner } from "@/content/site";

/** The time zone days are counted in until the admin picks one in Settings (owner.timeZone in src/content/site.ts). */
export const DEFAULT_TZ = owner.timeZone;

/** True for "UTC" and every zone this runtime knows (the list Settings offers), so a stored or submitted value is safe to use. */
let known: Set<string> | undefined; // built once: the runtime list has about 400 names
export const isTimeZone = (tz: unknown): tz is string => typeof tz === "string" && (tz === "UTC" || (known ??= new Set(Intl.supportedValuesOf("timeZone"))).has(tz));

const DAY = "yyyy-MM-dd";

/** The calendar day of an instant in a time zone, "YYYY-MM-DD". */
export const siteDay = (ms: number, tz: string) => format(new TZDate(ms, tz), DAY);

/** The instant a calendar day begins in a time zone, as ISO text ("2026-11-15" is "2026-11-14T17:00:00.000Z" in Bangkok). */
export function siteDayStart(day: string, tz: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, tz).getTime()).toISOString(); // a plain Date, so the text is UTC ("Z"), not the zone's own offset
}

/** The day `n` days after `day` (negative for before), both "YYYY-MM-DD". Plain calendar arithmetic, so no clock change can skew it. */
export const addDays = (day: string, n: number) => format(addDaysTo(new TZDate(day, "UTC"), n), DAY);

let memo: { hour: number; options: { value: string; label: string }[] } | undefined;
/** The choices for the Settings select: every zone with its offset right now, e.g. "Asia/Bangkok (UTC+07:00)". Offsets move with clock changes, so it is rebuilt each hour. */
export function timeZoneOptions(now = Date.now()) {
  const hour = Math.floor(now / 36e5);
  if (memo?.hour !== hour) {
    memo = { hour, options: [{ value: "UTC", label: "UTC" }, ...Intl.supportedValuesOf("timeZone").filter((z) => z !== "UTC").map((tz) => ({ value: tz, label: `${tz} (UTC${format(new TZDate(now, tz), "xxx")})` }))] };
  }
  return memo.options;
}
