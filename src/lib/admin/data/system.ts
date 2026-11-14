import "server-only";
import { db } from "./core";

export type AdminStatusRow = { user_id: string; email: string; last_sign_in_at: string | null; created_at: string; mfa_enabled: boolean };
export async function getAdminStatus() {
  const { data } = await (await db()).rpc("admin_status");
  return (data ?? []) as AdminStatusRow[];
}

// ─── settings ────────────────────────────────────────────────────────────────────────────────────
export async function getSettings() {
  const { data } = await (await db()).from("app_settings").select("data_tools_enabled").limit(1).maybeSingle();
  return { dataToolsEnabled: Boolean(data?.data_tools_enabled) };
}

// ─── in-app data tools (read-only table browser, media library) ──────────────────────────────────
/** The only tables the browser will show. Auth tables are never in it. */
export const BROWSABLE = [
  "posts", "projects", "post_categories", "project_categories", "skill_groups", "skills", "tools", "career", "testimonials", "socials", "profile", "authors", "page_views", "audit_log", "app_settings",
] as const;
export type BrowsableTable = (typeof BROWSABLE)[number];
export const isBrowsable = (t: string): t is BrowsableTable => (BROWSABLE as readonly string[]).includes(t);

export const PAGE_SIZE_DATA = 25;
/** One page of a table, optionally ordered by a column (a name made of letters and underscores; an unknown one is ignored). */
export async function browseTable(table: BrowsableTable, page: number, size = PAGE_SIZE_DATA, sort?: string, dir: "asc" | "desc" = "asc") {
  const sb = await db();
  const from = (Math.max(1, page) - 1) * size;
  const query = (order?: string) => {
    const q = sb.from(table).select("*", { count: "exact" });
    return (order ? q.order(order, { ascending: dir === "asc" }) : q).range(from, from + size - 1);
  };
  let res = await query(sort && /^[a-z_]{1,40}$/.test(sort) ? sort : undefined);
  if (res.error && sort) res = await query(); // not a column of this table
  return { rows: (res.data ?? []) as Record<string, unknown>[], total: res.count ?? 0 };
}

export type MediaFile = { path: string; url: string; size: number; created_at: string };
/** Every file in the public `media` bucket, newest first (files live in a folder per year). */
export async function listMedia(): Promise<MediaFile[]> {
  const sb = await db();
  const store = sb.storage.from("media");
  /** Storage lists a page at a time (100 by default), so keep asking until a short page comes back. */
  const listAll = async (path: string) => {
    const items: Awaited<ReturnType<typeof store.list>>["data"] = [];
    for (let offset = 0; offset < 20_000; offset += 1000) {
      const { data } = await store.list(path, { limit: 1000, offset });
      items.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return items ?? [];
  };
  const root = await listAll("");
  const found: MediaFile[] = [];
  const add = (prefix: string, items: { name: string; id: string | null; created_at?: string | null; metadata?: { size?: number } | null }[]) => {
    for (const it of items) if (it.id) found.push({ path: prefix + it.name, url: store.getPublicUrl(prefix + it.name).data.publicUrl, size: it.metadata?.size ?? 0, created_at: it.created_at ?? "" });
  };
  add("", root);
  for (const folder of root.filter((r) => !r.id)) add(`${folder.name}/`, await listAll(folder.name));
  return found.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
