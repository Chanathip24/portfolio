import { DEFAULT_TZ, addDays, siteDay } from "@/lib/tz";
import type { UserRow } from "./users";

/** Numbers about the accounts, from the list the users page already has. */
export function userStats(users: UserRow[], days = 30, now = Date.now(), tz = DEFAULT_TZ) {
  const admins = users.filter((u) => u.is_admin);
  const today = siteDay(now, tz);
  const signups = Array.from({ length: days }, (_, i) => ({ day: addDays(today, i + 1 - days), signups: 0 }));
  const at = new Map(signups.map((d, i) => [d.day, i]));
  for (const u of users) { const i = at.get(siteDay(Date.parse(u.created_at), tz)); if (i !== undefined) signups[i].signups++; }
  return {
    total: users.length,
    admins: admins.length,
    regular: users.length - admins.length,
    blocked: users.filter((u) => u.banned).length,
    mfaOn: users.filter((u) => u.mfa).length,
    adminsWithoutMfa: admins.filter((u) => !u.mfa).length,
    neverSignedIn: users.filter((u) => !u.last_sign_in_at).length,
    active7: users.filter((u) => u.last_sign_in_at && now - Date.parse(u.last_sign_in_at) < 7 * 864e5).length,
    newInPeriod: signups.reduce((n, d) => n + d.signups, 0),
    signups,
    days,
  };
}
export type UserStats = ReturnType<typeof userStats>;
