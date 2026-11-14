"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { supabaseConfigured } from "@/lib/supabase/env";

const SEND = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

/** Sends each Core Web Vital the browser measures to /api/vitals (see that route). Skips the admin and Do Not Track. */
export function WebVitalsReporter() {
  const path = usePathname();
  useReportWebVitals((m) => {
    if (!supabaseConfigured || path.startsWith("/admin") || navigator.doNotTrack === "1" || !SEND.has(m.name)) return;
    const device = window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
    const body = JSON.stringify({ metric: m.name, value: m.value, rating: m.rating, path, device });
    navigator.sendBeacon("/api/vitals", new Blob([body], { type: "application/json" }));
  });
  return null;
}
