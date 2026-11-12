"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { useSiteStore } from "@/lib/site-store";
import { Theme } from "@/lib/enums";

const BOUNCE = { type: "spring", stiffness: 520, damping: 13, mass: 0.7 } as const;

/**
 * Switches light and dark. Where View Transitions exist, the new theme spreads out
 * from the button as a circle on an overshooting curve; the icon swaps with a spring.
 */
export function ThemeToggle() {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const dark = useSiteStore((s) => s.theme === Theme.Dark);

  function toggle() {
    const flip = () => {
      const next = document.documentElement.classList.toggle("dark");
      try {
        localStorage.setItem("theme", next ? Theme.Dark : Theme.Light);
      } catch {}
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };
    if (!doc.startViewTransition || reduce) return flip();

    const r = ref.current!.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    // While a swap runs the store keeps the navigation animation off (StoreSync -> `theme-changing`);
    // it must outlive the circle, so it ends on `finished`, not when the circle does.
    const { beginThemeSwap, endThemeSwap } = useSiteStore.getState();
    beginThemeSwap();
    const transition = doc.startViewTransition(flip);
    transition.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 650, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      )
      .catch(() => {}); // skipped transition (hidden tab, superseded): nothing to animate
    transition.finished.then(endThemeSwap, endThemeSwap);
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.82 }}
      transition={BOUNCE}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex size-9 items-center justify-center overflow-hidden rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={dark ? "sun" : "moon"}
          initial={{ rotate: -120, scale: 0.2, opacity: 0, y: 8 }}
          animate={{ rotate: 0, scale: 1, opacity: 1, y: 0 }}
          exit={{ rotate: 120, scale: 0.2, opacity: 0, y: -8 }}
          transition={BOUNCE}
          className="flex"
        >
          {dark ? <Sun className="size-4" strokeWidth={1.75} /> : <Moon className="size-4" strokeWidth={1.75} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
