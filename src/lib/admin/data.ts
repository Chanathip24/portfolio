import "server-only";
import type { CareerRow, ProfileRow, SkillRow, TestimonialRow, ToolRow, SocialRow, ProjectDetailRow, PostDetailRow } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./auth";
import { allRows } from "./paging";
import type { Option } from "./fields";

/** Admin reads. Each one re-checks the admin and then queries as that user (RLS applies; drafts are visible). */
async function db() {
  await requireAdmin();
  return createClient();
}

/** published, scheduled (published but its time is still ahead), draft or archived: what the admin sees at a glance. */
export type Visibility = "live" | "scheduled" | "draft" | "archived";
export const visibilityOf = (status: string, publishedAt: string, now = Date.now()): Visibility =>
  status === "published" ? (new Date(publishedAt).getTime() > now ? "scheduled" : "live") : status === "archived" ? "archived" : "draft";

// ─── categories and groups ───────────────────────────────────────────────────────────────────────
export type TaxonomyKind = "postCategory" | "projectCategory" | "skillGroup";
export type TaxonomyRow = { slug: string; name: string; sort_order: number; used: number };
const taxonomyTable: Record<TaxonomyKind, string> = { postCategory: "post_categories", projectCategory: "project_categories", skillGroup: "skill_groups" };

/** The managed lists with how many posts / projects / skills use each entry. */
export async function listTaxonomy(kind: TaxonomyKind): Promise<TaxonomyRow[]> {
  const sb = await db();
  const { data } = await sb.from(taxonomyTable[kind]).select("slug,name,sort_order").order("sort_order").order("name");
  const rows = (data ?? []) as Omit<TaxonomyRow, "used">[];
  const used = new Map<string, number>();
  if (kind === "postCategory") for (const r of (await sb.from("posts").select("category")).data ?? []) used.set(r.category, (used.get(r.category) ?? 0) + 1);
  if (kind === "skillGroup") for (const r of (await sb.from("skills").select("group")).data ?? []) used.set(r.group, (used.get(r.group) ?? 0) + 1);
  if (kind === "projectCategory") for (const r of (await sb.from("projects").select("tags")).data ?? []) for (const t of r.tags as string[]) used.set(t, (used.get(t) ?? 0) + 1);
  return rows.map((r) => ({ ...r, used: used.get(r.slug) ?? 0 }));
}

/** The choices for the selects that come from the database. */
export async function taxonomyOptions(): Promise<Record<"category" | "tags" | "group", Option[]>> {
  const sb = await db();
  const read = async (table: string) => ((await sb.from(table).select("slug,name").order("sort_order").order("name")).data ?? []).map((r) => ({ value: r.slug as string, label: r.name as string }));
  const [category, tags, group] = await Promise.all([read("post_categories"), read("project_categories"), read("skill_groups")]);
  return { category, tags, group };
}

// ─── lists ───────────────────────────────────────────────────────────────────────────────────────
export type PostListRow = { id: string; slug: string; title: string; creator: string; category: string; categoryName: string; status: string; views: number; published_at: string; updated_at: string; visibility: Visibility };
export async function listPosts({ creators = true }: { creators?: boolean } = {}) {
  const sb = await db();
  const [data, cats, who] = await Promise.all([
    allRows((f, t) => sb.from("posts").select("id,slug,title,category,status,views,published_at,updated_at").order("published_at", { ascending: false }).order("id").range(f, t)),
    sb.from("post_categories").select("slug,name"),
    creators ? creatorsOf("posts") : new Map<string, string>(),
  ]);
  const names = new Map((cats.data ?? []).map((c) => [c.slug as string, c.name as string]));
  const now = Date.now();
  return ((data ?? []) as Omit<PostListRow, "categoryName" | "visibility" | "creator">[]).map((p) => ({ ...p, creator: who.get(p.id) ?? "-", categoryName: names.get(p.category) ?? p.category, visibility: visibilityOf(p.status, p.published_at, now) }));
}

