"use client";

import { ArrowUp, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { owner, smallTalk } from "@/content/site";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Two columns: heading on the left, an accordion of short answers on the right.
 * Rows sit on a soft fill that swells slightly on hover; "+" turns into "×"
 * when open. The last row takes a free-form question and opens an email.
 */
export function SmallTalk() {
  const [open, setOpen] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const base = useId();

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    window.location.href = `mailto:${owner.email}?subject=${encodeURIComponent("Small talk")}&body=${encodeURIComponent(q.trim())}`;
  };

  return (
    <section id="small-talk" aria-labelledby="talk-title" className="page-x grid scroll-mt-24 gap-10 pt-32 lg:grid-cols-2">
      <div>
        <h2 id="talk-title" className="text-[clamp(3rem,8vw,6.5rem)] font-medium leading-[0.9] tracking-[-0.03em]">{smallTalk.heading}</h2>
        <p className="mt-4 max-w-[18rem] text-sm text-muted-foreground">{smallTalk.blurb}</p>
      </div>

      <ul className="space-y-2 self-start">
        {smallTalk.items.map((it, i) => {
          const isOpen = open === i;
          const panel = `${base}-a${i}`;
          return (
            <li key={it.q} className="group relative">
              {/* The fill swells on hover, behind the row, so the text never moves. */}
              <span aria-hidden className="absolute inset-0 rounded-xl bg-muted transition-[scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.02]" />
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : i)}
                className="relative flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3.5 text-left text-sm"
              >
                {it.q}
                <Plus aria-hidden strokeWidth={1.75} className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", isOpen && "rotate-45")} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panel}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="relative overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{it.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
        <li>
          <form onSubmit={ask} className="flex items-center gap-3 rounded-xl border border-dashed border-border px-2 py-2 pl-3">
            <span aria-hidden className="dither-tile size-6 shrink-0 rounded-[4px] text-[2.5rem]" />
            <label htmlFor={`${base}-ask`} className="sr-only">Ask me anything else</label>
            <input
              id={`${base}-ask`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask me anything else"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" disabled={!q.trim()} aria-label="Send question by email"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30">
              <ArrowUp aria-hidden className="size-4" strokeWidth={2} />
            </button>
          </form>
        </li>
      </ul>
    </section>
  );
}
