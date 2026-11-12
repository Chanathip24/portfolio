"use client";

import { useEffect, useRef } from "react";

const GAP = 7; // px between hatch lines
const R = 140; // radius of the pointer's influence, px
const PUSH = 38; // max displacement at the pointer, px

/**
 * A large glyph drawn as diagonal hatching; the lines bend away from the pointer
 * like combed thread.
 *
 * Performance: the straight hatching is rendered once into an offscreen cache.
 * The animation loop only runs while the pointer is over the mark (or the bend is
 * easing out), and each frame redraws just the square around the pointer; the rest
 * is a single drawImage of the cache. At rest it costs nothing.
 */
export function HatchMark({ glyph, className }: { glyph: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mask = document.createElement("canvas"); // the glyph, as alpha
    const cache = document.createElement("canvas"); // straight hatching inside the glyph
    let w = 0, h = 0, dpr = 1, color = "#000";
    const pointer = { x: 0, y: 0, pull: 0, inside: false };

    // 135° lines: x + y = k. Draw the part of each line that crosses `box`, bending near the pointer.
    const hatch = (g: CanvasRenderingContext2D, box: { x0: number; y0: number; x1: number; y1: number }, bend: number) => {
      g.strokeStyle = color;
      g.lineWidth = 2;
      g.beginPath();
      const kMin = Math.floor((box.x0 + box.y0) / GAP) * GAP, kMax = box.x1 + box.y1;
      for (let k = kMin; k <= kMax; k += GAP) {
        // Endpoints of this line clipped to the box (a line x + y = k runs from upper right to lower left).
        const ya = Math.max(box.y0, k - box.x1), yb = Math.min(box.y1, k - box.x0);
        if (ya > yb) continue;
        if (bend < 0.01) {
          g.moveTo(k - ya, ya);
          g.lineTo(k - yb, yb);
          continue;
        }
        for (let y = ya, first = true; y <= yb + 4; y += 4) {
          const yy = Math.min(y, yb);
          let px = k - yy, py = yy;
          const dx = px - pointer.x, dy = py - pointer.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R * 2.6) {
            const d = Math.sqrt(d2) || 1, f = Math.exp(-d2 / (R * R)) * PUSH * bend;
            px += (dx / d) * f;
            py += (dy / d) * f;
          }
          if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py);
        }
      }
      g.stroke();
    };

    const build = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      for (const c of [canvas, mask, cache]) {
        c.width = Math.max(1, Math.round(w * dpr));
        c.height = Math.max(1, Math.round(h * dpr));
      }
      const cs = getComputedStyle(canvas);
      color = cs.getPropertyValue("--brand");
      const m = mask.getContext("2d")!;
      m.setTransform(dpr, 0, 0, dpr, 0, 0);
      m.fillStyle = "#000";
      m.textAlign = "center";
      m.textBaseline = "alphabetic";
      m.font = `italic 400 ${h * 1.9}px ${cs.getPropertyValue("--font-display") || "serif"}`;
      m.fillText(glyph, w / 2, h * 1.45);
      const c = cache.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      hatch(c, { x0: 0, y0: 0, x1: w, y1: h }, 0);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = "destination-in";
      c.drawImage(mask, 0, 0);
      c.globalCompositeOperation = "source-over";
      paint();
    };

    const paint = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(cache, 0, 0);
      if (pointer.pull < 0.01) return;
      // Only the square around the pointer changes: clear it, redraw bent lines, re-mask it.
      const s = R * 1.7 + PUSH;
      const box = { x0: pointer.x - s, y0: pointer.y - s, x1: pointer.x + s, y1: pointer.y + s };
      const sx = Math.max(0, box.x0 * dpr), sy = Math.max(0, box.y0 * dpr);
      const sw = Math.min(canvas.width, box.x1 * dpr) - sx, sh = Math.min(canvas.height, box.y1 * dpr) - sy;
      if (sw <= 0 || sh <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
      ctx.clearRect(sx, sy, sw, sh);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hatch(ctx, box, pointer.pull);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, sx, sy, sw, sh, sx, sy, sw, sh);
      ctx.restore();
    };

    let raf = 0;
    const tick = () => {
      pointer.pull += ((pointer.inside ? 1 : 0) - pointer.pull) * 0.14; // ease the bend in and out
      paint();
      // Keep going only while there is something moving.
      raf = pointer.inside || pointer.pull > 0.01 ? requestAnimationFrame(tick) : 0;
      if (!raf) { pointer.pull = 0; paint(); }
    };
    const wake = () => { if (!raf && !reduce) raf = requestAnimationFrame(tick); };

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      wake();
    };
    const enter = (e: PointerEvent) => { pointer.inside = true; move(e); };
    const leave = () => { pointer.inside = false; wake(); };

    build();
    document.fonts?.ready.then(build); // redraw once the display face has loaded
    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    const mo = new MutationObserver(build);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerenter", enter);
    canvas.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerenter", enter);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, [glyph]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
