import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { authAdmin, usersConfigured } from "@/lib/admin/users";

/** The Gmail connection (see the mail_connection table). Everything here runs on the server with the service key, after requireAdmin().
 *  The secrets are encrypted with AES-256-GCM under a key derived from the service key, so a copy of the database alone reveals nothing. */

const mock = process.env.GOOGLE_MOCK_ORIGIN; // tests only: points every Google address below at a fake Google
export const GOOGLE = mock
  ? { auth: `${mock}/auth`, token: `${mock}/token`, userinfo: `${mock}/userinfo`, revoke: `${mock}/revoke`, api: `${mock}/gmail/v1` }
  : { auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", userinfo: "https://openidconnect.googleapis.com/v1/userinfo", revoke: "https://oauth2.googleapis.com/revoke", api: "https://gmail.googleapis.com/gmail/v1" };
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly openid email";

const key = () => Buffer.from(hkdfSync("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", "mail-connection-salt", "mail-connection", 32));
export function seal(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
/** The text back, or null when it cannot be read (altered, or the service key changed). */
export function unseal(sealed: string) {
  try {
    const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64"));
    const d = createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch { return null; }
}

/** The address visitors reach the site on, for the redirect address Google must be told about. */
export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
export const redirectUri = async () => `${await siteOrigin()}/api/gmail/callback`;

export type MailStatus = { available: boolean; clientId: string; hasSecret: boolean; connected: boolean; expired: boolean; email: string | null };
export type MailSecrets = { clientId: string; clientSecret: string; refreshToken: string | null };

/** The stored connection with its secrets opened. Server code only; never pass this to the browser. */
export async function getSecrets(): Promise<MailSecrets | null> {
  if (!usersConfigured) return null;
  const { data } = await authAdmin().from("mail_connection").select("client_id,client_secret_enc,refresh_token_enc").eq("id", true).maybeSingle();
  if (!data) return null;
  return { clientId: data.client_id as string, clientSecret: data.client_secret_enc ? unseal(data.client_secret_enc as string) ?? "" : "", refreshToken: data.refresh_token_enc ? unseal(data.refresh_token_enc as string) : null };
}

/** What the screens may know: whether it is set up and connected, never a secret. */
export async function getMailStatus(): Promise<MailStatus> {
  if (!usersConfigured) return { available: false, clientId: "", hasSecret: false, connected: false, expired: false, email: null };
  const { data } = await authAdmin().from("mail_connection").select("client_id,client_secret_enc,refresh_token_enc,account_email,expired").eq("id", true).maybeSingle();
  return { available: true, clientId: (data?.client_id as string) ?? "", hasSecret: Boolean(data?.client_secret_enc), connected: Boolean(data?.refresh_token_enc) && !data?.expired, expired: Boolean(data?.expired), email: (data?.account_email as string | null) ?? null };
}
