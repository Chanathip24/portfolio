import { cn } from "@/lib/utils";

/**
 * An endless horizontal strip. Children should be <li> elements. The list is rendered twice and slid by
 * exactly its own width, so the loop has no seam; the copy is aria-hidden and inert. Pure CSS: it pauses on
 * hover or focus, and with reduced motion it stops and becomes a normal scrollable strip (see .marquee in
 * globals.css). `duration` is seconds for one full loop.
 */
export function Marquee({
  children,
  reverse = false,
  duration = 40,
  className,
  label,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-reverse={reverse || undefined}
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      className={cn("marquee", className)}
    >
      <ul className="marquee-track">{children}</ul>
      <ul className="marquee-track" aria-hidden inert>
        {children}
      </ul>
    </div>
  );
}
