"use client";

import { ArrowUp, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { smallTalk } from "@/content/site";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/constants";
import { SectionId } from "@/lib/enums";


/**
 * Two columns: heading on the left, an accordion of short answers on the right.
 * Rows sit on a soft fill that swells slightly on hover; "+" turns into "×"
 * when open. The last row takes a free-form question and opens an email.
 */
export function SmallTalk() {
  const [open, setOpen] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const base = useId();

  /** Sends the question to the site owner's inbox (see /api/contact). */
  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim() || busy) return;
    setBusy(true); setState(null);
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, message: q, website: new FormData(e.currentTarget as HTMLFormElement).get("website") ?? "" }) });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setState({ ok: res.ok, text: data.message ?? (res.ok ? "Sent." : "Could not send that.") });
      if (res.ok) { setQ(""); setEmail(""); }
    } catch { setState({ ok: false, text: "Could not send that. Check your connection." }); }
    setBusy(false);
  };

  return (
    <section id={SectionId.SmallTalk} aria-labelledby="talk-title" className="page-x grid scroll-mt-24 gap-10 pt-32 lg:grid-cols-2">
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
          <form onSubmit={ask} className="flex flex-col gap-2 rounded-xl border border-dashed border-border px-2 py-2 pl-3">
            <div className="flex items-center gap-3">
              <span aria-hidden className="dither-tile size-6 shrink-0 rounded-[4px] text-[2.5rem]" />
              <label htmlFor={`${base}-ask`} className="sr-only">Ask me anything else</label>
              <input
                id={`${base}-ask`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask me anything else"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" disabled={!q.trim() || !email.trim() || busy} aria-label="Send question"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30">
                <ArrowUp aria-hidden className="size-4" strokeWidth={2} />
              </button>
            </div>
            {q.trim() && (
              <div className="flex items-center gap-3 pl-9">
                <label htmlFor={`${base}-email`} className="sr-only">Your email, so I can reply</label>
                <input id={`${base}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email, so I can reply"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </div>
            )}
            {/* A field only a bot fills in. */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            {state && <p role="status" className={cn("pl-9 text-sm", state.ok ? "text-muted-foreground" : "text-destructive")}>{state.text}</p>}
          </form>
        </li>
      </ul>
    </section>
  );
}
