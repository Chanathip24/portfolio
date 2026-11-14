"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { StoreSync } from "@/components/store-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  // useState so each request/user gets its own client and it survives re-renders
  // Smooth scroll fights reduced-motion preferences, so native scroll wins there.
  const reduceMotion = useReducedMotion();
  // The admin is a work tool: native scrolling there.
  const inAdmin = usePathname().startsWith("/admin");
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StoreSync />
      {!reduceMotion && !inAdmin && <ReactLenis root options={{ lerp: 0.12 }} />}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
