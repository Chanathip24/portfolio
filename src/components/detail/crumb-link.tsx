"use client";

import { Link } from "next-view-transitions";
import { useSiteStore } from "@/lib/site-store";

/** A breadcrumb link. With `entry` ("#work") it goes to that home-page section the way the nav does: home first, then
 *  HashEntry scrolls down to it once the intro has played. */
export function CrumbLink({ href, entry, ...props }: Omit<React.ComponentProps<"a">, "href"> & { href: string; entry?: string }) {
  return <Link href={href} onClick={entry ? () => useSiteStore.getState().requestEntry(entry) : undefined} {...props} />;
}
