"use client";

import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { useSiteStore } from "@/lib/site-store";

/**
 * A link that works from every page. A route ("/blog") is a normal transition. A home-page section
 * ("#work") stays a plain anchor on the home page (HashLinks smooth-scrolls it) and, anywhere else, goes
 * home and asks HashEntry to scroll there once the intro has played, as the Back arrow does.
 */
export function SiteLink({ href, ...props }: Omit<React.ComponentProps<"a">, "href"> & { href: string }) {
  const pathname = usePathname();
  if (!href.startsWith("#") || pathname === "/") {
    return href.startsWith("#") ? <a href={href} {...props} /> : <Link href={href} {...props} />;
  }
  return <Link href="/" onClick={() => useSiteStore.getState().requestEntry(href)} {...props} />;
}
