"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Parallax } from "@/components/ui/parallax";
import type { getTestimonials } from "@/lib/api/about";
import { EASE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Testimonials = Awaited<ReturnType<typeof getTestimonials>>;

const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("");
const AUTOPLAY_MS = 7000;
const quoteClass = "max-w-[28ch] text-balance font-display text-[clamp(1.875rem,4.4vw,3.5rem)] italic leading-[1.08] tracking-[-0.02em]";

/**
 * One testimonial at a time, set large; swap to see the next. Arrow buttons, dots and a swipe all work, and it
 * advances by itself until the reader hovers, focuses or has asked for reduced motion. The quote slides and unblurs
 * out and in, in the direction you are going.
 */
export function Testimonials({ items }: { items: Testimonials }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ index: 0, dir: 1 });
  const [paused, setPaused] = useState(false);
  const n = items.length;
  const current = items[state.index];

  const go = (to: number, dir: number) => setState({ index: ((to % n) + n) % n, dir });
  const next = () => go(state.index + 1, 1);
  const prev = () => go(state.index - 1, -1);

  useEffect(() => {
    if (reduce || paused || n < 2) return;
    const t = window.setTimeout(() => setState((s) => ({ index: (s.index + 1) % n, dir: 1 })), AUTOPLAY_MS);
    return () => clearTimeout(t); // restarts on every change, so a manual swap always gets its full seven seconds
  }, [state.index, paused, reduce, n]);

  if (!current) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby="kind-words-title"
      className="page-x pt-40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Parallax distance={18}>
        <h2 id="kind-words-title" className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.03em]">
          Kind words
        </h2>
      </Parallax>
      <p className="mt-4 text-sm text-muted-foreground">Placeholder quotes from placeholder people.</p>

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-20">
        {/* Every quote is also laid out, invisibly, in this same cell, so the block is always as tall as the tallest one:
            no empty gap under a short quote and no jump when you swap. */}
        <div aria-live="polite" className="grid overflow-hidden">
          {items.map((t) => (
            <div key={t.id} aria-hidden className="invisible col-start-1 row-start-1">
              <p className={quoteClass}>“{t.quote}”</p>
              <div className="mt-8 h-10" />
            </div>
          ))}
          <AnimatePresence mode="wait" initial={false} custom={state.dir}>
            <motion.figure
              key={current.id}
              custom={state.dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 56, filter: reduce ? "blur(0px)" : "blur(8px)" }),
                center: { opacity: 1, x: 0, filter: "blur(0px)" },
                exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -56, filter: reduce ? "blur(0px)" : "blur(8px)" }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
              drag={reduce ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) next();
                else if (info.offset.x > 60) prev();
              }}
              style={{ touchAction: "pan-y" }}
              className="col-start-1 row-start-1 cursor-grab active:cursor-grabbing"
            >
              <blockquote className={quoteClass}>
                “{current.quote}”
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-3">
                <Avatar size="lg">
                  {current.avatar_url && <AvatarImage src={current.avatar_url} alt="" />}
                  <AvatarFallback>{initials(current.author_name)}</AvatarFallback>
                </Avatar>
                <span className="leading-tight">
                  <span className="block font-medium">{current.author_name}</span>
                  <span className="block text-sm text-muted-foreground">{current.author_role} · {current.company}</span>
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-6 lg:flex-col lg:items-end lg:justify-end">
          <p className="text-sm tabular-nums text-muted-foreground" aria-hidden>
            <span className="text-foreground">{String(state.index + 1).padStart(2, "0")}</span> / {String(n).padStart(2, "0")}
          </p>
          <div role="group" aria-label="Choose a testimonial" className="flex items-center gap-1.5">
            {items.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => go(i, i > state.index ? 1 : -1)}
                aria-label={`Show testimonial ${i + 1} of ${n}`}
                aria-current={i === state.index ? "true" : undefined}
                className="group flex h-6 items-center px-0.5"
              >
                <span className={cn("block h-1.5 rounded-full transition-[width,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]", i === state.index ? "w-8 bg-brand" : "w-1.5 bg-border group-hover:bg-muted-foreground")} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="size-11 rounded-full" onClick={prev} aria-label="Previous testimonial">
              <ArrowLeft aria-hidden className="size-4" strokeWidth={2} />
            </Button>
            <Button type="button" variant="outline" size="icon" className="size-11 rounded-full" onClick={next} aria-label="Next testimonial">
              <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
