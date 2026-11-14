import { getPost } from "@/lib/api/posts";
import { ogCard, ogSize } from "@/lib/og";

export const contentType = "image/png";

/** One image per post, described by the post's own title (read aloud as the preview's alt text). */
export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  return [{ id: "card", alt: post ? `${post.title}, blog post` : "Blog post", size: ogSize, contentType }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  return ogCard({ eyebrow: post ? `Blog · ${post.categoryName}` : "Blog", title: post?.title ?? "Post not found" });
}
