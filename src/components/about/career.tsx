"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Parallax } from "@/components/ui/parallax";
import type { CareerRow } from "@/lib/api/types";
import { EASE } from "@/lib/constants";
import { CareerKind } from "@/lib/enums";

const kindLabel: Record<CareerKind, string> = {
  [CareerKind.Education]: "Education",
  [CareerKind.Work]: "Employment",
  [CareerKind.Freelance]: "Independent",
};

/** Pixel squares in the site's dither style, floating at different depths behind the timeline. Decoration only. */
function PixelDepth() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      <Parallax distance={160} className="absolute right-[5%] top-[14%]"><div className="dither-tile size-20 opacity-60" /></Parallax>
      <Parallax distance={-90} className="absolute left-[3%] top-[44%]"><div className="dither-tile size-12 opacity-50" /></Parallax>
      <Parallax distance={240} className="absolute right-[9%] top-[70%]"><div className="dither-tile size-28 opacity-40" /></Parallax>
    </div>
  );
}

function Entry({ entry }: { entry: CareerRow }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  // The line fills while this entry is being read; the numeral drifts against the page for as long as it is on screen.
  const { scrollYProgress: reading } = useScroll({ target: ref, offset: ["start 70%", "end 55%"] });
  const { scrollYProgress: passing } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const fill = useTransform(reading, [0, 1], [0, 1]);
  const dot = useTransform(reading, [0, 0.04], [0, 1]);
  const drift = useTransform(passing, [0, 1], [110, -110]);
  const current = entry.end_year === null;

  return (
    <li ref={ref} className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-20">
      <div aria-hidden className="pointer-events-none select-none pl-9 pt-14 sm:pl-12 lg:pl-0 lg:pt-10 lg:text-right">
        <motion.span
          style={{ y: reduce ? 0 : drift }}
          className="block font-display text-[clamp(4.5rem,15vw,11rem)] italic leading-[0.8] tracking-[-0.04em] text-brand/15"
        >
          {entry.start_year}
        </motion.span>
      </div>

      <div className="relative pb-14 pl-9 pt-4 sm:pl-12 lg:pt-14">
        <span aria-hidden className="absolute inset-y-0 left-0 w-px bg-border" />
        <motion.span aria-hidden style={{ scaleY: reduce ? 1 : fill }} className="absolute inset-y-0 left-0 w-px origin-top bg-brand" />
        <span aria-hidden className="absolute -left-[6px] top-[1.15rem] size-3 rounded-full border-2 border-border bg-background lg:top-[4.1rem]">
          <motion.span style={{ scale: reduce ? 1 : dot }} className="absolute -inset-[2px] rounded-full bg-brand" />
        </span>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge variant="secondary" className="h-6 px-2.5 text-xs">{kindLabel[entry.kind]}</Badge>
            <p className="text-sm tabular-nums text-muted-foreground">
              <time>{entry.start_year}</time> – {current ? <span className="font-medium text-foreground">Now</span> : <time>{entry.end_year}</time>}
            </p>
          </div>
          <h3 className="mt-4 text-balance text-2xl font-medium leading-tight tracking-[-0.015em] sm:text-3xl">{entry.role}</h3>
          <p className="mt-1 text-muted-foreground">{entry.organisation} · {entry.location}</p>
          <p className="mt-5 max-w-[52ch] text-muted-foreground">{entry.summary}</p>
          <ul className="mt-5 space-y-2">
            {entry.highlights.map((h) => (
              <li key={h} className="flex items-baseline gap-3">
                <span aria-hidden className="size-1.5 shrink-0 translate-y-[-0.15em] bg-brand" />
                {h}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </li>
  );
}

/**
 * The career path, oldest first, with scroll doing the work: each year's numeral drifts against the page, the line
 * between entries fills as you read down it, and pixel squares float at three depths behind. All of it holds still
 * when reduced motion is on.
 */
export function Career({ entries }: { entries: CareerRow[] }) {
  return (
    <section aria-labelledby="career-title" className="relative pt-40">
      <PixelDepth />
      <Parallax distance={18}>
        <h2 id="career-title" className="page-x text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.03em]">
          Career path
        </h2>
      </Parallax>
      <ol className="page-x relative mt-16">
        {entries.map((e) => (
          <Entry key={e.id} entry={e} />
        ))}
      </ol>
    </section>
  );
}
