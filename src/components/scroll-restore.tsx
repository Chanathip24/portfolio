"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useSiteStore } from "@/lib/site-store";

/**
 * View transitions swap the page after popstate, so on Back the browser restores scroll
 * against the OLD, shorter page and clamps it (1847 became 606). The store remembers the scroll
 * of every path (`scrollByPath`, persisted for the session) and we re-apply it as soon as the new
 * page is in, before the transition captures it.
 * shortcut: keyed by path, so two history entries for one path share a position; key by
 * a per-entry id if that ever matters.
 */
export function ScrollRestore() {
  const pathname = usePathname();
  const popped = useRef(false);

  useEffect(() => {
    let raf = 0, timer = 0;
    const save = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // The browser's clamped restore also fires a scroll event; don't record it.
        if (popped.current) return;
        useSiteStore.getState().saveScroll(location.pathname, Math.round(scrollY));
      });
    };
    const onPop = () => {
      popped.current = true;
      clearTimeout(timer);
      timer = window.setTimeout(() => (popped.current = false), 1500); // same-path pops never change pathname
    };
    addEventListener("scroll", save, { passive: true });
    addEventListener("popstate", onPop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      removeEventListener("scroll", save);
      removeEventListener("popstate", onPop);
    };
  }, []);

  // Runs in the commit that brings in the new page, ahead of the view transition's snapshot.
  useLayoutEffect(() => {
    if (!popped.current) return;
    popped.current = false;
    // Plain scrollTo: Lenis follows native scrolling, as it already does for Next's scroll-to-top.
    scrollTo(0, useSiteStore.getState().scrollByPath[pathname] ?? 0);
  }, [pathname]);

  return null;
}
