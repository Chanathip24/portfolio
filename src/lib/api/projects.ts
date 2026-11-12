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
