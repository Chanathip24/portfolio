import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "../auth";

export async function db() {
  await requireAdmin();
  return createClient();
}

/** published, scheduled (published but its time is still ahead), draft or archived: what the admin sees at a glance. */
export type Visibility = "live" | "scheduled" | "draft" | "archived";
export const visibilityOf = (status: string, publishedAt: string, now = Date.now()): Visibility =>
  status === "published" ? (new Date(publishedAt).getTime() > now ? "scheduled" : "live") : status === "archived" ? "archived" : "draft";