export type ProjectListRow = { id: string; slug: string; title: string; creator: string; client: string; status: string; is_signature: boolean; sort_order: number; tags: string[]; tagNames: string[]; published_at: string; visibility: Visibility };
export async function listProjects({ creators = true }: { creators?: boolean } = {}) {
  const sb = await db();
  const [data, cats, who] = await Promise.all([
    allRows((f, t) => sb.from("projects").select("id,slug,title,client,status,is_signature,sort_order,tags,published_at").order("sort_order").order("id").range(f, t)),
    sb.from("project_categories").select("slug,name"),
    creators ? creatorsOf("projects") : new Map<string, string>(),
  ]);
  const names = new Map((cats.data ?? []).map((c) => [c.slug as string, c.name as string]));
  const now = Date.now();
  return ((data ?? []) as Omit<ProjectListRow, "tagNames" | "visibility" | "creator">[]).map((p) => ({ ...p, creator: who.get(p.id) ?? "-", tagNames: p.tags.map((t) => names.get(t) ?? t), visibility: visibilityOf(p.status, p.published_at, now) }));
}

export async function getPostById(id: string) {
  const { data } = await (await db()).from("posts").select("*").eq("id", id).maybeSingle();
  return data as Omit<PostDetailRow, "author"> | null;
}

export async function getProjectById(id: string) {
  const { data } = await (await db()).from("projects").select("*").eq("id", id).maybeSingle();
  return data as ProjectDetailRow | null;
}

export async function getProfileAdmin() {
  const { data } = await (await db()).from("profile").select("*, socials(*)").limit(1).maybeSingle();
  if (!data) return null;
  const row = data as ProfileRow;
  return { ...row, socials: [...row.socials].sort((a, b) => a.sort_order - b.sort_order) as SocialRow[] };
}

async function ordered<T>(table: string) {
  const { data } = await (await db()).from(table).select("*").order("sort_order");
  return (data ?? []) as T[];
}
export const listSkills = () => ordered<SkillRow>("skills");
export const listTools = () => ordered<ToolRow>("tools");
export const listCareer = () => ordered<CareerRow>("career");
export const listTestimonials = () => ordered<TestimonialRow>("testimonials");

