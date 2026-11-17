import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { BlogList } from "@/components/blog-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { notes } from "@/content/site";
import { postsState } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Blog · Your Name",
  description: notes.blurb,
};

export default async function BlogPage() {
  const state = await postsState();
  return (
    <>
      <SiteNav />
      <main className="page-x flex-1 pt-28 sm:pt-36">
        <h1 className="text-[clamp(2.75rem,6vw,4.75rem)] font-medium leading-[0.9] tracking-[-0.03em]">Blog</h1>
        <p className="mt-4 max-w-[40ch] text-lg text-muted-foreground">{notes.blurb}</p>
        <Suspense fallback={<p className="mt-12 text-muted-foreground">Loading posts…</p>}>
          <HydrationBoundary state={state}>
            <BlogList />
          </HydrationBoundary>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
