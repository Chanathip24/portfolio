import "server-only";
import { authAdmin, usersConfigured } from "@/lib/admin/users";

const WINDOW_MS = 10 * 60_000;

/** Limits on sign-in guessing. Failed tries are written to `auth_attempts` (server-only table) and counted per key over ten minutes:
 *  per email address and per network address, and per account for second-step codes. A blocked request never reaches Supabase.
 *  Without the service key there is nowhere to count, so nothing is blocked (Supabase's own limits still apply). */
export async function allowed(kind: "email" | "ip" | "mfa", key: string, max: number) {
  if (!usersConfigured || !key) return true;
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await authAdmin().from("auth_attempts").select("id", { count: "exact", head: true }).eq("kind", kind).eq("key", key).gte("at", since);
  return (count ?? 0) < max;
}

export async function recordFailure(kind: "email" | "ip" | "mfa", key: string) {
  if (!usersConfigured || !key) return;
  const sb = authAdmin();
  await sb.from("auth_attempts").insert({ kind, key: key.slice(0, 320) });
  // Tidy as we go: nothing older than a day is needed.
  await sb.from("auth_attempts").delete().lt("at", new Date(Date.now() - 86_400_000).toISOString());
}

/** Wipes the counters for a key after a successful step. */
export async function clearFailures(kind: "email" | "ip" | "mfa", key: string) {
  if (!usersConfigured || !key) return;
  await authAdmin().from("auth_attempts").delete().eq("kind", kind).eq("key", key);
}
