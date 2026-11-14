"use server";

import { requireRecentAdmin } from "@/lib/admin/recent-mfa";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message?: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

const password = z.string().min(12, "At least 12 characters").max(72, "At most 72 characters")
  .regex(/[a-z]/, "Add a lower-case letter").regex(/[A-Z]/, "Add an upper-case letter").regex(/\d/, "Add a digit").regex(/[^A-Za-z0-9]/, "Add a symbol");
const image = z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Use an https:// address");

/** The signed-in admin's own display name and picture (kept in their Auth profile, not in the content tables). */
export async function updateMyProfile(input: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = z.object({ name: z.string().trim().max(80), avatar: image }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const sb = await createClient();
  const { error } = await sb.auth.updateUser({ data: { full_name: parsed.data.name, avatar_url: parsed.data.avatar || null } });
  if (error) return fail("Could not save your profile.");
  await sb.auth.refreshSession(); // so the new name and picture are in the session straight away
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Profile saved." };
}

/** Allowed only from a session that passed the second factor (requireAdmin guarantees it). */
export async function changeMyPassword(newPassword: string): Promise<Result> {
  await requireRecentAdmin();
  const parsed = password.safeParse(newPassword);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { error } = await (await createClient()).auth.updateUser({ password: parsed.data });
  if (error) return fail(/same/i.test(error.message) ? "Choose a password you haven't used here." : "Could not change the password.");
  return { ok: true, message: "Password changed." };
}

export async function listMyFactors() {
  await requireAdmin();
  const { data } = await (await createClient()).auth.mfa.listFactors();
  return (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name ?? "Authenticator app", created_at: f.created_at }));
}

/** An admin keeps at least one authenticator, or the next sign-in would have nothing to ask for. */
export async function removeMyFactor(factorId: string): Promise<Result> {
  await requireRecentAdmin();
  if (!z.uuid().safeParse(factorId).success) return fail("Unknown authenticator.");
  const sb = await createClient();
  const { data } = await sb.auth.mfa.listFactors();
  if ((data?.totp ?? []).length <= 1) return fail("You need at least one authenticator. Add another before removing this one.");
  const { error } = await sb.auth.mfa.unenroll({ factorId });
  if (error) return fail("Could not remove it.");
  revalidatePath("/admin/account");
  return { ok: true };
}

export type Enrollment = { factorId: string; qr: string; secret: string } | { error: string };
export async function addMyFactor(): Promise<Enrollment> {
  await requireRecentAdmin();
  const sb = await createClient();
  const { data: factors } = await sb.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { error: "Could not start setup. Try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmMyFactor(factorId: string, code: string): Promise<Result> {
  await requireAdmin();
  if (!z.uuid().safeParse(factorId).success || !/^\d{6}$/.test(code)) return fail("Enter the 6-digit code.");
  const { error } = await (await createClient()).auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return fail("That code is not right. Codes change every 30 seconds.");
  revalidatePath("/admin/account");
  return { ok: true, message: "Authenticator added." };
}

/** Signs out every other browser and device, keeping this one. */
export async function signOutOtherDevices(): Promise<Result> {
  await requireRecentAdmin();
  const { error } = await (await createClient()).auth.signOut({ scope: "others" });
  return error ? fail("Could not sign the other devices out.") : { ok: true, message: "Signed out everywhere else." };
}
