import "server-only";
import { GOOGLE, getSecrets } from "@/lib/admin/mail-connection";

/** Reading Gmail through Google's API with the refresh token the owner granted by pressing Connect (see mail-connection.ts). Read-only scope:
 *  the site can never send, change or delete mail. */
export class GmailAuthError extends Error {}

export type FetchedMail = { external_id: string; from_name: string; from_email: string; subject: string; body: string; received_at: string };

/** Text of a mail: the plain part, or the HTML with tags removed. Mail is only ever shown as text, never as HTML. */
export function plainText(text: string | undefined, html: string | undefined) {
  const raw = text?.trim() || (html ? html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "");
  return raw.replace(/\n{3,}/g, "\n\n").trim().slice(0, 20000);
}

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };
type GmailMessage = { id: string; internalDate?: string; payload?: Part & { headers?: { name: string; value: string }[] } };

const decode = (data?: string) => (data ? Buffer.from(data, "base64url").toString("utf8") : "");
function collect(part: Part | undefined, out: { text: string; html: string }) {
  if (!part) return out;
  if (part.mimeType === "text/plain" && !out.text) out.text = decode(part.body?.data);
  else if (part.mimeType === "text/html" && !out.html) out.html = decode(part.body?.data);
  for (const p of part.parts ?? []) collect(p, out);
  return out;
}
/** `"Ada Lovelace" <ada@example.com>` or `ada@example.com` -> name and address. */
function sender(raw: string) {
  const m = /^\s*(?:"?([^"<]*?)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?\s*$/.exec(raw);
  return { name: (m?.[1] ?? "").trim().slice(0, 120), email: (m?.[2] ?? raw).slice(0, 254) };
}

async function accessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch(GOOGLE.token, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }) });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    // invalid_grant: Google ended the grant (the app is in Testing mode and a week passed, or access was removed). The owner reconnects.
    if (data.error === "invalid_grant" || data.error === "invalid_client" || data.error === "unauthorized_client") throw new GmailAuthError(data.error);
    throw new Error(`token request failed (${res.status})`);
  }
  return data.access_token;
}

/** The newest `limit` messages of the inbox, newest first. */
export async function fetchGmail(limit = 30): Promise<FetchedMail[]> {
  const secrets = await getSecrets();
  if (!secrets?.clientId || !secrets.clientSecret || !secrets.refreshToken) throw new GmailAuthError("not_connected");
  const token = await accessToken(secrets.clientId, secrets.clientSecret, secrets.refreshToken);
  const get = async <T>(path: string) => {
    const res = await fetch(`${GOOGLE.api}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) throw new GmailAuthError("gmail_denied");
    if (!res.ok) throw new Error(`Gmail answered ${res.status}`);
    return (await res.json()) as T;
  };
  const list = await get<{ messages?: { id: string }[] }>(`/users/me/messages?maxResults=${limit}&labelIds=INBOX`);
  const full = await Promise.all((list.messages ?? []).map((m) => get<GmailMessage>(`/users/me/messages/${m.id}?format=full`)));
  return full.map((m) => {
    const header = (name: string) => m.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
    const from = sender(header("from"));
    const { text, html } = collect(m.payload, { text: "", html: "" });
    return {
      external_id: header("message-id") || `gmail:${m.id}`,
      from_name: from.name,
      from_email: from.email,
      subject: (header("subject") || "(no subject)").slice(0, 300),
      body: plainText(text, html),
      received_at: new Date(Number(m.internalDate) || Date.now()).toISOString(),
    };
  });
}

/** Tells Google to forget the grant (best effort: disconnecting must work even if Google is unreachable). */
export async function revokeGrant(refreshToken: string) {
  try { await fetch(GOOGLE.revoke, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: refreshToken }) }); } catch { /* ignore */ }
}
