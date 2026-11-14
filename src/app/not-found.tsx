import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Any address that does not exist, and a post or project that is missing or not published. */
export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="page-x flex-1 pt-28 sm:pt-36">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-[clamp(2.75rem,6vw,4.75rem)] font-medium leading-[0.9] tracking-[-0.03em]">Page not found</h1>
        <p className="mt-4 max-w-[40ch] text-lg text-muted-foreground">That address does not exist. The page may have moved, or the post is not published yet.</p>
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/" className="underline underline-offset-4">Home</Link>
          <Link href="/blog" className="underline underline-offset-4">Blog</Link>
          <Link href="/about" className="underline underline-offset-4">About</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
