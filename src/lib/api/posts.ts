import { isAxiosError } from "axios";
import { cacheLife } from "next/cache";
import { type PostCategory, PublishStatus } from "@/lib/enums";
import { api } from "./client";
import type { PostDetailRow, PostResponse, PostRow, PostsResponse } from "./types";

/** What the components use: camelCase, dates as Date-safe ISO strings plus a ready label. */
export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  minutes: number;
  image: string;
  publishedAt: string;
  views: number;
  author: { name: string; role: string; image: string | null };
};

const toPost = (p: PostRow): Post => ({
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  category: p.category,
  minutes: p.reading_minutes,
  image: p.image_url,
  publishedAt: p.published_at,
  views: p.views,
  author: { name: p.author.name, role: p.author.role, image: p.author.avatar_url },
});

/** Published posts, newest first. */
export async function getPosts() {
  "use cache";
  cacheLife("hours");
  const { data } = await api.get<PostsResponse>("/posts");
  return data.data
    .filter((p) => p.status === PublishStatus.Published)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .map(toPost);
}

/** The full post (with its Tiptap body), or null when the slug doesn't exist or isn't published. */
export async function getPost(slug: string): Promise<PostDetailRow | null> {
  "use cache";
  cacheLife("hours");
  try {
    const { data } = await api.get<PostResponse>(`/posts/${encodeURIComponent(slug)}`);
    return data.data.status === PublishStatus.Published ? data.data : null;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

/** What sits around a post: up to three related posts (same category first, then newest), plus the
 *  next newer and next older post in date order. */
export async function getPostNeighbors(slug: string) {
  "use cache";
  cacheLife("hours");
  const all = await getPosts();
  const i = all.findIndex((p) => p.slug === slug);
  const category = all[i]?.category;
  const others = all.filter((p) => p.slug !== slug);
  const related = [...others.filter((p) => p.category === category), ...others.filter((p) => p.category !== category)].slice(0, 3);
  return { related, newer: all[i - 1] ?? null, older: all[i + 1] ?? null };
}
