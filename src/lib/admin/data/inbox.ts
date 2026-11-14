import "server-only";
import { db } from "./core";
import { allRows } from "../paging";

export type MessageRow = { id: string; source: "contact" | "gmail" | "system"; kind: "message" | "security"; severity: "info" | "warning" | "critical"; from_name: string; from_email: string; subject: string; body: string; received_at: string; is_read: boolean; starred: boolean };
const MESSAGE_COLUMNS = "id,source,kind,severity,from_name,from_email,subject,body,received_at,is_read,starred";
export async function listMessages(max = 5000) {
  const sb = await db();
  return (await allRows<MessageRow>((f, t) => sb.from("messages").select(MESSAGE_COLUMNS).order("received_at", { ascending: false }).order("id").range(f, t), max)).slice(0, max);
}
export async function unreadCount() {
  const { count } = await (await db()).from("messages").select("id", { count: "exact", head: true }).eq("is_read", false);
  return count ?? 0;
}
