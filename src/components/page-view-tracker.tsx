"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { supabaseConfigured } from "@/lib/supabase/env";

/** Logs one page view per route change to /api/track (no cookies, no ids; see that route). Does nothing
 *  without Supabase, in the admin, or when the browser sends Do Not Track. */
export function PageViewTracker() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (!supabaseConfigured || path.startsWith("/admin") || navigator.doNotTrack === "1") return;
    // Only the landing page has a meaningful referrer; later ones are just our own previous page.
    const body = JSON.stringify({ path, referrer: isFirst ? document.referrer : "" });
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  }, [path]);
  return null;
}
