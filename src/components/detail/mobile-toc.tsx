"use client";

import { List } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/headings";
import { cn } from "@/lib/utils";
import { useActiveHeading, useGoToHeading } from "./use-headings";

// The sheet is its own chunk: fetched when the pointer or focus reaches the button, mounted on the first open.
const loadSheet = () => import("./toc-sheet");
const TocSheet = dynamic(loadSheet, { ssr: false });

/**
 * Topics below `xl`, where there is no room for a side list. Once the reader is past the title, a pill rides at
 * the bottom of the screen naming the section they are in and how far through (2 / 5). Tapping it opens every
 * section in a sheet; picking one closes the sheet and scrolls there.
 */
export function MobileToc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useActiveHeading(headings);
  const go = useGoToHeading();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const index = Math.max(0, headings.findIndex((h) => h.id === active));
  const pick = (id: string) => {
    setActive(id);
    setOpen(false);
    window.setTimeout(() => go(id), 260); // let the sheet finish closing and release the scroll lock first
  };

  return (
    <div className="xl:hidden">
      <div
        className={cn(
          "pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-sm transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          past ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onPointerEnter={loadSheet}
          onFocus={loadSheet}
          onClick={() => {
            setMounted(true);
            setOpen(true);
          }}
          tabIndex={past ? 0 : -1}
          aria-label={`On this page: ${headings[index]?.text}, section ${index + 1} of ${headings.length}. Open all sections`}
          className="pointer-events-auto flex h-12 w-full items-center gap-3 rounded-full bg-foreground pl-5 pr-4 text-background shadow-[0_10px_28px_-10px_rgba(0,0,0,0.5)]"
        >
          <List aria-hidden className="size-4 shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{headings[index]?.text}</span>
          <span className="text-sm tabular-nums opacity-70">{index + 1} / {headings.length}</span>
        </button>
      </div>

      {mounted && <TocSheet trigger={trigger} open={open} onOpenChange={setOpen} headings={headings} active={active} onPick={pick} />}
    </div>
  );
}
