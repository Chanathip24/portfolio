import { notFound } from "next/navigation";
import { DetailLayout } from "@/components/detail-layout";
import { getPost, getPostNeighbors, getPosts } from "@/lib/api/posts";
import { formatCount, formatDate, titleCase } from "@/lib/format";

export const instant = false;

export async function generateStaticParams() {
  return (await getPosts()).map(({ slug }) => ({ slug }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const { related, newer, older } = await getPostNeighbors(slug);
  const edited = post.updated_at.slice(0, 10) !== post.published_at.slice(0, 10);

  return (
    <DetailLayout
      section={{ label: "Blog", href: "/blog" }}
      title={post.title}
      summary={post.excerpt}
      author={{ name: post.author.name, role: post.author.role, bio: post.author.bio, image: post.author.avatar_url, href: post.author.profile_href }}
      tags={[titleCase(post.category)]}
      tagsLabel="Post category"
      facts={[
        { label: "Published", value: formatDate(post.published_at) },
        ...(edited ? [{ label: "Updated", value: formatDate(post.updated_at) }] : []),
        { label: "Reading time", value: `${post.reading_minutes} min read` },
        { label: "Views", value: formatCount(post.views) },
      ]}
      image={{ src: post.image_url, alt: `${post.title} cover` }}
      body={post.body}
      adjacent={{
        prev: older && { href: `/blog/${older.slug}`, title: older.title, label: "Older post" },
        next: newer && { href: `/blog/${newer.slug}`, title: newer.title, label: "Newer post" },
      }}
      related={{
        heading: "Keep reading",
        items: related.map((p) => ({ href: `/blog/${p.slug}`, title: p.title, meta: `${titleCase(p.category)} · ${p.minutes} min read`, image: p.image })),
      }}
    />
  );
}
