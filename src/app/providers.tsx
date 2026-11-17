"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, QueryClient, QueryClientProvider, type Query } from "@tanstack/react-query";
import { persistQueryClient, persistQueryClientSave } from "@tanstack/react-query-persist-client";
import { useEffect } from "react";
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
  return client;
}

/** Restored and saved outside React's render (not PersistQueryClientProvider): its "restoring" state flips at the root during hydration,
 * which makes React client-render every Suspense boundary still waiting to hydrate. It runs in an effect, after hydration, because a
 * restore during render makes the first client render differ from the server HTML (#418). Saving starts once the restore is done, so what
 * the page hydrated in the meantime is saved then. Newer data always wins: hydrate never replaces a fresher copy with an older one. */
let persistStarted = false; // StrictMode and remounts must not run it twice
function startPersist(client: QueryClient) {
  if (persistStarted) return;
  persistStarted = true;
  persistQueryClient({ queryClient: client, ...persistOptions })[1]
    .then(() => persistQueryClientSave({ queryClient: client, ...persistOptions }))
    .catch(() => {}); // an unreadable saved copy is discarded by the restore; the page has its data anyway
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Smooth scroll fights reduced-motion preferences, so native scroll wins there.
  const reduceMotion = useReducedMotion();
  // The admin is a work tool: native scrolling there.
  const inAdmin = usePathname().startsWith("/admin");
  const client = getQueryClient();
  // Idle, not at mount: Suspense boundaries still hydrating after the root's effects would otherwise read the restored data (#418).
  useEffect(() => {
    const run = () => startPersist(client);
    if ("requestIdleCallback" in window) return void window.requestIdleCallback(run, { timeout: 2000 });
    setTimeout(run, 200);
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <NuqsAdapter>
        <StoreSync />
        {!reduceMotion && !inAdmin && <ReactLenis root options={{ lerp: 0.12 }} />}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
