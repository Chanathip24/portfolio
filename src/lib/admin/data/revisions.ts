import "server-only";
import { db } from "./core";

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
