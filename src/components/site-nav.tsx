"use client";

import { ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { HERO_INTRO_DONE } from "@/components/hero";
import { ThemeToggle } from "@/components/theme-toggle";
import { nav, owner } from "@/content/site";

/**
 * Logo + links pill on the left, call to action on the right, both inset to the
 * page gutter. Appears once the hero intro has played; hides while scrolling
 * down and returns on any scroll up.
 */
export function SiteNav() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const show = () => setReady(true);
    if ((window as unknown as { __heroIntroDone?: boolean }).__heroIntroDone) show();
    window.addEventListener(HERO_INTRO_DONE, show);
    const fallback = setTimeout(show, 2500); // never leave the page without navigation
    return () => {
      window.removeEventListener(HERO_INTRO_DONE, show);
      clearTimeout(fallback);
    };
  }, []);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (Math.abs(y - prev) < 4) return; // ignore jitter
    setHidden(y > 120 && y > prev);
  });

  const visible = (ready || !!reduce) && !hidden;

  return (
    <motion.header
      initial={false}
      animate={visible ? { y: 0, opacity: 1 } : { y: -24, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none fixed inset-x-0 top-0 z-30 pt-4 sm:pt-5"
      style={{ visibility: visible ? "visible" : "hidden", transitionProperty: "visibility", transitionDelay: visible ? "0s" : "0.45s" }}
    >
      <div className="page-x flex items-center justify-between">
        <nav aria-label="Main" className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/60 bg-card/85 py-1.5 pl-1.5 pr-2 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <a href="#top" aria-label={`${owner.name}, home`} className="mr-1 flex size-8 items-center justify-center rounded-full bg-foreground font-display text-lg italic text-background no-underline">
            {owner.firstName[0]}
          </a>
          {nav.map((l) => (
            <a key={l.href} href={l.href} className="hidden rounded-full px-3 py-1.5 text-sm no-underline transition-colors hover:bg-muted md:block">
              {l.label}
            </a>
          ))}
          <ThemeToggle />
        </nav>
        <a href={`mailto:${owner.email}`} className="group pointer-events-auto flex items-center gap-1.5 no-underline">
          <span className="hidden h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background sm:inline-flex">Get in touch</span>
          <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
            <ArrowRight className="size-5 rotate-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-45" strokeWidth={1.75} />
          </span>
          <span className="sr-only sm:hidden">Email me</span>
        </a>
      </div>
    </motion.header>
  );
}
