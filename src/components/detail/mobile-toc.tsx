"use client";

import { Check, List } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Heading } from "@/lib/headings";
import { cn } from "@/lib/utils";
import { useActiveHeading, useGoToHeading } from "./use-headings";

/**
 * Topics below `xl`, where there is no room for a side list. Once the reader is past the title, a pill rides at
 * the bottom of the screen naming the section they are in and how far through (2 / 5). Tapping it opens every
 * section in a sheet; picking one closes the sheet and scrolls there.
 */
export function MobileToc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useActiveHeading(headings);
  const go = useGoToHeading();
  const [open, setOpen] = useState(false);
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
          type="button"
          onClick={() => setOpen(true)}
          tabIndex={past ? 0 : -1}
          aria-label={`On this page: ${headings[index]?.text}, section ${index + 1} of ${headings.length}. Open all sections`}
          className="pointer-events-auto flex h-12 w-full items-center gap-3 rounded-full bg-foreground pl-5 pr-4 text-background shadow-[0_10px_28px_-10px_rgba(0,0,0,0.5)]"
        >
          <List aria-hidden className="size-4 shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{headings[index]?.text}</span>
          <span className="text-sm tabular-nums opacity-70">{index + 1} / {headings.length}</span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-3xl px-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle className="text-xl font-medium">On this page</SheetTitle>
          </SheetHeader>
          <ol className="overflow-y-auto px-2">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => pick(h.id)}
                  aria-current={h.id === active ? "location" : undefined}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-lg leading-snug",
                    h.level === 3 && "pl-8 text-base",
                    h.id === active ? "bg-muted font-medium" : "text-muted-foreground active:bg-muted",
                  )}
                >
                  {h.text}
                  {h.id === active && <Check aria-hidden className="size-4 shrink-0" strokeWidth={2} />}
                </button>
              </li>
            ))}
          </ol>
        </SheetContent>
      </Sheet>
    </div>
  );
}
