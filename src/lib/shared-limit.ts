import "server-only";
import { authAdmin, usersConfigured } from "@/lib/admin/users";
import { withinLimit } from "@/lib/request-policy";
import { privateKey } from "@/lib/request-security";

/** True while `key` has made at most `max` calls in the window, counted across every server instance (take_rate_slot in the database).
 *  This instance's own memory is checked first, so an obvious flood is turned away without a database call. If the database cannot be
 *  reached the call is let through: these limits protect the tables, and losing a measurement is better than losing the page.
 *  `shared: true` keeps the key readable instead of hashing it, for fixed names like "errors:all" (a ceiling for everyone together,
 *  so a flood from many addresses cannot fill the tables either). */
export async function sharedLimit(key: string, max: number, { windowSeconds = 60, shared = false } = {}): Promise<boolean> {
  if (!withinLimit(key, max, windowSeconds * 1000)) return false;
  if (!usersConfigured) return true;
  try {
    const { data, error } = await authAdmin().rpc("take_rate_slot", { p_key: shared ? key : privateKey(`limit:${key}`), p_max: max, p_window_seconds: windowSeconds });
    return error ? true : data === true;
  } catch {
    return true;
  }
}
