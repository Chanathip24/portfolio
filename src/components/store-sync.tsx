"use client";

import { useEffect } from "react";
import { useSiteStore } from "@/lib/site-store";
import { Theme } from "@/lib/enums";

/**
 * Connects the store to the document, once, for the whole app:
 * - theme: one MutationObserver on <html class> keeps `theme` current, whoever changes the class
 *   (the toggle, the pre-paint script). Everything else subscribes to the store instead of
 *   observing the DOM itself.
 * - theme swaps: while any is running, <html> carries `theme-changing`, which navigation.css
 *   uses to keep the page-navigation animation off.
 */
export function StoreSync() {
  useEffect(() => {
    const html = document.documentElement;
    const syncTheme = () => useSiteStore.setState({ theme: html.classList.contains("dark") ? Theme.Dark : Theme.Light });
    syncTheme();
    const mo = new MutationObserver(syncTheme);
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });

    const swapping = () => useSiteStore.getState().themeSwaps > 0;
    html.classList.toggle("theme-changing", swapping());
    const off = useSiteStore.subscribe((s, prev) => {
      if ((s.themeSwaps > 0) !== (prev.themeSwaps > 0)) html.classList.toggle("theme-changing", s.themeSwaps > 0);
    });

    return () => {
      mo.disconnect();
      off();
    };
  }, []);

  return null;
}
