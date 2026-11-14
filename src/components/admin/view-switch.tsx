"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "cn";

/** The tabs that switch how a list is shown (`?view=table`). The address is read at the moment of the click, not from what the page
 *  was last drawn with: right after a filter is cleared the page still shows the old results for a moment, and a link built from
 *  them would bring the filters back. */
export function ViewSwitch({ label = "View", views, fallback }: { label?: string; views: readonly { id: string; label: string }[]; fallback: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const current = params.get("view") ?? fallback;
  const hrefFor = (search: string, id: string) => {
    const next = new URLSearchParams(search);
    next.set("view", id);
    next.delete("page");
    return `${path}?${next}`;
  };
  return (
    <nav aria-label={label} className="flex w-fit gap-0.5 rounded-lg bg-muted p-0.5 text-sm">
      {views.map((v) => (
        <Link key={v.id} href={hrefFor(params.toString(), v.id)} aria-current={v.id === current ? "page" : undefined}
          onClick={(e) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in a new tab" work as usual
            e.preventDefault();
            router.push(hrefFor(location.search, v.id));
          }}
          className={cn("rounded-md px-3 py-1", v.id === current ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{v.label}</Link>
      ))}
    </nav>
  );
}
