import "server-only";
import { db } from "./core";
import type { Option } from "../fields";

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
