"use client";

import { Link } from "next-view-transitions";
import { useSiteStore } from "@/lib/site-store";
import { hash, SectionId } from "@/lib/enums";

/** Back to the Work section: opens the home page at the top and lets HashEntry scroll down to #work. */
export function BackToWork({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      onClick={() => useSiteStore.getState().requestEntry(hash(SectionId.Work))}
      className={className}
      aria-label="Back to selected projects"
    >
      ←
    </Link>
  );
}
