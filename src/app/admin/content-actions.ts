"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import type { EntityName } from "@/lib/admin/fields";
import { readingMinutes, schemas, slugify, tables } from "@/lib/admin/schemas";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true; id: string; slug?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };
type Db = Awaited<ReturnType<typeof createClient>>;

const isEntity = (v: string): v is EntityName => Object.hasOwn(tables, v);
/** Rows are found by uuid, except the three managed lists (categories, groups), which are found by their slug. */
const validKey = (entity: EntityName, key: string) => (tables[entity].key === "slug" ? /^[a-z0-9]+(-[a-z0-9]+)*$/.test(key) : z.uuid().safeParse(key).success);
/** Where a database "reference" error (23503) should be shown, per entity. */
const referenceField: Partial<Record<EntityName, string>> = { post: "category", project: "tags", skill: "group" };
const usedBy: Record<string, string> = { postCategory: "posts", projectCategory: "projects", skillGroup: "skills" };

/** Posts need an author row; a one-person site just reuses the first one (or makes it from the profile). */
async function authorId(db: Db) {
  const { data } = await db.from("authors").select("id").limit(1).maybeSingle();
  if (data) return data.id as string;
  const { data: p } = await db.from("profile").select("display_name, role, image_url").limit(1).maybeSingle();
  const { data: created } = await db.from("authors").insert({ name: p?.display_name ?? "Author", role: p?.role ?? "", avatar_url: p?.image_url || null, profile_href: "/about" }).select("id").single();
  return created?.id as string | undefined;
}

/** Create (id = null) or update one row. Every call re-checks the admin, validates the input with zod, and
 *  writes as the signed-in user, so Row Level Security is the last gate. */
export async function saveEntity(entity: string, id: string | null, input: unknown): Promise<SaveResult> {
  await requireAdmin();
  if (!isEntity(entity)) return { ok: false, error: "Unknown item." };
  if (id !== null && !validKey(entity, id)) return { ok: false, error: "Unknown item." };

  const parsed = schemas[entity].safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, error: "Fix the highlighted fields.", fieldErrors };
  }

  const db = await createClient();
  const row: Record<string, unknown> = { ...parsed.data };
  const bad = (field: string, message: string): SaveResult => ({ ok: false, error: "Fix the highlighted fields.", fieldErrors: { [field]: message } });

  if (entity === "post" || entity === "project") {
    row.slug = (row.slug as string) || slugify(row.title as string);
    if (!row.slug) return bad("slug", "Add a slug or a title with letters");
    // The publish time is whatever the admin chose; empty means "now".
    row.published_at = row.published_at ? new Date(row.published_at as string).toISOString() : new Date().toISOString();
  }
  if (entity === "post") {
    row.reading_minutes = readingMinutes(row.body);
    if (!id) {
      const author = await authorId(db);
      if (!author) return { ok: false, error: "Could not find an author for this post." };
      row.author_id = author;
    }
  }
  if (entity === "postCategory" || entity === "projectCategory" || entity === "skillGroup") {
    if (id) delete row.slug; // fixed once created
    else {
      row.slug = (row.slug as string) || slugify(row.name as string);
      if (!row.slug) return bad("slug", "Add a URL name or a name with letters");
    }
  }
  if (entity === "social" && !id) {
    const { data: p } = await db.from("profile").select("id").limit(1).maybeSingle();
    if (!p) return { ok: false, error: "Save your profile first." };
    row.profile_id = p.id;
  }
  if (entity === "profile" && !id) {
    const { data: existing } = await db.from("profile").select("id").limit(1).maybeSingle();
    if (existing) return { ok: false, error: "A profile already exists. Reload the page to edit it." };
  }

  const { table, tag, key } = tables[entity];
  const query = id ? db.from(table).update(row).eq(key, id) : db.from(table).insert(row);
  const { data, error } = await query.select(key).single();
  if (error) {
    if (error.code === "23505") return bad(key === "slug" || "slug" in row ? "slug" : "name", "Another item already uses this slug");
    if (error.code === "23503" && referenceField[entity]) return bad(referenceField[entity]!, "That option no longer exists. Reload the page.");
    if (error.code === "PGRST116") return { ok: false, error: "Not found, or you are not allowed to change it." };
    return { ok: false, error: "Could not save. Try again." };
  }
  updateTag(tag);
  revalidatePath("/admin", "layout"); // also drops the browser's cached admin pages, so lists never show stale rows
  return { ok: true, id: (data as unknown as Record<string, string>)[key], slug: typeof row.slug === "string" ? row.slug : undefined };
}

export async function deleteEntity(entity: string, id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!isEntity(entity) || !tables[entity].deletable || !validKey(entity, id)) return { ok: false, error: "Can't delete this." };
  const db = await createClient();
  const { table, tag, key } = tables[entity];
  const { data, error } = await db.from(table).delete().eq(key, id).select(key);
  if (error?.code === "23503") return { ok: false, error: `It is still used by ${usedBy[entity] ?? "other items"}. Move them to another one first.` };
  if (error || !data?.length) return { ok: false, error: "Could not delete. It may already be gone." };
  updateTag(tag);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ─── several at once (the table's selection) ─────────────────────────────────────────────────────
export type BulkResult = { ok: true; message: string } | { ok: false; error: string };
const MAX_BULK = 200;
const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const NOUN: Partial<Record<EntityName, string>> = { post: "post", project: "project" };

/** Deletes the chosen rows in one go. Same checks as deleting one: admin, a deletable entity, valid keys, and the database's own references. */
export async function bulkDelete(entity: string, ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  if (!isEntity(entity) || !tables[entity].deletable) return { ok: false, error: "Can't delete these." };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BULK || !ids.every((i) => typeof i === "string" && validKey(entity, i))) return { ok: false, error: `Choose between 1 and ${MAX_BULK} items.` };
  const { table, tag, key } = tables[entity];
  const { data, error } = await (await createClient()).from(table).delete().in(key, ids).select(key);
  if (error?.code === "23503") return { ok: false, error: `Some are still used by ${usedBy[entity] ?? "other items"}. Move them first.` };
  if (error || !data?.length) return { ok: false, error: "Could not delete. They may already be gone." };
  updateTag(tag);
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Deleted ${plural(data.length, NOUN[entity] ?? "item")}.` };
}

/** Publish, move to draft or archive several posts or projects. A published one still waits for its own publish time. */
export async function bulkSetStatus(entity: string, ids: string[], status: string): Promise<BulkResult> {
  await requireAdmin();
  if (entity !== "post" && entity !== "project") return { ok: false, error: "Can't change these." };
  if (!["draft", "published", "archived"].includes(status)) return { ok: false, error: "Unknown status." };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BULK || !ids.every((i) => typeof i === "string" && z.uuid().safeParse(i).success)) return { ok: false, error: `Choose between 1 and ${MAX_BULK} items.` };
  const { table, tag } = tables[entity];
  const { data, error } = await (await createClient()).from(table).update({ status }).in("id", ids).select("id");
  if (error || !data?.length) return { ok: false, error: "Could not change them." };
  updateTag(tag);
  revalidatePath("/admin", "layout");
  const word = status === "published" ? "Published" : status === "archived" ? "Archived" : "Moved to draft:";
  return { ok: true, message: `${word} ${plural(data.length, NOUN[entity]!)}.` };
}
