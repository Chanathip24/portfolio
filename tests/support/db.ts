import { createClient } from "@supabase/supabase-js";
import { SB_KEY, SB_SERVICE, SB_URL } from "./env";
import { totp } from "./totp";

const options = { auth: { persistSession: false, autoRefreshToken: false } };
/** Bypasses every security rule: for test set-up and clean-up only. */
export const service = () => createClient(SB_URL, SB_SERVICE, options);
/** What a visitor's browser would use. */
export const anon = () => createClient(SB_URL, SB_KEY, options);

export type TestUser = { id: string; email: string; password: string };
const rand = () => Math.random().toString(36).slice(2, 10);

/** A throwaway user, on the `admins` list unless `admin: false`. Never the account you use by hand. */
export async function createUser({ admin = true }: { admin?: boolean } = {}): Promise<TestUser> {
  const email = `e2e-${rand()}@test.local`;
  const password = `Str0ng!Passw0rd#${rand()}`;
  const { data, error } = await service().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  if (admin) await service().from("admins").insert({ user_id: data.user.id });
  return { id: data.user.id, email, password };
}

export const deleteUser = (id: string) => service().auth.admin.deleteUser(id);

/** A signed-in client for the user. With `mfa: true` it also enrols an authenticator and passes the code, so the session is aal2. */
export async function signedInClient(user: TestUser, { mfa = false } = {}) {
  const client = createClient(SB_URL, SB_KEY, options);
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  if (mfa) {
    const known = secrets.get(user.id);
    if (known) {
      // already enrolled earlier in this run: just pass the code again
      const factor = (await client.auth.mfa.listFactors()).data?.totp[0];
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId: factor!.id, code: totp(known) });
      if (error) throw error;
    } else {
      const { data: enrolled, error: e1 } = await client.auth.mfa.enroll({ factorType: "totp" });
      if (e1) throw e1;
      const { error: e2 } = await client.auth.mfa.challengeAndVerify({ factorId: enrolled.id, code: totp(enrolled.totp.secret) });
      if (e2) throw e2;
      secrets.set(user.id, enrolled.totp.secret);
    }
  }
  return client;
}

const secrets = new Map<string, string>();

/** Everything the tests create is named or slugged with an `e2e` prefix; this removes it. */
export async function removeTestContent() {
  const sb = service();
  await sb.from("posts").delete().like("slug", "e2e%");
  await sb.from("projects").delete().like("slug", "e2e%");
  await sb.from("socials").delete().like("label", "E2E%");
  await sb.from("skills").delete().like("name", "E2E%");
  await sb.from("career").delete().like("role", "E2E%");
  await sb.from("tools").delete().like("name", "E2E%");
  await sb.from("post_categories").delete().like("slug", "e2e%");
  await sb.from("project_categories").delete().like("slug", "e2e%");
  await sb.from("skill_groups").delete().like("slug", "e2e%");
  await sb.from("page_views").delete().like("visitor", "e2e%");
  await sb.from("messages").delete().eq("kind", "security").like("subject", "%e2e-%"); // notices the sign-in tests cause
  await sb.from("auth_attempts").delete().like("key", "e2e-%"); // sign-in counters
  await sb.from("revisions").delete().like("label", "%e2e-%");
}
