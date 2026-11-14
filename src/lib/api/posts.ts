import { isAxiosError } from "axios";
import { cacheLife, cacheTag } from "next/cache";
import { PublishStatus } from "@/lib/enums";
import { api } from "./client";
import type { CategoriesResponse, CategoryRow, PostDetailRow, PostResponse, PostRow, PostsResponse } from "./types";

/** What the components use: camelCase, dates as Date-safe ISO strings plus a ready label. */
export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  /** Slug of the category (what the URL filter uses) and its display name. */
  category: string;
  categoryName: string;
  minutes: number;
  image: string;
  publishedAt: string;
  views: number;
  author: { name: string; role: string; image: string | null };
};

const toPost = (p: PostRow, names: Map<string, string>): Post => ({
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  category: p.category,
  categoryName: names.get(p.category) ?? p.category,
  minutes: p.reading_minutes,
  image: p.image_url,
  publishedAt: p.published_at,
  views: p.views,
  author: { name: p.author.name, role: p.author.role, image: p.author.avatar_url },
});

/** The blog's categories in the order the admin set. */
export async function getPostCategories(): Promise<CategoryRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const { data } = await api.get<CategoriesResponse>("/post-categories");
  return [...data.data].sort((a, b) => a.sort_order - b.sort_order);
}

/** Published posts, newest first. A post scheduled for later is not in the list until its time (the database hides it). */
export async function getPosts() {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const [{ data }, categories] = await Promise.all([api.get<PostsResponse>("/posts"), getPostCategories()]);
  const names = new Map(categories.map((c) => [c.slug, c.name]));
  return data.data
    .filter((p) => p.status === PublishStatus.Published)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .map((p) => toPost(p, names));
}

/** The full post (with its Tiptap body), or null when the slug doesn't exist or isn't published. */
export async function getPost(slug: string): Promise<(PostDetailRow & { categoryName: string }) | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  try {
    const [{ data }, categories] = await Promise.all([api.get<PostResponse>(`/posts/${encodeURIComponent(slug)}`), getPostCategories()]);
    if (data.data.status !== PublishStatus.Published) return null;
    return { ...data.data, categoryName: categories.find((c) => c.slug === data.data.category)?.name ?? data.data.category };
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

/** What sits around a post: up to three related posts (same category first, then newest), plus the
 *  next newer and next older post in date order. */
export async function getPostNeighbors(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const all = await getPosts();
  const i = all.findIndex((p) => p.slug === slug);
  const category = all[i]?.category;
  const others = all.filter((p) => p.slug !== slug);
  const related = [...others.filter((p) => p.category === category), ...others.filter((p) => p.category !== category)].slice(0, 3);
  return { related, newer: all[i - 1] ?? null, older: all[i + 1] ?? null };
}
