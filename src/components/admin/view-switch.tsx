"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "cn";

/** The tabs that switch how a list is shown (`?view=table`). The links are built from the address as it is now, so a view change never
 *  brings back filters that were just cleared while the page was still refreshing. */
export function ViewSwitch({ label = "View", views, fallback }: { label?: string; views: readonly { id: string; label: string }[]; fallback: string }) {
  const path = usePathname();
  const params = useSearchParams();
  const current = params.get("view") ?? fallback;
  return (
    <nav aria-label={label} className="flex w-fit gap-0.5 rounded-lg bg-muted p-0.5 text-sm">
      {views.map((v) => {
        const next = new URLSearchParams(params);
        next.set("view", v.id);
        next.delete("page");
        return (
          <Link key={v.id} href={`${path}?${next}`} aria-current={v.id === current ? "page" : undefined}
            className={cn("rounded-md px-3 py-1", v.id === current ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{v.label}</Link>
        );
      })}
    </nav>
  );
}
