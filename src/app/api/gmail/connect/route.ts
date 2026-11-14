import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { GMAIL_SCOPE, GOOGLE, getSecrets, redirectUri, siteOrigin } from "@/lib/admin/mail-connection";

/** Step 1 of "Connect Gmail": sends the signed-in admin to Google's consent screen. A random `state` is kept in a short-lived cookie and
 *  checked on the way back, so a link someone else crafted cannot attach their mailbox to this site. */
export async function GET() {
  await requireAdmin();
  const secrets = await getSecrets();
  if (!secrets?.clientId || !secrets.clientSecret) return NextResponse.redirect(new URL("/admin/settings?gmail=setup#gmail", await siteOrigin()));
  const state = randomBytes(24).toString("base64url");
  const url = new URL(GOOGLE.auth);
  url.search = new URLSearchParams({
    client_id: secrets.clientId, redirect_uri: await redirectUri(), response_type: "code", scope: GMAIL_SCOPE,
    access_type: "offline", prompt: "consent", state,
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("gmail_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: (await siteOrigin()).startsWith("https:"), path: "/api/gmail", maxAge: 600 });
  return res;
}
