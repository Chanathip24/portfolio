"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * Parallax: shifts its children vertically as they cross the screen, so they travel at a different speed from the page.
 * Positive `distance` (px) starts the element lower and ends it higher: it overtakes the page and reads as nearer.
 * Negative lags behind and reads as farther away. `rotate` (degrees) adds a matching tilt. With reduced motion it
 * stays at rest (explicit zeros: the server renders before the preference is known, and Motion does not clear a transform
 * it has already set when a style is removed).
 */
export function Parallax({ distance = 40, rotate = 0, className, children }: { distance?: number; rotate?: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const r = useTransform(scrollYProgress, [0, 1], [rotate, -rotate]);
  return (
    <motion.div ref={ref} style={{ y: reduce ? 0 : y, rotate: reduce ? 0 : r }} className={className}>
      {children}
    </motion.div>
  );
}
