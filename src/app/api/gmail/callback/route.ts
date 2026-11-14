import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { GOOGLE, getSecrets, redirectUri, seal, siteOrigin } from "@/lib/admin/mail-connection";
import { authAdmin } from "@/lib/admin/users";
import { createClient } from "@/lib/supabase/server";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Step 2 of "Connect Gmail": Google sends the admin back here with a one-time code. It is exchanged for a refresh token (server to server,
 *  with the client secret), the token is stored encrypted, and the admin lands back on the inbox. */
export async function GET(req: NextRequest) {
  await requireAdmin();
  const origin = await siteOrigin();
  const back = (path: string) => { const r = NextResponse.redirect(new URL(path, origin)); r.cookies.delete({ name: "gmail_oauth_state", path: "/api/gmail" }); return r; };
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const expected = req.cookies.get("gmail_oauth_state")?.value ?? "";
  if (req.nextUrl.searchParams.get("error") || !code || !expected || !same(state, expected)) return back("/admin/settings?gmail=failed#gmail");

  const secrets = await getSecrets();
  if (!secrets?.clientId || !secrets.clientSecret) return back("/admin/settings?gmail=setup#gmail");
  const res = await fetch(GOOGLE.token, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: secrets.clientId, client_secret: secrets.clientSecret, redirect_uri: await redirectUri(), grant_type: "authorization_code" }),
  });
  const tokens = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string };
  if (!res.ok || !tokens.access_token || !tokens.refresh_token) return back("/admin/settings?gmail=failed#gmail");

  const info = await fetch(GOOGLE.userinfo, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const email = ((await info.json().catch(() => ({}))) as { email?: string }).email ?? "";
  const { error } = await authAdmin().from("mail_connection").update({ refresh_token_enc: seal(tokens.refresh_token), account_email: email, connected_at: new Date().toISOString(), expired: false, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) return back("/admin/settings?gmail=failed#gmail");
  await (await createClient()).rpc("log_event", { p_entity: "settings", p_summary: `Connected Gmail${email ? ` (${email})` : ""} to the inbox` });
  return back("/admin/inbox?gmail=connected");
}
