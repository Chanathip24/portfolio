import { notFound } from "next/navigation";
import { z } from "zod";
import { ItemStats, RANGES } from "@/components/admin/item-stats";
import { getCreator, getPostById, getSectionAnalytics, visibilityOf } from "@/lib/admin/data";
import { formatCount } from "@/lib/format";

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export const instant = false;

export default async function PostStats({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const [{ id }, { range }] = await Promise.all([params, searchParams]);
  const post = z.uuid().safeParse(id).success ? await getPostById(id) : null;
  if (!post) notFound();
  const days = RANGES.includes(Number(range)) ? Number(range) : 30;
  const [stats, creator] = await Promise.all([getSectionAnalytics("/blog/", days, `/blog/${post.slug}`), getCreator("posts", post.id)]);
  return (
    <ItemStats noun="post" listLabel="Blog posts" listHref="/admin/posts" base={`/admin/posts/${post.id}/stats`} editHref={`/admin/posts/${post.id}`} publicHref={`/blog/${post.slug}`}
      title={post.title} visibility={visibilityOf(post.status, post.published_at)} publishedAt={post.published_at} creator={creator} stats={stats} days={days}
      facts={[["Category", post.category]]}
      tiles={[{ label: "Views, all time", value: formatCount(post.views) }, { label: "Reading time", value: `${post.reading_minutes} min` }]} />
  );
}
