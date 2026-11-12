"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SiteImage } from "@/components/ui/site-image";
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

export function WorkShowcase({ signature, others }: { signature: WorkItem[]; others: WorkItem[] }) {
  return (
    <div className="dim-others grid min-w-0 grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
      <div className="space-y-16">
        {signature.map((item, i) => (
          <Flow key={item.slug} id={item.slug} i={0}>
            <Lead item={item} priority={i === 0} />
          </Flow>
        ))}
      </div>
      {/* One index for every other project; it stays in view beside the signature projects as they scroll past (tall viewports only: taller than the screen, it would hide its last rows). */}
      <div className="lg:self-start [@media(min-height:56rem)]:lg:sticky [@media(min-height:56rem)]:lg:top-24">
        <ProjectIndex rowId="more" items={others} />
      </div>
    </div>
  );
}

/*
 * The non-signature projects as an index: a thumbnail, the title, who it was for and when. The text is
 * the point, the thumbnail only a hint. Two variants share the data and swap on input type:
 * - with a mouse, each row is a link and hovering opens a preview card (image, summary, tags);
 * - on touch there is no hover, so a row is a button: tap it to unfold the same preview in place, tap
 *   "Open project" to go. One row is open at a time.
 */
function ProjectIndex({ rowId, items }: { rowId: string; items: WorkItem[] }) {
  return (
    <div className="min-w-0 lg:self-start">
      <h3 className="flex items-baseline justify-between border-b border-border pb-3 text-sm text-muted-foreground">
        <span>More projects</span>
        <span className="tabular-nums">{items.length}</span>
      </h3>
      <HoverList items={items} />
      <TouchList rowId={rowId} items={items} />
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

function HoverList({ items }: { items: WorkItem[] }) {
  return (
    <ul className="hidden can-hover:block">
      {items.map((w, i) => (
        <motion.li key={w.slug} {...rowReveal(i)} className="border-b border-border/70">
          <HoverCard>
            <HoverCardTrigger
              closeDelay={80}
              render={<Link href={w.href} aria-label={`${w.title} (${w.client})`} className="dim-item group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-4 no-underline focus-visible:outline-offset-[-2px]" />}
            >
              <span className="block overflow-hidden rounded-xl bg-tile">
                <SiteImage src={w.image} alt="" width={144} height={108} sizes="72px"
                  className="aspect-[4/3] w-full object-cover transition-[scale] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
              </span>
              <span className="min-w-0 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1">
                <span className="block truncate text-lg font-medium leading-tight">{w.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{w.client} · {w.year}</span>
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

function TouchList({ rowId, items }: { rowId: string; items: WorkItem[] }) {
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
                  <div className="mt-3"><Tags tags={w.tags} /></div>
                  <Link href={w.href} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background no-underline">
                    Open project <ArrowUpRight aria-hidden className="size-4" strokeWidth={2} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}

function Lead({ item, priority }: { item: WorkItem; priority: boolean }) {
  return (
    <Link href={item.href} className="dim-item group block rounded-[1.75rem] no-underline">
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
