"use client";

import type Lenis from "lenis";
import { useLenis } from "lenis/react";
import { useEffect } from "react";
import { useSiteStore } from "@/lib/site-store";

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Lenis lives in the layout, so it outlives the page: a scroll still running when the route changes
 *  would carry on down the next page. stop() resets the animation, start() resumes normal scrolling. */
const cancelScroll = (lenis?: Lenis) => {
  if (!lenis) return;
  lenis.stop();
  lenis.start();
};

let leaving = 0; // see the cleanup in HashEntry

/**
 * Entering the page at a section (/#work, or a link that asks for one) starts at the top
 * and, once the hero intro has played, scrolls down to the section, so the hero's parallax
 * runs on the way instead of being skipped. The hash is put back in the URL on arrival.
 * The request lives in the site store (`entryHash`): the early script in layout.tsx leaves it in
 * sessionStorage for direct loads and the store picks it up; links set it themselves (BackToWork).
 */
export function HashEntry() {
  const lenis = useLenis();

  useEffect(() => {
    clearTimeout(leaving); // Strict Mode re-runs us straight after a cleanup; that is not a real leave
    const { entryHash: hash, clearEntry } = useSiteStore.getState();
    if (!hash) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!lenis && !reduce) return; // Lenis isn't up yet; this effect re-runs when it is

    // Consumed only when the scroll has finished, not here: in development React Strict Mode runs
    // this effect, tears it down (cancelling the timer below) and runs it again, so the second
    // run must still find the request.
    const startPath = location.pathname;
    let cancelled = false;
    const finish = () => {
      // Left the page meanwhile (a project was opened mid-scroll)? Then this URL is not ours to touch.
      if (cancelled || location.pathname !== startPath) return;
      clearEntry();
      history.replaceState(history.state, "", startPath + location.search + hash);
    };
    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return finish();

    scrollTo(0, 0);
    // Land where an anchor click would: honour the section's scroll-margin.
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const go = () => {
      const y = Math.max(0, target.getBoundingClientRect().top + scrollY - margin);
      if (reduce || !lenis) {
        scrollTo(0, y);
        return finish();
      }
      lenis.scrollTo(y, {
        // Long enough for the pinned hero (the first ~720px) to be seen going by, about 1.8s of it
        // with this curve; sections further down get a bit longer.
        duration: Math.min(4.5, 2.8 + y / 1800),
        easing: easeInOut,
        onComplete: finish,
      });
    };

    let timer = 0;
    const afterIntro = () => (timer = window.setTimeout(go, 500)); // let the headline settle first
    let unsubscribe = () => {};
    if (useSiteStore.getState().introDone) afterIntro();
    else
      unsubscribe = useSiteStore.subscribe((s) => {
        if (!s.introDone) return;
        unsubscribe();
        afterIntro();
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
      cancelScroll(lenis);
      // A real leave (no re-run follows) before arriving makes the request stale: drop it, or the
      // next visit to the home page would scroll to a section nobody asked for.
      leaving = window.setTimeout(clearEntry, 0);
    };
  }, [lenis]);

  return null;
}

/**
 * In-page section links (#work, #notes, ...) scroll; they are not navigations. A native hash
 * click fires `popstate`, and next-view-transitions answers every popstate with the page
 * transition, which is wrong for scrolling inside one page. So we take these clicks over:
 * smooth-scroll with Lenis and update the hash with replaceState (which fires no popstate).
 * Real route changes (opening a project, Back from one) are untouched and still animate.
 */
export function HashLinks() {
  const lenis = useLenis();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      // Only fragment links that stay on this page.
      if (!a.hash || a.origin !== location.origin || a.pathname !== location.pathname || a.search !== location.search) return;
      const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (!target) return;

      e.preventDefault();
      history.replaceState(history.state, "", location.pathname + location.search + a.hash);
      if (!lenis || matchMedia("(prefers-reduced-motion: reduce)").matches) return target.scrollIntoView();
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const distance = Math.abs(target.getBoundingClientRect().top - margin);
      lenis.scrollTo(target, { duration: Math.min(3.2, 1 + distance / 1500), easing: easeInOut });
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      cancelScroll(lenis); // leaving mid-scroll must not drag the next page along
    };
  }, [lenis]);

  return null;
}
