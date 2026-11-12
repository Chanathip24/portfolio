import { cacheLife } from "next/cache";
import { type PostCategory, PublishStatus } from "@/lib/enums";
import { api } from "./client";
import type { PostRow, PostsResponse } from "./types";

/** What the components use: camelCase, dates as Date-safe ISO strings plus a ready label. */
export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  minutes: number;
  image: string;
  publishedAt: string;
};

const toPost = (p: PostRow): Post => ({
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  category: p.category,
  minutes: p.reading_minutes,
  image: p.image_url,
  publishedAt: p.published_at,
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
