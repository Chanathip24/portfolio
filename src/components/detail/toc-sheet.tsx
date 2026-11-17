"use client";

import { Check } from "lucide-react";
import type { RefObject } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Heading } from "@/lib/headings";
import { cn } from "@/lib/utils";

/** The sheet that lists every section. Loaded on first hover, focus or tap of the contents button (see mobile-toc.tsx). */
export default function TocSheet({ trigger, open, onOpenChange, headings, active, onPick }: {
  trigger: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headings: Heading[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" finalFocus={trigger} className="max-h-[80dvh] rounded-t-3xl px-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle className="text-xl font-medium">On this page</SheetTitle>
        </SheetHeader>
        <ol className="overflow-y-auto px-2">
          {headings.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => onPick(h.id)}
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
  );
}
