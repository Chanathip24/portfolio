"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, QueryClient, QueryClientProvider, type Query } from "@tanstack/react-query";
import { persistQueryClient, persistQueryClientSave } from "@tanstack/react-query-persist-client";
import { ReactLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { usePathname } from "next/navigation";
import { StoreSync } from "@/components/store-sync";
import { isPublicKey, publicOnly } from "@/lib/api/queries";

const DAY = 24 * 60 * 60 * 1000;
let browserClient: QueryClient | undefined;

const storage = () => { try { return window.localStorage; } catch { return undefined; } }; // blocked storage throws on access
const persister = publicOnly(createAsyncStoragePersister({ storage: typeof window === "undefined" ? undefined : storage(), key: "public-query-cache" }));
const persistOptions = {
  persister,
  maxAge: DAY,
  buster: process.env.NEXT_PUBLIC_BUILD_ID, // a new build drops what an older one saved
  // Only public content is saved: never admin data, and never a mutation (the contact form's carry an email address and a message).
  dehydrateOptions: {
    shouldDehydrateQuery: (q: Query) => isPublicKey(q.queryKey) && defaultShouldDehydrateQuery(q),
    shouldDehydrateMutation: () => false,
  },
};

/** A new client for every server render, so visitors never share a cache; one for the life of the tab in the browser. */
function getQueryClient() {
  // On the server the hydrated data is final ("static"), which also keeps the query from reading the clock during a prerender.
  if (typeof window === "undefined") return new QueryClient({ defaultOptions: { queries: { staleTime: "static" } } });
  if (browserClient) return browserClient;
  // Five minutes, the server cache's own life for most of it, so hydrated data is not fetched again straight away.
  // gcTime matches the saved copy's life, or it would be dropped before it could be saved.
  const client = (browserClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000, gcTime: DAY } } }));
  // Restored and saved outside React (not PersistQueryClientProvider): its "restoring" state flips at the root during hydration, which
  // makes React client-render every Suspense boundary still waiting to hydrate. Saving starts once the restore is done, so what the
  // page hydrated in the meantime is saved then. Newer data always wins: hydrate never replaces a fresher copy with an older one.
  persistQueryClient({ queryClient: client, ...persistOptions })[1]
    .then(() => persistQueryClientSave({ queryClient: client, ...persistOptions }))
    .catch(() => {}); // an unreadable saved copy is discarded by the restore; the page has its data anyway
  return client;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Smooth scroll fights reduced-motion preferences, so native scroll wins there.
  const reduceMotion = useReducedMotion();
  // The admin is a work tool: native scrolling there.
  const inAdmin = usePathname().startsWith("/admin");

  return (
    <QueryClientProvider client={getQueryClient()}>
      <NuqsAdapter>
        <StoreSync />
        {!reduceMotion && !inAdmin && <ReactLenis root options={{ lerp: 0.12 }} />}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