// ─── overview ────────────────────────────────────────────────────────────────────────────────────
export type Analytics = {
  views: number;
  visitors: number;
  daily: { day: string; views: number; visitors: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  top_referrers: { referrer: string; views: number }[];
};
export async function getAnalytics(days: number) {
  const { data } = await (await db()).rpc("analytics_summary", { days });
  return data as Analytics | null;
}

export type ContentSummary = Record<Visibility, number> & { total: number };
/** Posts and projects by what a visitor can see: live, scheduled, draft, archived. */
export async function getContentSummary() {
  const sb = await db();
  const tally = (rows: { status: string; published_at: string }[] | null): ContentSummary => {
    const out: ContentSummary = { live: 0, scheduled: 0, draft: 0, archived: 0, total: 0 };
    const now = Date.now();
    for (const r of rows ?? []) { out[visibilityOf(r.status, r.published_at, now)]++; out.total++; }
    return out;
  };
  const [posts, projects] = await Promise.all([sb.from("posts").select("status,published_at"), sb.from("projects").select("status,published_at")]);
  return { posts: tally(posts.data), projects: tally(projects.data) };
}

export type AuditRow = { id: number; at: string; actor_email: string | null; action: "created" | "updated" | "deleted" | "event"; entity: string; entity_id: string | null; summary: string };
export type AuditFilter = { q?: string; action?: string; entity?: string; actor?: string; from?: string; to?: string; dir?: "asc" | "desc" };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Narrow an audit query by the filters. Free text matches the summary or the person; dates are whole days (UTC). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function narrow(q: any, f: AuditFilter) {
  if (f.action) q = q.eq("action", f.action);
  if (f.entity) q = q.eq("entity", f.entity);
  if (f.actor) q = f.actor === "system" ? q.is("actor_email", null) : q.eq("actor_email", f.actor);
  const text = f.q?.replace(/[,()%*\\]/g, " ").trim();
  if (text) q = q.or(`summary.ilike.%${text}%,actor_email.ilike.%${text}%`);
  if (f.from && DAY.test(f.from)) q = q.gte("at", `${f.from}T00:00:00Z`);
  if (f.to && DAY.test(f.to)) q = q.lt("at", new Date(Date.parse(`${f.to}T00:00:00Z`) + 864e5).toISOString());
  return q;
}
export async function listAudit({ limit = 12, offset = 0, ...f }: { limit?: number; offset?: number } & AuditFilter = {}) {
  const asc = f.dir === "asc";
  const { data, count } = await narrow((await db()).from("audit_log").select("*", { count: "exact" }), f)
    .order("at", { ascending: asc }).order("id", { ascending: asc }).range(offset, offset + limit - 1);
  return { rows: (data ?? []) as AuditRow[], total: (count ?? 0) as number };
}

export type AuditStats = {
  total: number;
  byAction: { key: string; label: string; value: number }[];
  byEntity: { name: string; value: number }[];
  byActor: { name: string; value: number }[];
  daily: Record<string, string | number>[];
  entities: string[];
  actors: string[];
};
const ACTIONS = ["created", "updated", "deleted", "event"] as const;
/** Counts for the activity charts, over the same filters. shortcut: counts the newest 5000 matching rows in the app (read a page at a time); move it into a SQL function if the log grows past that. */
export async function auditStats(f: AuditFilter): Promise<AuditStats> {
  const sb = await db();
  const [rows, { count }, facets] = await Promise.all([
    allRows<{ at: string; actor_email: string | null; action: string; entity: string }>((a, b) => narrow(sb.from("audit_log").select("at,actor_email,action,entity"), f).order("at", { ascending: false }).order("id").range(a, b), 5000),
    narrow(sb.from("audit_log").select("id", { count: "exact", head: true }), f),
    allRows((a, b) => sb.from("audit_log").select("actor_email,entity").order("id").range(a, b), 5000),
  ]);
  const tally = (key: (r: (typeof rows)[number]) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
    return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  };
  const end = f.to && DAY.test(f.to) ? new Date(`${f.to}T00:00:00Z`) : new Date();
  const start = f.from && DAY.test(f.from) ? new Date(`${f.from}T00:00:00Z`) : new Date(end.getTime() - 29 * 864e5);
  const span = Math.min(90, Math.max(1, Math.round((end.getTime() - start.getTime()) / 864e5) + 1));
  const days = Array.from({ length: span }, (_, i) => new Date(end.getTime() - (span - 1 - i) * 864e5).toISOString().slice(0, 10));
  const daily = days.map((day) => ({ day, ...Object.fromEntries(ACTIONS.map((a) => [a, 0])) })) as Record<string, string | number>[];
  const at = new Map(days.map((d, i) => [d, i]));
  for (const r of rows) { const i = at.get(r.at.slice(0, 10)); if (i !== undefined) (daily[i][r.action] as number)++; }
  const fr = facets as { actor_email: string | null; entity: string }[];
  return {
    total: count ?? 0,
    byAction: ACTIONS.map((a) => ({ key: a, label: a === "event" ? "Events" : a[0].toUpperCase() + a.slice(1), value: rows.filter((r) => r.action === a).length })),
    byEntity: tally((r) => r.entity),
    byActor: tally((r) => r.actor_email ?? "System"),
    daily,
    entities: [...new Set(fr.map((r) => r.entity))].sort(),
    actors: [...new Set(fr.map((r) => r.actor_email).filter((e): e is string => Boolean(e)))].sort(),
  };
}

export type SectionAnalytics = {
  views: number; visitors: number;
  daily: { day: string; views: number; visitors: number }[];
  top: { path: string; views: number; visitors: number }[];
  referrers: { referrer: string; views: number }[];
};
/** Views of a whole section ("/blog/" or "/work/") or of one page in it (`path`), over the last `days` days. */
export async function getSectionAnalytics(prefix: "/blog/" | "/work/", days: number, path?: string) {
  const { data } = await (await db()).rpc("section_analytics", { p_prefix: prefix, p_path: path ?? null, days });
  return data as SectionAnalytics | null;
}

/** Who created each post or project, from the audit log (rows made by the seed have no creator and fall back to "-"). */
async function creatorsOf(entity: "posts" | "projects") {
  const sb = await db();
  const data = await allRows((f, t) => sb.from("audit_log").select("entity_id,actor_email").eq("entity", entity).eq("action", "created").order("id").range(f, t));
  return new Map(data.map((r) => [r.entity_id as string, (r.actor_email as string | null) ?? "-"]));
}
export async function getCreator(entity: "posts" | "projects", id: string) {
  const { data } = await (await db()).from("audit_log").select("actor_email").eq("entity", entity).eq("action", "created").eq("entity_id", id).limit(1).maybeSingle();
  return (data?.actor_email as string | null) ?? "-";
}

export type VitalsSummary = {
  samples: number;
  metrics: { metric: string; n: number; p75: number; good: number; mid: number; poor: number }[];
  daily: { day: string; metric: string; p75: number; n: number }[];
  slow_pages: { path: string; p75: number; n: number }[];
  devices: { device: string; n: number }[];
};
export async function getPerformance(days: number) {
  const { data } = await (await db()).rpc("performance_summary", { days });
  return data as VitalsSummary | null;
}

export type MessageRow = { id: string; source: "contact" | "gmail" | "system"; kind: "message" | "security"; severity: "info" | "warning" | "critical"; from_name: string; from_email: string; subject: string; body: string; received_at: string; is_read: boolean; starred: boolean };
export async function listMessages(max = 5000) {
  const sb = await db();
  return (await allRows<MessageRow>((f, t) => sb.from("messages").select("id,source,kind,severity,from_name,from_email,subject,body,received_at,is_read,starred").order("received_at", { ascending: false }).order("id").range(f, t), max)).slice(0, max);
}
export async function unreadCount() {
  const { count } = await (await db()).from("messages").select("id", { count: "exact", head: true }).eq("is_read", false);
  return count ?? 0;
}

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

// ─── history (revisions) ─────────────────────────────────────────────────────────────────────────
export type RevisionRow = { id: number; entity: string; row_id: string; action: "updated" | "deleted"; label: string; actor_email: string | null; at: string; changed: string[] };
const PK: Record<string, string> = { post_categories: "slug", project_categories: "slug", skill_groups: "slug" };
const NOISE = new Set(["views", "updated_at"]);
/** The columns whose value differs between two versions of a row (not counting the view counter and the touch time). */
const differing = (a: Record<string, unknown>, b: Record<string, unknown> | null) =>
  b ? Object.keys({ ...a, ...b }).filter((k) => !NOISE.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k])) : [];

