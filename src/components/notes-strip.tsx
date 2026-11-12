"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { notes } from "@/content/site";

/**
 * Notes as a row of postage stamps. Each rests at its own small tilt and lifts
 * 8px and straightens on hover or focus. The row scrolls sideways: drag it with
 * a mouse, swipe it on touch, or use a trackpad.
 */
export function NotesStrip() {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x: 0, left: 0, moved: false });

  const down = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return; // touch scrolls natively
    drag.current = { on: true, x: e.clientX, left: rowRef.current!.scrollLeft, moved: false };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    rowRef.current!.scrollLeft = d.left - dx;
  };
  const up = () => (drag.current.on = false);
  // A drag must not also count as a click on the stamp under the pointer.
  const click = (e: React.MouseEvent) => {
    if (drag.current.moved) e.preventDefault();
  };

  return (
    <section id="notes" aria-labelledby="notes-title" className="scroll-mt-24 pt-64">
      <div className="page-x grid items-end gap-6 lg:grid-cols-2">
        <h2 id="notes-title" className="text-[clamp(3rem,8vw,6.5rem)] font-medium leading-[0.9] tracking-[-0.03em]">{notes.heading}</h2>
        <div className="max-w-[22rem] lg:justify-self-end">
          <p className="text-muted-foreground">{notes.blurb}</p>
          <a href="#notes" className="group mt-4 inline-flex items-center gap-1.5 no-underline">
            <span className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background">More writing</span>
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:-rotate-45" strokeWidth={2} />
            </span>
          </a>
        </div>
      </div>

      {/* The scroller is full width; the row inside centres itself when it fits and scrolls when it doesn't. */}
      <div
        ref={rowRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        onClickCapture={click}
        className="mt-12 cursor-grab snap-x overflow-x-auto py-6 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
      <ul className="dim-others mx-auto flex w-max gap-6 px-[max(1rem,6vw)] xl:px-4">
        {notes.items.map((n) => (
          <li key={n.n} className="shrink-0 snap-start">
            <a
              href="#notes"
              draggable={false}
              style={{ "--turn": `${n.turn}deg`, "--hue": n.hue } as React.CSSProperties}
              className="stamp dim-item block w-56 rotate-[var(--turn)] bg-white p-3 text-black no-underline shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)] hover:-translate-y-2 hover:rotate-0 focus-visible:-translate-y-2 focus-visible:rotate-0 xl:w-60"
            >
              <Image src={n.image} alt="" width={480} height={400} unoptimized draggable={false} className="aspect-[6/5] w-full select-none object-cover" />
              <span className="mt-3 flex items-end justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-mono text-[0.625rem] tracking-wide text-[var(--hue)]">{n.date}</span>
                  <span className="mt-0.5 block font-display text-2xl italic leading-[0.95] text-[var(--hue)]">{n.title}</span>
                </span>
                <span className="text-4xl font-medium leading-none tracking-[-0.03em] text-[var(--hue)]">{n.n}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
