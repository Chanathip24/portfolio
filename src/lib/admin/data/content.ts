import "server-only";
import type { CareerRow, ProfileRow, SkillRow, TestimonialRow, ToolRow, SocialRow, ProjectDetailRow, PostDetailRow } from "@/lib/api/types";
import { db, visibilityOf, type Visibility } from "./core";
import { allRows } from "../paging";

const POST_COLUMNS = "id,slug,title,category,status,views,published_at,updated_at";
const PROJECT_COLUMNS = "id,slug,title,client,status,is_signature,sort_order,tags,published_at";

// ─── lists ───────────────────────────────────────────────────────────────────────────────────────
export type PostListRow = { id: string; slug: string; title: string; creator: string; category: string; categoryName: string; status: string; views: number; published_at: string; updated_at: string; visibility: Visibility };
export async function listPosts({ creators = true }: { creators?: boolean } = {}) {
  const sb = await db();
  const [data, cats, who] = await Promise.all([
    allRows((f, t) => sb.from("posts").select(POST_COLUMNS).order("published_at", { ascending: false }).order("id").range(f, t)),
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
    allRows((f, t) => sb.from("projects").select(PROJECT_COLUMNS).order("sort_order").order("id").range(f, t)),
    sb.from("project_categories").select("slug,name"),
    creators ? creatorsOf("projects") : new Map<string, string>(),
  ]);
  const names = new Map((cats.data ?? []).map((c) => [c.slug as string, c.name as string]));
  const now = Date.now();
  return ((data ?? []) as Omit<ProjectListRow, "tagNames" | "visibility" | "creator">[]).map((p) => ({ ...p, creator: who.get(p.id) ?? "-", tagNames: p.tags.map((t) => names.get(t) ?? t), visibility: visibilityOf(p.status, p.published_at, now) }));
}

/** What a stats page shows about a post: everything but the body, which can be large. */
export async function getPostSummary(id: string) {
  const { data } = await (await db()).from("posts").select(`${POST_COLUMNS},reading_minutes`).eq("id", id).maybeSingle();
  return data as Pick<PostDetailRow, "id" | "slug" | "title" | "category" | "status" | "views" | "published_at" | "updated_at" | "reading_minutes"> | null;
}

export async function getPostById(id: string) {
  const { data } = await (await db()).from("posts").select("*").eq("id", id).maybeSingle();
  return data as Omit<PostDetailRow, "author"> | null;
}

export async function getProjectSummary(id: string) {
  const { data } = await (await db()).from("projects").select(PROJECT_COLUMNS).eq("id", id).maybeSingle();
  return data as Pick<ProjectDetailRow, "id" | "slug" | "title" | "client" | "status" | "is_signature" | "sort_order" | "tags" | "published_at"> | null;
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
