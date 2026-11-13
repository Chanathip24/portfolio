"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** A thin brand-coloured line across the top that fills as the page is read. Decorative; the page works without it. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.4 });
  return <motion.div aria-hidden style={{ scaleX }} className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-brand" />;
}
