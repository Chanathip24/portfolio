import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/api/posts";
import { getProjects } from "@/lib/api/projects";
import { absolute } from "@/lib/site";

/** Every public page: the fixed ones, then each published post and project (drafts and scheduled items are never in the data this reads). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects] = await Promise.all([getPosts(), getProjects()]);
  return [
    { url: absolute("/"), priority: 1 },
    { url: absolute("/about"), priority: 0.7 },
    { url: absolute("/blog"), priority: 0.8, lastModified: posts[0]?.publishedAt },
    ...posts.map((p) => ({ url: absolute(`/blog/${p.slug}`), lastModified: p.publishedAt, priority: 0.6 })),
    ...projects.map((p) => ({ url: absolute(`/work/${p.slug}`), priority: 0.6 })),
  ];
}
