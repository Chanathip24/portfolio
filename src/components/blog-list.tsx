"use client";

import { useLenis } from "lenis/react";
import { ArrowUpDown, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PostCard } from "@/components/blog-cards";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Post } from "@/lib/api/posts";
import { EASE } from "@/lib/constants";
import { PostSort } from "@/lib/enums";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 9; // a full 3 x 3 grid
const sortLabel: Record<PostSort, string> = { [PostSort.Latest]: "Latest", [PostSort.Views]: "Most viewed" };
const isSort = (v: string | null): v is PostSort => v === PostSort.Latest || v === PostSort.Views;

/** Page numbers to show: all of them when there are few, otherwise the ends and the neighbours of the current page. */
function pageWindow(page: number, pages: number): (number | "gap")[] {
  const keep = [...new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  keep.forEach((n, i) => {
    if (i && n - keep[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : out;
}

type Next = { category?: string | null; q?: string; sort?: PostSort; page?: number };

/**
 * The blog: a tab strip of categories, a search and a sort (latest or most viewed), a grid of posts nine to a page,
 * and pagination. Everything the reader chose lives in the URL (?category=data&q=money&sort=views&page=2), so a view
 * can be shared and survives a reload; the URL is the state.
 */
export function BlogList({ posts, categories }: { posts: Post[]; categories: { slug: string; name: string }[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const lenis = useLenis();
  const [sortOpen, setSortOpen] = useState(false); // radio items do not close their menu by themselves

  const rawCategory = params.get("category");
  const category = categories.some((c) => c.slug === rawCategory) ? rawCategory : null;
  const rawSort = params.get("sort");
  const sort = isSort(rawSort) ? rawSort : PostSort.Latest;
  const query = params.get("q")?.trim() ?? "";
  const requestedPage = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);

  const counts = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, posts.filter((p) => p.category === c.slug).length])), [posts, categories]);
  const pool = useMemo(() => {
    const needle = query.toLowerCase();
    const matches = posts.filter((p) => (!category || p.category === category) && (!needle || `${p.title} ${p.excerpt}`.toLowerCase().includes(needle)));
    return matches.sort(sort === PostSort.Views ? (a, b) => b.views - a.views : (a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }, [posts, category, query, sort]);

  const pages = Math.max(1, Math.ceil(pool.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const shown = pool.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hrefFor = (next: Next) => {
    const qs = new URLSearchParams(params.toString());
    const cat = "category" in next ? next.category : category;
    const q = "q" in next ? next.q : query;
    const s = next.sort ?? sort;
    if (cat) qs.set("category", cat);
    else qs.delete("category");
    if (q) qs.set("q", q);
    else qs.delete("q");
    if (s !== PostSort.Latest) qs.set("sort", s);
    else qs.delete("sort");
    // Changing the filter or the sort starts again from page 1.
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    else qs.delete("page");
    const str = qs.toString();
    return str ? `${pathname}?${str}` : pathname;
  };
  // replaceState: Next keeps useSearchParams in sync with it, without a navigation or a history entry per keystroke.
  const go = (next: Next) => history.replaceState(null, "", hrefFor(next));

  // When the reader changes page, category or sort, bring the top of the list back into view: a shorter list would
  // otherwise leave them looking at the footer. Typing in the search does not change this key, so the page stays
  // still while you type.
  const viewKey = `${category ?? ""}|${sort}|${page}`;
  const shownKey = useRef(viewKey);
  useEffect(() => {
    if (shownKey.current === viewKey) return;
    shownKey.current = viewKey;
    const el = document.getElementById("posts");
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    if (lenis) {
      lenis.resize(); // the page height may have just changed; Lenis clamps to the height it last measured
      lenis.scrollTo(top, { duration: 0.9 });
    } else window.scrollTo({ top, behavior: "smooth" });
  }, [viewKey, lenis]);

  const pageLink = (n: number) => ({
    href: hrefFor({ page: n }),
    role: "link" as const, // the shadcn Button would otherwise mark these anchors role="button"
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      go({ page: n });
    },
  });

  return (
    <>
      <div id="posts" className="mt-12 flex scroll-mt-24 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Tabs value={category ?? "all"} onValueChange={(v) => go({ category: v === "all" ? null : v })} className="min-w-0">
          <TabsList variant="line" aria-label="Filter by category" className="h-auto w-full justify-start gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] lg:w-auto [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="all" className="flex-none px-3 py-2.5 text-sm">
              All <span className="tabular-nums opacity-60">{posts.length}</span>
            </TabsTrigger>
            {categories.filter((c) => counts[c.slug] > 0).map((c) => (
              <TabsTrigger key={c.slug} value={c.slug} className="flex-none px-3 py-2.5 text-sm">
                {c.name} <span className="tabular-nums opacity-60">{counts[c.slug]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-3">
          <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" className="h-10 shrink-0 rounded-full px-4" />}>
              <ArrowUpDown aria-hidden className="size-4" strokeWidth={1.75} />
              {sortLabel[sort]}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => {
                  go({ sort: v as PostSort });
                  setSortOpen(false);
                }} aria-label="Sort posts">
                {Object.values(PostSort).map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>{sortLabel[s]}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <label className="relative block min-w-0 flex-1 lg:w-64 lg:flex-none">
            <span className="sr-only">Search posts</span>
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <input
              type="search"
              value={query}
              onChange={(e) => go({ q: e.target.value })}
              placeholder="Search posts"
              className="h-10 w-full rounded-full border border-border bg-transparent pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [&::-webkit-search-cancel-button]:hidden"
            />
          </label>
        </div>
      </div>

      <p aria-live="polite" className="mt-6 text-sm tabular-nums text-muted-foreground">
        {pool.length === 0 ? "0 posts" : `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + shown.length} of ${pool.length} ${pool.length === 1 ? "post" : "posts"}`}
        {category && <> in {categories.find((c) => c.slug === category)?.name}</>}
        {query && <> matching “{query}”</>}
        {sort === PostSort.Views && <> · most viewed first</>}
      </p>

      {pool.length === 0 ? (
        <div className="mt-10 max-w-md">
          <p className="text-xl font-medium">Nothing matches yet.</p>
          <p className="mt-2 text-muted-foreground">Try a shorter search, or look at every category.</p>
          <button type="button" onClick={() => go({ category: null, q: "" })} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background">
            <X aria-hidden className="size-4" strokeWidth={2} /> Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 sm:gap-y-14 lg:grid-cols-3">
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
                <PostCard post={p} query={query} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {pages > 1 && (
        <Pagination className="mt-16">
          <PaginationContent className="flex-wrap justify-center gap-1">
            <PaginationItem>
              <PaginationPrevious {...pageLink(page - 1)} aria-disabled={page === 1} className={cn("h-10", page === 1 && "pointer-events-none opacity-40")} tabIndex={page === 1 ? -1 : undefined} />
            </PaginationItem>
            {pageWindow(page, pages).map((n, i) => (
              <PaginationItem key={n === "gap" ? `gap-${i}` : n}>
                {n === "gap" ? <PaginationEllipsis /> : <PaginationLink {...pageLink(n)} isActive={n === page} aria-label={`Page ${n}`} className="size-10 text-sm">{n}</PaginationLink>}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext {...pageLink(page + 1)} aria-disabled={page === pages} className={cn("h-10", page === pages && "pointer-events-none opacity-40")} tabIndex={page === pages ? -1 : undefined} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