/** The saved versions of one item, newest first. Each says which fields it differs from the version after it (the next one, or what is live now). */
export async function listRevisions(entity: string, rowId: string, limit = 30): Promise<RevisionRow[]> {
  const sb = await db();
  const [{ data }, current] = await Promise.all([
    sb.from("revisions").select("id,entity,row_id,action,label,actor_email,at,data").eq("entity", entity).eq("row_id", rowId).order("at", { ascending: false }).order("id", { ascending: false }).limit(limit),
    sb.from(entity).select("*").eq(PK[entity] ?? "id", rowId).maybeSingle(),
  ]);
  const revs = (data ?? []) as (Omit<RevisionRow, "changed"> & { data: Record<string, unknown> })[];
  return revs.map(({ data: snapshot, ...r }, i) => ({ ...r, changed: differing(snapshot, i === 0 ? (current.data as Record<string, unknown> | null) : revs[i - 1].data) }));
}

/** Recent changes across the whole site, optionally only deletions or one kind of item. */
export async function listAllRevisions({ entity, action, limit = 50, offset = 0 }: { entity?: string; action?: "updated" | "deleted"; limit?: number; offset?: number }) {
  let q = (await db()).from("revisions").select("id,entity,row_id,action,label,actor_email,at", { count: "exact" });
  if (entity) q = q.eq("entity", entity);
  if (action) q = q.eq("action", action);
  const { data, count } = await q.order("at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + limit - 1);
  return { rows: ((data ?? []) as Omit<RevisionRow, "changed">[]).map((r) => ({ ...r, changed: [] as string[] })), total: count ?? 0 };
}
