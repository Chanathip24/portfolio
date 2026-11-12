"use client";

import { useEffect, useId, useRef } from "react";

const GAP = 7; // px between hatch lines

/**
 * A large glyph filled with diagonal hatching. Pure SVG: the pattern is painted once and follows the
 * theme through `--brand`, so at rest it costs nothing (no canvas, no animation loop, no JS).
 * Under the pointer a second, crossing hatch shows through a CSS mask that follows it; the only JS is
 * one rAF-coalesced write of two CSS variables while the pointer moves over the mark.
 * Styles: `.hatch-mark` in globals.css.
 */
export function HatchMark({ glyph, className }: { glyph: string; className?: string }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    let raf = 0, x = 0, y = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--x", `${x}px`);
      el.style.setProperty("--y", `${y}px`);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      raf ||= requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
    };
  }, []);

  const layer = (angle: number, cls?: string) => (
    <svg aria-hidden className={cls}>
      <defs>
        <pattern id={`${id}${angle}`} width={GAP} height={GAP} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
          <line x1="0" y1="0" x2="0" y2={GAP} strokeWidth="2" />
        </pattern>
      </defs>
      <text x="50%" y="145%" textAnchor="middle" fill={`url(#${id}${angle})`}>{glyph}</text>
    </svg>
  );

  return (
    <div ref={root} aria-hidden className={`hatch-mark ${className ?? ""}`}>
      {layer(45)}
      {layer(-45, "hatch-cross")}
    </div>
  );
}
