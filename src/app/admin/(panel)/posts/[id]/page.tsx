import { BarChart3, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { EntityEditor } from "@/components/admin/entity-editor";
import { DeleteButton } from "@/components/admin/entity-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { HistoryButton } from "@/components/admin/revisions";
import { getCreator, getPostById, listRevisions, taxonomyOptions } from "@/lib/admin/data";
import { formatCount } from "@/lib/format";

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export const instant = false;

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const valid = z.uuid().safeParse(id).success;
  const [post, { category }, revisions, creator] = await Promise.all([valid ? getPostById(id) : null, taxonomyOptions(), valid ? listRevisions("posts", id) : [], valid ? getCreator("posts", id) : "-"]);
  if (!post) notFound();
  return (
    <>
      <PageHeader title={post.title || "Untitled"} back={{ label: "Blog posts", href: "/admin/posts" }} description={`${formatCount(post.views)} views · ${post.reading_minutes} min read · Created by ${creator}`}
        action={
          <div className="flex flex-wrap gap-2">
            <HistoryButton items={revisions} />
            <Button variant="outline" render={<Link href={`/admin/posts/${post.id}/stats`} />} nativeButton={false} role="link"><BarChart3 /> Analytics</Button>
            {post.status === "published" && <Button variant="outline" render={<a href={`/blog/${post.slug}`} target="_blank" rel="noopener" />} nativeButton={false} role="link"><ExternalLink /> View on site</Button>}
            <DeleteButton entity="post" id={post.id} name={post.title} redirectTo="/admin/posts" />
          </div>
        } />
      <EntityEditor entity="post" id={post.id} initial={post} submitLabel="Save changes" options={{ category }} />
    </>
  );
}
