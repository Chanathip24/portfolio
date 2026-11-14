"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { usePathname } from "next/navigation";
import { StoreSync } from "@/components/store-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  // Smooth scroll fights reduced-motion preferences, so native scroll wins there.
  const reduceMotion = useReducedMotion();
  // The admin is a work tool: native scrolling there.
  const inAdmin = usePathname().startsWith("/admin");

  return (
    <NuqsAdapter>
      <StoreSync />
      {!reduceMotion && !inAdmin && <ReactLenis root options={{ lerp: 0.12 }} />}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NuqsAdapter>
  );
}
