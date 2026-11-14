"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";
import { supabaseConfigured } from "@/lib/supabase/env";

/** Logs one page view per route change to /api/track (no cookies, no ids; see that route). Does nothing
 *  without Supabase, in the admin, or when the visitor has opted out (Do Not Track counts as opting out). */
export function PageViewTracker() {
  const path = usePathname();
  const consent = useConsent();
  const first = useRef(true);
  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (!supabaseConfigured || path.startsWith("/admin") || consent === undefined || consent === "declined") return;
    // Only the landing page has a meaningful referrer; later ones are just our own previous page.
    const body = JSON.stringify({ path, referrer: isFirst ? document.referrer : "" });
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  }, [path, consent]);
  return null;
}
