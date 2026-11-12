"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo } from "react";
import { SiteImage } from "@/components/ui/site-image";
import type { Post } from "@/lib/api/posts";
import { EASE } from "@/lib/constants";
import { PostCategory } from "@/lib/enums";
import { formatDate, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const categories = Object.values(PostCategory);
const isCategory = (v: string | null): v is PostCategory => categories.includes(v as PostCategory);

/** Wraps each match of `query` in <mark>. */
function Marked({ text, query }: { text: string; query: string }) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "i"));
  return parts.map((part, i) =>
    i % 2 ? <mark key={i} className="rounded-sm bg-brand/25 text-inherit">{part}</mark> : <Fragment key={i}>{part}</Fragment>,
  );
}

/**
 * Every post, filtered by category and a text search. The filters live in the URL
 * (?category=data&q=money) so a filtered view can be shared and survives a reload; the URL is the state.
 */
export function BlogList({ posts }: { posts: Post[] }) {
  const params = useSearchParams();
  const raw = params.get("category");
  const category = isCategory(raw) ? raw : null;
  const query = params.get("q")?.trim() ?? "";

  // replaceState: Next keeps useSearchParams in sync with it, without a navigation or a history entry per keystroke.
  const setFilters = (next: { category?: PostCategory | null; q?: string }) => {
    const url = new URL(location.href);
    const cat = "category" in next ? next.category : category;
    const q = "q" in next ? next.q : query;
    if (cat) url.searchParams.set("category", cat);
    else url.searchParams.delete("category");
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
  };

  const counts = useMemo(() => Object.fromEntries(categories.map((c) => [c, posts.filter((p) => p.category === c).length])), [posts]);
  const shown = useMemo(() => {
    const needle = query.toLowerCase();
    return posts.filter((p) => (!category || p.category === category) && (!needle || `${p.title} ${p.excerpt}`.toLowerCase().includes(needle)));
  }, [posts, category, query]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
      active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
    );

  return (
    <>
      <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!category} onClick={() => setFilters({ category: null })} className={chip(!category)}>
            All <span className="tabular-nums opacity-60">{posts.length}</span>
          </button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setFilters({ category: category === c ? null : c })} className={chip(category === c)}>
              {titleCase(c)} <span className="tabular-nums opacity-60">{counts[c]}</span>
            </button>
          ))}
        </div>
        <label className="relative block md:w-72">
          <span className="sr-only">Search posts</span>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <input
            type="search"
            value={query}
            onChange={(e) => setFilters({ q: e.target.value })}
            placeholder="Search posts"
            className="h-10 w-full rounded-full border border-border bg-transparent pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      </div>

      <p aria-live="polite" className="mt-6 text-sm tabular-nums text-muted-foreground">
        {shown.length} {shown.length === 1 ? "post" : "posts"}
        {category && <> in {titleCase(category)}</>}
        {query && <> matching “{query}”</>}
      </p>

      {shown.length === 0 ? (
        <div className="mt-10 max-w-md">
          <p className="text-xl font-medium">Nothing matches yet.</p>
          <p className="mt-2 text-muted-foreground">Try a shorter search, or look at every category.</p>
          <button type="button" onClick={() => setFilters({ category: null, q: "" })} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background">
            <X aria-hidden className="size-4" strokeWidth={2} /> Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((p) => (
              <motion.li
                key={p.slug}
                id={p.slug}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="scroll-mt-28"
              >
                <article className="group rounded-2xl">
                  <span className="block overflow-hidden rounded-2xl bg-tile">
                    <SiteImage
                      src={p.image}
                      alt=""
                      width={720}
                      height={540}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                      className="aspect-[4/3] w-full object-cover transition-[scale] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    />
                  </span>
                  <p className="mt-4 text-sm text-muted-foreground">
                    <span className="text-foreground">{titleCase(p.category)}</span> · <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time> · {p.minutes} min read
                  </p>
                  <h2 className="mt-2 font-display text-3xl italic leading-[1] tracking-[-0.02em]"><Marked text={p.title} query={query} /></h2>
                  <p className="mt-3 max-w-[48ch] text-muted-foreground"><Marked text={p.excerpt} query={query} /></p>
                </article>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}
