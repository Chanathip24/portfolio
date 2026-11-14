import { isAxiosError } from "axios";
import { cacheLife, cacheTag } from "next/cache";
import { PublishStatus } from "@/lib/enums";
import { api } from "./client";
import type { CategoriesResponse, CategoryRow, ProjectDetailRow, ProjectResponse, ProjectRow, ProjectsResponse } from "./types";

/** What the components use: camelCase, with the page link resolved and the categories as display names. */
export type WorkItem = {
  slug: string;
  title: string;
  client: string;
  tags: string[];
  summary: string;
  year: number;
  isSignature: boolean;
  liveUrl: string | null;
  previewUrl: string | null;
  image: string;
  href: string;
};

const isPublished = (p: Pick<ProjectRow, "status">) => p.status === PublishStatus.Published;

/** The work categories in the order the admin set. */
export async function getProjectCategories(): Promise<CategoryRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");
  const { data } = await api.get<CategoriesResponse>("/project-categories");
  return [...data.data].sort((a, b) => a.sort_order - b.sort_order);
}

const nameMap = (categories: CategoryRow[]) => new Map(categories.map((c) => [c.slug, c.name]));
const namesOf = (slugs: string[], names: Map<string, string>) => slugs.map((s) => names.get(s) ?? s);

const toItem = (p: ProjectRow, names: Map<string, string>): WorkItem => ({
  slug: p.slug,
  title: p.title,
  client: p.client,
  tags: namesOf(p.tags, names),
  summary: p.summary,
  year: new Date(p.published_at ?? p.created_at).getUTCFullYear(),
  isSignature: p.is_signature,
  liveUrl: p.live_url,
  previewUrl: p.preview_url,
  image: p.image_url,
  href: `/work/${p.slug}`,
});

async function getPublished() {
  const [{ data }, categories] = await Promise.all([api.get<ProjectsResponse>("/projects"), getProjectCategories()]);
  const names = nameMap(categories);
  return data.data.filter(isPublished).sort((a, b) => a.sort_order - b.sort_order).map((p) => toItem(p, names));
}

export async function getProjects() {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");
  return getPublished();
}

/** The home Work section: signature projects (large, stacked on the left) and one combined index of all
 *  the others (small, on the right), each in sort_order. `categories` are the display names in use, in the admin's order. */
export async function getWork() {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");
  const [items, categories] = await Promise.all([getPublished(), getProjectCategories()]);
  const used = new Set(items.flatMap((i) => i.tags));
  return {
    signature: items.filter((i) => i.isSignature),
    others: items.filter((i) => !i.isSignature),
    categories: categories.map((c) => c.name).filter((n) => used.has(n)),
  };
}

/** The full project (with its Tiptap body; `tags` are display names), or null when the slug doesn't exist or isn't published. */
export async function getProject(slug: string): Promise<ProjectDetailRow | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");
  try {
    const [{ data }, categories] = await Promise.all([api.get<ProjectResponse>(`/projects/${encodeURIComponent(slug)}`), getProjectCategories()]);
    return isPublished(data.data) ? { ...data.data, tags: namesOf(data.data.tags, nameMap(categories)) } : null;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

/** What sits around a project: up to three related ones (sharing a tag first, then in order), plus the
 *  previous and next project in sort_order. */
export async function getProjectNeighbors(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");
  const all = await getPublished();
  const i = all.findIndex((p) => p.slug === slug);
  const tags = new Set(all[i]?.tags ?? []);
  const others = all.filter((p) => p.slug !== slug);
  const shares = (p: WorkItem) => p.tags.some((t) => tags.has(t));
  const related = [...others.filter(shares), ...others.filter((p) => !shares(p))].slice(0, 3);
  return { related, prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
}
