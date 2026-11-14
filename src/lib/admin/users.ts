import "server-only";
import { type User, createClient } from "@supabase/supabase-js";
import { allRows } from "@/lib/admin/paging";
import { supabaseUrl } from "@/lib/supabase/env";

/** User management is the one place the app needs the Auth Admin API, which Supabase only offers with the service-role key.
 *  That key bypasses every security rule, so it is read here and nowhere else, it never reaches the browser (no NEXT_PUBLIC_
 *  prefix, `server-only`), and every function that uses it is called only after requireAdmin() has passed. */
export const usersConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl);

export function authAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !supabaseUrl) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type UserRow = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  is_admin: boolean;
  mfa: boolean;
};

export async function listUsers(): Promise<UserRow[]> {
  const sb = authAdmin();
  // Three queries however many users there are (it used to be one more per user, for the second factor).
  // The Auth API lists a page at a time (and the tables cap at 1000 rows), so keep asking until a short page comes back.
  const everyUser = async () => {
    const all: User[] = [];
    for (let page = 1; page <= 100; page++) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      all.push(...(data?.users ?? []));
      if ((data?.users.length ?? 0) < 1000) break;
    }
    return all;
  };
  const [users, { data: admins }, withMfa] = await Promise.all([
    everyUser(),
    sb.from("admins").select("user_id").range(0, 9999),
    allRows<string>((from, to) => sb.rpc("users_with_mfa").range(from, to)),
  ]);
  const adminIds = new Set((admins ?? []).map((a) => a.user_id as string));
  const mfaIds = new Set(withMfa);
  return users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: String(u.user_metadata?.full_name ?? ""),
      avatar: typeof u.user_metadata?.avatar_url === "string" ? u.user_metadata.avatar_url : null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      banned: Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
      is_admin: adminIds.has(u.id),
      mfa: mfaIds.has(u.id),
    }))
    .sort((a, b) => Number(b.is_admin) - Number(a.is_admin) || a.email.localeCompare(b.email));
}
