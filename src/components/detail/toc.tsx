"use client";

import type { Heading } from "@/lib/headings";
import { cn } from "@/lib/utils";
import { useActiveHeading, useGoToHeading } from "./use-headings";

/** "On this page" beside the article on wide screens: the headings, with the one being read marked. */
export function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useActiveHeading(headings);
  const go = useGoToHeading();

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="text-muted-foreground">On this page</p>
      <ol className="mt-3 space-y-2 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                go(h.id);
                setActive(h.id);
              }}
              aria-current={active === h.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l py-0.5 pr-2 leading-snug no-underline transition-colors",
                h.level === 3 ? "pl-7" : "pl-4",
                active === h.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
