"use server";

import { requireRecentAdmin } from "@/lib/admin/recent-mfa";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifySecurity } from "@/lib/admin/security";
import { authAdmin, usersConfigured } from "@/lib/admin/users";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

// The same rules the project's Supabase Auth settings enforce, checked here first so the message is clear.
const password = z.string().min(12, "At least 12 characters").max(72, "At most 72 characters")
  .regex(/[a-z]/, "Add a lower-case letter").regex(/[A-Z]/, "Add an upper-case letter").regex(/\d/, "Add a digit").regex(/[^A-Za-z0-9]/, "Add a symbol");
const id = z.uuid();

/** Every action: the caller must be an admin, the service-role client is only used after that, the target is validated,
 *  and what was done is written to the audit log (as the caller, through the log_event function). */
async function run(fn: (ctx: { me: string; sb: ReturnType<typeof authAdmin>; log: (summary: string) => Promise<void> }) => Promise<Result>): Promise<Result> {
  const me = await requireRecentAdmin();
  if (!usersConfigured) return { ok: false, error: "User management needs SUPABASE_SERVICE_ROLE_KEY on the server." };
  const session = await createClient();
  const log = async (summary: string) => { await session.rpc("log_event", { p_entity: "users", p_summary: summary }); };
  try {
    const result = await fn({ me: me.id, sb: authAdmin(), log });
    if (result.ok) revalidatePath("/admin", "layout");
    return result;
  } catch {
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

const fail = (error: string): Result => ({ ok: false, error });
async function emailOf(sb: ReturnType<typeof authAdmin>, userId: string) {
  return (await sb.auth.admin.getUserById(userId)).data.user?.email ?? "a user";
}

export async function createUser(input: unknown): Promise<Result> {
  const parsed = z.object({ email: z.email().max(254), password, admin: z.boolean(), name: z.string().trim().max(80).optional() }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message === "Invalid email address" ? "Enter a valid email address." : parsed.error.issues[0].message);
  return run(async ({ sb, log }) => {
    const { data, error } = await sb.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: true, user_metadata: parsed.data.name ? { full_name: parsed.data.name } : undefined });
    if (error || !data.user) return fail(/already|registered/i.test(error?.message ?? "") ? "A user with that email already exists." : "Could not create the user.");
    if (parsed.data.admin) {
      const { error: e } = await (await createClient()).rpc("set_admin_flag", { target: data.user.id, make: true });
      if (e) return fail("The user was created, but making them an admin failed.");
    }
    await log(`Created user ${parsed.data.email}${parsed.data.admin ? " (admin)" : ""}`);
    return { ok: true, message: `Created ${parsed.data.email}.` };
  });
}

export async function setAdmin(userId: string, make: boolean): Promise<Result> {
  if (!id.safeParse(userId).success) return fail("Unknown user.");
  return run(async () => {
    const { error } = await (await createClient()).rpc("set_admin_flag", { target: userId, make }); // logs itself
    if (error) return fail(error.message);
    const who = await emailOf(authAdmin(), userId);
    await notifySecurity({ subject: `${who} ${make ? "was made an admin" : "lost admin access"}`, email: who, detail: `${who} ${make ? "now has full control of the site" : "can no longer change the site"}. If you did not do this, check the Users page.`, severity: make ? "warning" : "info", escalateAt: 99 });
    return { ok: true };
  });
}

export async function setBanned(userId: string, banned: boolean): Promise<Result> {
  if (!id.safeParse(userId).success) return fail("Unknown user.");
  return run(async ({ me, sb, log }) => {
    if (userId === me) return fail("You can't block yourself.");
    const who = await emailOf(sb, userId);
    const { error } = await sb.auth.admin.updateUserById(userId, { ban_duration: banned ? "876000h" : "none" });
    if (error) return fail("Could not change the block.");
    await log(`${banned ? "Blocked" : "Unblocked"} ${who}`);
    return { ok: true };
  });
}

export async function resetMfa(userId: string): Promise<Result> {
  if (!id.safeParse(userId).success) return fail("Unknown user.");
  return run(async ({ sb, log }) => {
    const { data } = await sb.auth.admin.mfa.listFactors({ userId });
    for (const f of data?.factors ?? []) await sb.auth.admin.mfa.deleteFactor({ userId, id: f.id });
    const who = await emailOf(sb, userId);
    await log(`Reset the authenticator of ${who}`);
    await notifySecurity({ subject: `Authenticator reset for ${who}`, email: who, detail: `The two-step authenticator of ${who} was removed. They set up a new one at their next sign-in.`, severity: "warning", escalateAt: 99 });
    return { ok: true, message: "They will set up a new authenticator at their next sign-in." };
  });
}

export async function setPassword(userId: string, newPassword: string): Promise<Result> {
  const p = password.safeParse(newPassword);
  if (!id.safeParse(userId).success || !p.success) return fail(p.success ? "Unknown user." : p.error.issues[0].message);
  return run(async ({ sb, log }) => {
    const { error } = await sb.auth.admin.updateUserById(userId, { password: p.data });
    if (error) return fail("Could not change the password.");
    const who = await emailOf(sb, userId);
    await log(`Changed the password of ${who}`);
    await notifySecurity({ subject: `Password changed for ${who}`, email: who, detail: `An admin set a new password for ${who}.`, severity: "info", escalateAt: 99 });
    return { ok: true, message: "Password changed." };
  });
}

export async function deleteUser(userId: string): Promise<Result> {
  if (!id.safeParse(userId).success) return fail("Unknown user.");
  return run(async ({ me, sb, log }) => {
    if (userId === me) return fail("You can't delete your own account here. Ask another admin.");
    const { data: admins } = await sb.from("admins").select("user_id");
    if ((admins ?? []).length <= 1 && (admins ?? []).some((a) => a.user_id === userId)) return fail("That is the only admin. Make someone else an admin first.");
    const who = await emailOf(sb, userId);
    const { error } = await sb.auth.admin.deleteUser(userId);
    if (error) return fail("Could not delete the user.");
    await log(`Deleted user ${who}`);
    return { ok: true };
  });
}

export type BulkUserAction = "block" | "unblock" | "delete" | "admin" | "unadmin";

/** One of the single-user actions applied to several users. Your own account, the last admin and the like are skipped by the
 *  same rules as one at a time; the result says how many were done and why the rest were not. */
export async function bulkUsers(action: BulkUserAction, ids: string[]): Promise<Result> {
  if (!["block", "unblock", "delete", "admin", "unadmin"].includes(action) || !Array.isArray(ids) || ids.length === 0 || ids.length > 50 || !ids.every((i) => id.safeParse(i).success)) return fail("Choose between 1 and 50 users.");
  let done = 0;
  const why = new Set<string>();
  for (const userId of ids) {
    const r = action === "block" ? await setBanned(userId, true) : action === "unblock" ? await setBanned(userId, false)
      : action === "delete" ? await deleteUser(userId) : await setAdmin(userId, action === "admin");
    if (r.ok) done++; else why.add(r.error);
  }
  if (done === 0) return fail([...why][0] ?? "Nothing was changed.");
  const verb = { block: "Blocked", unblock: "Unblocked", delete: "Deleted", admin: "Made admin:", unadmin: "Removed admin access from" }[action];
  return { ok: true, message: `${verb} ${done} ${done === 1 ? "user" : "users"}.${why.size ? ` Skipped ${ids.length - done}: ${[...why].join(" ")}` : ""}` };
}
