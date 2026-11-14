"use client";

import { useSyncExternalStore } from "react";

/** True while the viewport matches a CSS media query. False on the server, so the first render is the small-screen one. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
