"use server";

import { requireRecentAdmin } from "@/lib/admin/recent-mfa";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { GmailAuthError, fetchGmail, revokeGrant } from "@/lib/admin/gmail";
import { getMailStatus, getSecrets, seal } from "@/lib/admin/mail-connection";
import { authAdmin, usersConfigured } from "@/lib/admin/users";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message?: string } | { ok: false; error: string };
const ids = z.array(z.uuid()).min(1).max(200);
const done = (): Result => { revalidatePath("/admin", "layout"); return { ok: true }; };

/** Marks messages read or unread. Runs as the signed-in admin, so the database rules decide (only an admin passes). */
export async function setRead(list: string[], read: boolean): Promise<Result> {
  await requireAdmin();
  if (!ids.safeParse(list).success) return { ok: false, error: "Invalid messages." };
  const { error } = await (await createClient()).from("messages").update({ is_read: read }).in("id", list);
  return error ? { ok: false, error: "Could not update the messages." } : done();
}

export async function setStarred(id: string, starred: boolean): Promise<Result> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid message." };
  const { error } = await (await createClient()).from("messages").update({ starred }).eq("id", id);
  return error ? { ok: false, error: "Could not update the message." } : done();
}

export async function deleteMessages(list: string[]): Promise<Result> {
  await requireAdmin();
  if (!ids.safeParse(list).success) return { ok: false, error: "Invalid messages." };
  const { error } = await (await createClient()).from("messages").delete().in("id", list);
  return error ? { ok: false, error: "Could not delete the messages." } : done();
}

export async function markAllRead(): Promise<Result> {
  await requireAdmin();
  const { error } = await (await createClient()).from("messages").update({ is_read: true }).eq("is_read", false);
  return error ? { ok: false, error: "Could not update the messages." } : done();
}

/** Pulls the newest mail from Gmail into the inbox. Mail already fetched (same Message-ID) is skipped, and what the admin already read stays read. */
export async function syncGmail(): Promise<Result> {
  await requireAdmin();
  const status = await getMailStatus();
  if (!status.available) return { ok: false, error: "The service key is needed to store fetched mail." };
  if (!status.connected) return { ok: false, error: status.expired ? "The Gmail connection ended. Connect Gmail again." : "Gmail is not connected yet." };
  const sb = authAdmin();
  let mails;
  try { mails = await fetchGmail(30); } catch (e) {
    if (e instanceof GmailAuthError) {
      await sb.from("mail_connection").update({ expired: true, updated_at: new Date().toISOString() }).eq("id", true);
      done();
      return { ok: false, error: "Google ended the Gmail connection (it does that after a week while the app is in Testing mode). Connect Gmail again." };
    }
    return { ok: false, error: "Could not reach Gmail. Try again in a moment." };
  }
  if (mails.length === 0) return { ok: true, message: "Nothing new in Gmail." };
  const known = new Set(((await sb.from("messages").select("external_id").in("external_id", mails.map((m) => m.external_id))).data ?? []).map((r) => r.external_id as string));
  const fresh = mails.filter((m) => !known.has(m.external_id));
  if (fresh.length) {
    const { error } = await sb.from("messages").insert(fresh.map((m) => ({ ...m, source: "gmail", kind: "message", severity: "info" })));
    if (error) return { ok: false, error: "Could not store the fetched mail." };
  }
  done();
  return { ok: true, message: fresh.length ? `Fetched ${fresh.length} new ${fresh.length === 1 ? "message" : "messages"}.` : "Nothing new in Gmail." };
}

const client = z.object({ clientId: z.string().trim().min(10).max(300), clientSecret: z.string().trim().max(300) });

/** Saves the OAuth client the owner created in Google Cloud. A blank secret keeps the stored one; a different client id ends the old
 *  connection, because its token belongs to the old client. The secret is stored encrypted and is never sent back to the browser. */
export async function saveMailClient(input: { clientId: string; clientSecret: string }): Promise<Result> {
  await requireRecentAdmin();
  const parsed = client.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Paste the client ID from Google Cloud." };
  if (!usersConfigured) return { ok: false, error: "The service key is needed to store these." };
  const sb = authAdmin();
  const { data: row } = await sb.from("mail_connection").select("client_id,client_secret_enc").eq("id", true).maybeSingle();
  if (!parsed.data.clientSecret && !row?.client_secret_enc) return { ok: false, error: "Paste the client secret too." };
  const changed = row?.client_id !== parsed.data.clientId;
  const { error } = await sb.from("mail_connection").update({
    client_id: parsed.data.clientId,
    ...(parsed.data.clientSecret ? { client_secret_enc: seal(parsed.data.clientSecret) } : {}),
    ...(changed || parsed.data.clientSecret ? { refresh_token_enc: null, account_email: null, connected_at: null, expired: false } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", true);
  if (error) return { ok: false, error: "Could not save." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Saved. Now press Connect Gmail." };
}

/** Forgets the Gmail connection: Google is told to revoke the grant, and the stored token is deleted. Mail already fetched stays in the inbox. */
export async function disconnectGmail(): Promise<Result> {
  await requireRecentAdmin();
  if (!usersConfigured) return { ok: false, error: "The service key is needed." };
  const secrets = await getSecrets();
  if (secrets?.refreshToken) await revokeGrant(secrets.refreshToken);
  const { error } = await authAdmin().from("mail_connection").update({ refresh_token_enc: null, account_email: null, connected_at: null, expired: false, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) return { ok: false, error: "Could not disconnect." };
  await (await createClient()).rpc("log_event", { p_entity: "settings", p_summary: "Disconnected Gmail from the inbox" });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Gmail is disconnected." };
}
