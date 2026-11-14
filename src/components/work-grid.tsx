"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ProjectPreview } from "@/components/project-preview";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SiteImage } from "@/components/ui/site-image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "next-view-transitions";
import type { WorkItem } from "@/lib/api/projects";
import { EASE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
 * Behaviour measured on the reference:
 * - Entrance: each card flies in once, from 300px lower at 1.5x scale, over 1.8s
 *   (ease-out-expo), staggered.
 * - Hover: the card itself stays put; the image inside zooms to 1.06, clipped by
 *   the card's rounded frame. Pressed: the card dips to 0.98.
 * - Lead card arrow: swaps out (up-right) as a fresh one slides in (from
 *   down-left) on a 600ms ease-in-out.
 */
const SWAP = "duration-[600ms] ease-[cubic-bezier(0.77,0,0.175,1)]";
const revealedCards = new Set<string>();

function Flow({ id, i, className, children }: { id: string; i: number; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce || revealedCards.has(id) ? false : { opacity: 0, y: 300, scale: 1.5 }}
      onViewportEnter={() => revealedCards.add(id)}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type Open = (item: WorkItem) => void;
const plainClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
/** A plain click opens the preview; a modified click (new tab, new window) still follows the link to the project page. */
const opener = (open: Open, item: WorkItem) => (e: React.MouseEvent) => {
  if (!plainClick(e)) return;
  e.preventDefault();
  open(item);
};

type TagFilter = string;

/**
 * The Work section: a tag filter, the signature projects (large, stacked on the left) and one index of the others (small,
 * on the right). Clicking any project opens a live preview in a dialog instead of leaving the page; from there the visitor
 * goes to the project's detail page or to the project itself.
 */
export function WorkShowcase({ signature, others, categories }: { signature: WorkItem[]; others: WorkItem[]; categories: string[] }) {
  const [tag, setTag] = useState<TagFilter>("all");
  const [preview, setPreview] = useState<WorkItem | null>(null);
  // The home page stays mounted, with its state, while you are on another page, so without this a dialog left open
  // would still be open when you came Back. Effect cleanup runs when the page is left, however that happens.
  useEffect(() => () => setPreview(null), []);

  const everything = [...signature, ...others];
  const tags = categories
    .map((t) => ({ tag: t, count: everything.filter((i) => i.tags.includes(t)).length }))
    .filter((t) => t.count > 0);
  const shows = (i: WorkItem) => tag === "all" || i.tags.includes(tag);
  const sig = signature.filter(shows);
  const rest = others.filter(shows);

  // The layout follows what is left: both groups side by side, signatures alone in two columns, or the index alone.
  const both = sig.length > 0 && rest.length > 0;
  const gridClass = both ? "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : sig.length > 0 ? "sm:grid-cols-2" : "";

  return (
    <>
      <Tabs value={tag} onValueChange={(v) => setTag(v as TagFilter)} className="mb-10 min-w-0">
        <TabsList variant="line" aria-label="Filter projects by tag" className="h-auto w-full justify-start gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="all" className="flex-none px-3 py-2.5 text-sm">
            All <span className="tabular-nums opacity-60">{everything.length}</span>
          </TabsTrigger>
          {tags.map((t) => (
            <TabsTrigger key={t.tag} value={t.tag} className="flex-none px-3 py-2.5 text-sm">
              {t.tag} <span className="tabular-nums opacity-60">{t.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className={cn("dim-others grid min-w-0 grid-cols-[minmax(0,1fr)] gap-14", gridClass)}>
        {sig.length > 0 && (
          <div className={cn(both ? "space-y-16" : "contents")}>
            {sig.map((item, i) => (
              <Flow key={item.slug} id={item.slug} i={0}>
                <Lead item={item} priority={i === 0} onOpen={setPreview} />
              </Flow>
            ))}
          </div>
        )}
        {rest.length > 0 && (
          // One index for every other project; beside the signature projects it stays in view as they scroll past (tall
          // viewports only: taller than the screen, it would hide its last rows).
          <div className={cn("min-w-0 lg:self-start", both && "[@media(min-height:56rem)]:lg:sticky [@media(min-height:56rem)]:lg:top-24", !both && sig.length === 0 && "max-w-3xl")}>
            <ProjectIndex rowId="more" items={rest} onOpen={setPreview} />
          </div>
        )}
      </div>

      <ProjectPreview item={preview} onClose={() => setPreview(null)} />
    </>
  );
}

/*
 * The non-signature projects as an index: a thumbnail, the title, who it was for and when. The text is
 * the point, the thumbnail only a hint. Two variants share the data and swap on input type:
 * - with a mouse, each row is a link and hovering opens a preview card (image, summary, tags);
 * - on touch there is no hover, so a row is a button: tap it to unfold the same preview in place, tap
 *   "Open project" to go. One row is open at a time.
 */
function ProjectIndex({ rowId, items, onOpen }: { rowId: string; items: WorkItem[]; onOpen: Open }) {
  return (
    <div className="min-w-0 lg:self-start">
      <h3 className="flex items-baseline justify-between border-b border-border pb-3 text-sm text-muted-foreground">
        <span>More projects</span>
        <span className="tabular-nums">{items.length}</span>
      </h3>
      <HoverList items={items} onOpen={onOpen} />
      <TouchList rowId={rowId} items={items} onOpen={onOpen} />
    </div>
  );
}

const rowReveal = (i: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -6% 0px" },
  transition: { duration: 0.9, delay: i * 0.07, ease: EASE },
});

function Tags({ tags }: { tags: WorkItem["tags"] }) {
  if (!tags.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
      {tags.map((t) => <li key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs">{t}</li>)}
    </ul>
  );
}

/** The categories as small chips, shown in the row itself so they do not depend on hovering. */
function TagChips({ tags }: { tags: WorkItem["tags"] }) {
  if (!tags.length) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">{t}</span>
      ))}
    </span>
  );
}

function HoverList({ items, onOpen }: { items: WorkItem[]; onOpen: Open }) {
  return (
    <ul className="hidden can-hover:block">
      {items.map((w, i) => (
        <motion.li key={w.slug} {...rowReveal(i)} className="border-b border-border/70">
          <HoverCard>
            <HoverCardTrigger
              closeDelay={80}
              render={<Link href={w.href} onClick={opener(onOpen, w)} aria-haspopup="dialog" aria-label={`Preview ${w.title} (${w.client})`} className="dim-item group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-4 no-underline focus-visible:outline-offset-[-2px]" />}
            >
              <span className="block overflow-hidden rounded-xl bg-tile">
                <SiteImage src={w.image} alt="" width={144} height={108} sizes="72px"
                  className="aspect-[4/3] w-full object-cover transition-[scale] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
              </span>
              <span className="min-w-0 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1">
                <span className="block truncate text-lg font-medium leading-tight">{w.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{w.client} · {w.year}</span>
                <TagChips tags={w.tags} />
              </span>
              <ArrowUpRight aria-hidden strokeWidth={2} className={cn("size-5 -translate-x-2 translate-y-2 opacity-0 transition-[translate,opacity] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100", SWAP)} />
            </HoverCardTrigger>
            <HoverCardContent side="bottom" align="end" sideOffset={6} className="w-80 p-3">
              <span className="block overflow-hidden rounded-lg bg-tile">
                <SiteImage src={w.image} alt="" width={640} height={480} sizes="320px" className="aspect-[4/3] w-full object-cover" />
              </span>
              <p className="mt-3 text-sm text-muted-foreground">{w.summary}</p>
              <div className="mt-3"><Tags tags={w.tags} /></div>
            </HoverCardContent>
          </HoverCard>
        </motion.li>
      ))}
    </ul>
  );
}

function TouchList({ rowId, items, onOpen }: { rowId: string; items: WorkItem[]; onOpen: Open }) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (slug: string) => {
    setOpen((cur) => (cur === slug ? null : slug));
    navigator.vibrate?.(6); // a small tick where the device allows it
  };
  return (
    <ul className="can-hover:hidden">
      {items.map((w, i) => {
        const isOpen = open === w.slug;
        const panel = `${rowId}-${w.slug}-panel`;
        return (
          <motion.li key={w.slug} {...rowReveal(i)} className="border-b border-border/70">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panel}
              onClick={() => toggle(w.slug)}
              className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 text-left"
            >
              <span className="min-w-0">
                <span className="block text-lg font-medium leading-tight">{w.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{w.client} · {w.year}</span>
                <TagChips tags={w.tags} />
              </span>
              <Plus aria-hidden strokeWidth={2} className={cn("size-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]", isOpen && "rotate-45")} />
            </button>
            <div id={panel} inert={!isOpen} className={cn("grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                <div className="pb-5">
                  <span className={cn("block overflow-hidden rounded-xl bg-tile transition-[clip-path] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]", isOpen ? "[clip-path:inset(0_0_0_0_round_0.75rem)]" : "[clip-path:inset(0_0_100%_0_round_0.75rem)]")}>
                    <SiteImage src={w.image} alt="" width={800} height={600} sizes="100vw" className="aspect-[4/3] w-full object-cover" />
                  </span>
                  <p className="mt-3 text-base text-muted-foreground">{w.summary}</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => onOpen(w)} aria-haspopup="dialog" className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background">
                      Preview <ArrowUpRight aria-hidden className="size-4" strokeWidth={2} />
                    </button>
                    <Link href={w.href} className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium no-underline">
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}

function Lead({ item, priority, onOpen }: { item: WorkItem; priority: boolean; onOpen: Open }) {
  return (
    <Link href={item.href} onClick={opener(onOpen, item)} aria-haspopup="dialog" className="dim-item group block rounded-[1.75rem] no-underline">
      <span className="relative block overflow-hidden rounded-[1.75rem] bg-tile transition-transform duration-300 group-active:scale-[0.98]">
          <SiteImage src={item.image} alt="" width={1400} height={1000} sizes="100vw" priority={priority}
            className="aspect-[7/5] w-full object-cover transition-[scale] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]" />
        <span aria-hidden className="absolute right-4 top-4 size-10 overflow-hidden rounded-full bg-foreground text-background">
          <ArrowUpRight strokeWidth={2} className={cn("absolute inset-0 m-auto size-5 transition-transform group-hover:translate-x-[150%] group-hover:-translate-y-[150%] group-focus-visible:translate-x-[150%] group-focus-visible:-translate-y-[150%]", SWAP)} />
          <ArrowUpRight strokeWidth={2} className={cn("absolute inset-0 m-auto size-5 -translate-x-[150%] translate-y-[150%] transition-transform group-hover:translate-x-0 group-hover:translate-y-0 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0", SWAP)} />
        </span>
      </span>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
        {item.tags.map((t) => (
          <li key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs">{t}</li>
        ))}
      </ul>
      <h3 className="mt-2 max-w-[24ch] text-balance text-2xl font-medium leading-tight tracking-[-0.01em] sm:text-3xl">{item.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{item.client} · {item.year}</p>
      <p className="mt-3 max-w-[52ch] text-base text-muted-foreground">{item.summary}</p>
    </Link>
  );
}
