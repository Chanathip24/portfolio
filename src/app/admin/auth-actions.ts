"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { allowed, clearFailures, recordFailure } from "@/lib/admin/rate-limit";
import { clientIp, notifySecurity } from "@/lib/admin/security";
import { createClient } from "@/lib/supabase/server";
import { privateKey } from "@/lib/request-security";

/** `email` is sent back so the field keeps what was typed: React clears uncontrolled form fields after an action. */
export type FormState = { error?: string; email?: string };

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

/** Step 1 of sign-in. The same message for every failure, so it never says which part was wrong. Step 2 is MFA. */
export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = credentials.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password.", email };
  // Guessing is limited per address and per network (see rate-limit.ts); a blocked try never reaches Supabase.
  const ip = await clientIp().catch(() => "");
  const mail = parsed.data.email.toLowerCase();
  const jar = await cookies();
  let browser = jar.get("signin-client")?.value;
  if (!browser || !/^[a-f0-9]{48}$/.test(browser)) {
    browser = randomBytes(24).toString("hex");
    jar.set("signin-client", browser, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https:") === true, path: "/admin", maxAge: 3600 });
  }
  // Unknown ingress: isolate counters by browser instead of locking an email globally.
  const pair = privateKey(`signin:${mail}:${ip || browser}`);
  const network = ip ? privateKey(`network:${ip}`) : "";
  if (!(await allowed("email", pair, 5)) || !(await allowed("ip", network, 20))) {
    await notifySecurity({ subject: `Sign-in blocked for ${mail}`, email: mail, detail: `Too many wrong passwords for ${mail}, or from one address. Further tries are refused for ten minutes.`, severity: "critical", escalateAt: 1 });
    return { email, error: "Too many attempts. Wait ten minutes and try again." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (!error) await clearFailures("email", pair);
  if (error) {
    await Promise.all([recordFailure("email", pair), recordFailure("ip", network)]);
    await notifySecurity({ subject: `Failed sign-in for ${parsed.data.email}`, email: parsed.data.email, detail: `Someone tried to sign in to the admin as ${parsed.data.email} with a wrong password.` });
    return { email, error: error.status === 429 ? "Too many attempts. Wait a few minutes and try again." : "Wrong email or password." };
  }
  redirect("/admin/mfa");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export type Enrollment = { factorId: string; qr: string; secret: string } | { error: string };

/** Starts authenticator-app enrolment for the signed-in user (first sign-in only). */
export async function enrollTotp(): Promise<Enrollment> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "Your session ended. Sign in again." };
  const { data: factors } = await supabase.auth.mfa.listFactors();
  // Refuse to add a second factor from a password-only session; unfinished enrolments are cleared and restarted.
  if (factors?.totp.length) return { error: "An authenticator is already set up. Use it to sign in." };
  for (const f of factors?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
  if (error || !data) return { error: "Could not start setup. Try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

const code = z.object({ factorId: z.uuid(), code: z.string().regex(/^\d{6}$/) });

/** Checks the 6-digit code; success upgrades the session to aal2, which is what the admin requires. */
export async function verifyTotp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = code.safeParse({ factorId: formData.get("factorId"), code: String(formData.get("code") ?? "").replace(/\s/g, "") });
  if (!parsed.success) return { error: "Enter the 6-digit code." };
  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();
  const account = me.user?.id ?? "";
  if (!(await allowed("mfa", account, 5))) return { error: "Too many wrong codes. Wait ten minutes and try again." };
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data);
  if (!error) await clearFailures("mfa", account);
  if (error) {
    await recordFailure("mfa", account);
    const who = me.user?.email ?? "";
    await notifySecurity({ subject: `Wrong two-step code for ${who || "an account"}`, email: who, detail: `A correct password was entered for ${who || "an admin account"}, but the authenticator code was wrong.`, escalateAt: 3 });
    return { error: error.status === 429 ? "Too many attempts. Wait a few minutes and try again." : "That code is not right. Codes change every 30 seconds." };
  }
  redirect("/admin");
}
