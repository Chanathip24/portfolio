import { isAxiosError } from "axios";
import { cacheLife } from "next/cache";
import { PublishStatus, type ProjectTag } from "@/lib/enums";
import { api } from "./client";
import type { ProjectDetailRow, ProjectResponse, ProjectRow, ProjectsResponse } from "./types";

/** What the components use: camelCase, with the page link resolved. */
export type WorkItem = {
  slug: string;
  title: string;
  client: string;
  tags: ProjectTag[];
  summary: string;
  year: number;
  isSignature: boolean;
  liveUrl: string | null;
  previewUrl: string | null;
  image: string;
  href: string;
};

const isPublished = (p: Pick<ProjectRow, "status">) => p.status === PublishStatus.Published;

const toItem = (p: ProjectRow): WorkItem => ({
  slug: p.slug,
  title: p.title,
  client: p.client,
  tags: p.tags,
  summary: p.summary,
  year: new Date(p.created_at).getUTCFullYear(),
  isSignature: p.is_signature,
  liveUrl: p.live_url,
  previewUrl: p.preview_url,
  image: p.image_url,
  href: `/work/${p.slug}`,
});

async function getPublished() {
  const { data } = await api.get<ProjectsResponse>("/projects");
  return data.data.filter(isPublished).sort((a, b) => a.sort_order - b.sort_order).map(toItem);
}

export async function getProjects() {
  "use cache";
  cacheLife("hours");
  return getPublished();
}

/** The home Work section: signature projects (large, stacked on the left) and one combined index of all
 *  the others (small, on the right), each in sort_order. */
export async function getWork() {
  "use cache";
  cacheLife("hours");
  const items = await getPublished();
  return { signature: items.filter((i) => i.isSignature), others: items.filter((i) => !i.isSignature) };
}

/** The full project (with its Tiptap body), or null when the slug doesn't exist or isn't published. */
export async function getProject(slug: string): Promise<ProjectDetailRow | null> {
  "use cache";
  cacheLife("hours");
  try {
    const { data } = await api.get<ProjectResponse>(`/projects/${encodeURIComponent(slug)}`);
    return isPublished(data.data) ? data.data : null;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

/** What sits around a project: up to three related ones (sharing a tag first, then in order), plus the
 *  previous and next project in sort_order. */
export async function getProjectNeighbors(slug: string) {
  "use cache";
  cacheLife("hours");
  const all = await getPublished();
  const i = all.findIndex((p) => p.slug === slug);
  const tags = new Set(all[i]?.tags ?? []);
  const others = all.filter((p) => p.slug !== slug);
  const shares = (p: WorkItem) => p.tags.some((t) => tags.has(t));
  const related = [...others.filter(shares), ...others.filter((p) => !shares(p))].slice(0, 3);
  return { related, prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
}
