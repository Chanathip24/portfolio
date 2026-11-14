"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const here = () => location.pathname + location.search;

/** A thin bar across the top while an admin page is loading, so a click never looks ignored. It starts on any click on an admin link and
 *  ends by itself when the address changes. */
export function NavProgress() {
  const search = useSearchParams().toString();
  const url = usePathname() + (search ? `?${search}` : "");
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    let timer = 0;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
      const to = new URL(a.href, location.href);
      if (to.origin !== location.origin || !to.pathname.startsWith("/admin") || to.pathname + to.search === here()) return;
      setFrom(here());
      clearTimeout(timer);
      timer = window.setTimeout(() => setFrom(null), 20_000); // a navigation that never finishes must not leave the bar up
    };
    // Capture phase: next/link calls preventDefault() on its own click, so by the time a bubbling listener runs the click looks handled.
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); clearTimeout(timer); };
  }, []);

  if (from === null || from !== url) return null;
  return <div role="progressbar" aria-label="Loading page" className="nav-progress fixed inset-x-0 top-0 z-50 h-0.5 bg-foreground" />;
}
