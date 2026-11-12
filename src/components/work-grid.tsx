"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { SiteImage } from "@/components/ui/site-image";
import { Link } from "next-view-transitions";
import type { WorkItem } from "@/content/site";
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

export function WorkRow({ lead, wall }: { lead: WorkItem; wall: WorkItem[] }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Flow id={lead.slug} i={0}>
        <Lead item={lead} />
      </Flow>
      <ul className="grid grid-cols-2 gap-4 self-start">
        {wall.map((w, i) => (
          <li key={w.slug}>
            <Flow id={`${lead.slug}-${w.slug}`} i={i + 1}>
              <Link href={w.href} aria-label={`${w.title} (${w.client})`} className="dim-item group block rounded-2xl focus-visible:outline-offset-[3px]">
                <span className="block overflow-hidden rounded-2xl bg-tile transition-transform duration-300 group-active:scale-[0.98]">
                    <SiteImage src={w.image} alt="" width={800} height={560} sizes="(min-width: 1024px) 33vw, 100vw"
                      className="aspect-[3/2] w-full object-cover transition-[scale] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]" />
                </span>
              </Link>
            </Flow>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Lead({ item }: { item: WorkItem }) {
  return (
    <Link href={item.href} className="dim-item group block rounded-[1.75rem] no-underline">
      <span className="relative block overflow-hidden rounded-[1.75rem] bg-tile transition-transform duration-300 group-active:scale-[0.98]">
          <SiteImage src={item.image} alt="" width={1400} height={1000} sizes="100vw" priority
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
      <p className="mt-1 text-sm text-muted-foreground">{item.client}</p>
    </Link>
  );
}
