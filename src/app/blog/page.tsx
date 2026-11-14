import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogList } from "@/components/blog-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { notes } from "@/content/site";
import { getPostCategories, getPosts } from "@/lib/api/posts";

export const metadata: Metadata = {
  title: "Blog · Your Name",
  description: notes.blurb,
};

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([getPosts(), getPostCategories()]);
  return (
    <>
      <SiteNav />
      <main className="page-x flex-1 pt-28 sm:pt-36">
        <h1 className="text-[clamp(2.75rem,6vw,4.75rem)] font-medium leading-[0.9] tracking-[-0.03em]">Blog</h1>
        <p className="mt-4 max-w-[40ch] text-lg text-muted-foreground">{notes.blurb}</p>
        <Suspense fallback={<p className="mt-12 text-muted-foreground">Loading posts…</p>}>
          <BlogList posts={posts} categories={categories} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
