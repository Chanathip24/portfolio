"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true } | { ok: false; error: string };

/** Marks one bug as dealt with by clearing its records. If it happens again it appears on the Errors page as a new bug, and the Inbox
 *  gets a new notice, which is what a fix that did not hold should look like. Runs as the signed-in admin (Row Level Security allows
 *  an admin to delete error rows), so no service key is involved. */
export async function resolveError(fingerprint: string): Promise<Result> {
  await requireAdmin();
  if (!/^[0-9a-f]{16}$/.test(fingerprint)) return { ok: false, error: "Invalid error." };
  const { error } = await (await createClient()).from("error_events").delete().eq("fingerprint", fingerprint);
  if (error) return { ok: false, error: "Could not resolve it." };
  updateTag("admin-reports"); // the Errors summary is cached for a minute; this makes the bug disappear now
  revalidatePath("/admin/errors");
  return { ok: true };
}
