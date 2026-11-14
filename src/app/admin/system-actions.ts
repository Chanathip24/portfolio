"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true } | { ok: false; error: string };

/** Turns the in-app data tools (table browser and media library) on or off. */
export async function setDataTools(enabled: boolean): Promise<Result> {
  await requireAdmin();
  if (typeof enabled !== "boolean") return { ok: false, error: "Invalid value." };
  const { data, error } = await (await createClient()).from("app_settings").update({ data_tools_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", true).select("id");
  if (error || !data?.length) return { ok: false, error: "Could not save the setting." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Deletes one uploaded file. Paths are checked, so this can only ever touch the media bucket. */
export async function deleteMedia(path: string): Promise<Result> {
  await requireAdmin();
  if (!z.string().regex(/^[\w./-]{1,200}$/).safeParse(path).success || path.includes("..")) return { ok: false, error: "Invalid file." };
  const { error } = await (await createClient()).storage.from("media").remove([path]);
  if (error) return { ok: false, error: "Could not delete the file." };
  revalidatePath("/admin/media");
  return { ok: true };
}
