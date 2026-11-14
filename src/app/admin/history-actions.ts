"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { tables } from "@/lib/admin/schemas";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message: string } | { ok: false; error: string };

/** Puts an old version back with one click. The old row is saved over the live one (or put back, if it was deleted), as the signed-in admin,
 *  so Row Level Security still applies, and the version it replaces is kept in the history too: a restore can itself be undone. */
export async function restoreRevision(id: number): Promise<Result> {
  await requireAdmin();
  if (!z.number().int().positive().safeParse(id).success) return { ok: false, error: "Unknown version." };
  const db = await createClient();
  const { data: rev } = await db.from("revisions").select("entity,label,action,data").eq("id", id).maybeSingle();
  const entry = rev && Object.values(tables).find((t) => t.table === rev.entity);
  if (!rev || !entry) return { ok: false, error: "That version is gone." };
  const snapshot = { ...(rev.data as Record<string, unknown>) };
  if (rev.entity === "posts") delete snapshot.views; // the counter keeps its current value
  const { error } = await db.from(rev.entity).upsert(snapshot, { onConflict: entry.key });
  if (error) {
    if (error.code === "23503") return { ok: false, error: "Something it depends on (a category, a profile) was deleted. Restore that first." };
    if (error.code === "23505") return { ok: false, error: "Another item now uses its address, so it cannot be put back as it was." };
    return { ok: false, error: "Could not restore that version." };
  }
  updateTag(entry.tag);
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${rev.action === "deleted" ? "Brought back" : "Restored"} “${rev.label || "this item"}”. What it replaced is in the history too.` };
}
