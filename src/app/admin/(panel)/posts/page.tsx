import { Plus } from "lucide-react";
import Link from "next/link";
import { ContentList } from "@/components/admin/content-list";
import { PageHeader } from "@/components/admin/page-header";
import { SectionInsights } from "@/components/admin/section-insights";
import { Button } from "@/components/ui/button";
import { getSectionAnalytics, listPosts } from "@/lib/admin/data";
import { formatCount } from "@/lib/format";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
const DAYS = 30;

export default async function PostsPage() {
  const [posts, stats] = await Promise.all([listPosts(), getSectionAnalytics("/blog/", DAYS)]);
  const live = posts.filter((p) => p.visibility === "live");
  const total = posts.reduce((n, p) => n + p.views, 0);
  return (
    <>
      <PageHeader title="Blog posts" description="Write, edit and publish. Only published posts appear on the site. Open a post to see how it is read."
        action={<Button render={<Link href="/admin/posts/new" />} nativeButton={false} role="link"><Plus /> New post</Button>} />
      <div className="flex flex-col gap-4">
        <SectionInsights noun="post" plural="posts" prefix="/blog/" adminBase="/admin/posts" stats={stats} days={DAYS} groupTitle="Live posts by category"
          items={posts.map((p) => ({ id: p.id, slug: p.slug, visibility: p.visibility, groups: [p.categoryName] }))}
          extra={{ label: "Views, all time", value: formatCount(total), note: live.length ? `${Math.round(total / live.length)} per live post` : undefined }} />
        <div className="order-3 lg:order-4"><ContentList kind="post" rows={posts} /></div>
      </div>
    </>
  );
}
