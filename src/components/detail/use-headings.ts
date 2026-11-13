"use client";

import { useLenis } from "lenis/react";
import { useCallback, useEffect, useState } from "react";
import type { Heading } from "@/lib/headings";

/** Which heading is being read: the last one to pass under the fixed nav. Shared by the desktop and mobile topics lists. */
export function useActiveHeading(headings: Heading[]) {
  const [active, setActive] = useState(headings[0]?.id);
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);
  return [active, setActive] as const;
}

/** Smooth-scrolls to a heading, leaving it 96px below the top (clear of the nav), and records it in the URL. */
export function useGoToHeading() {
  const lenis = useLenis();
  return useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      history.replaceState(null, "", `#${id}`);
      // An absolute position from the real scroll offset: asking Lenis to scroll to the element works from its own
      // idea of where the page is, which lags behind a native scroll that has only just happened.
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      if (lenis) lenis.scrollTo(top, { duration: 1.1 });
      else window.scrollTo({ top, behavior: "smooth" });
    },
    [lenis],
  );
}
