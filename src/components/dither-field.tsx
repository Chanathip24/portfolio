"use client";

import { useEffect, useRef } from "react";

// 4x4 Bayer matrix, normalised to 0..1: ordered dithering decides each block's tone.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => (n + 0.5) / 16);

/** Resolve any CSS colour (oklch included) to an rgb() string the canvas understands everywhere. */
function toRgb(css: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d")!;
  g.fillStyle = css;
  g.fillRect(0, 0, 1, 1);
  const [r, gg, b] = g.getImageData(0, 0, 1, 1).data;
  return `rgb(${r} ${gg} ${b})`;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Stable per-block random number, so dissolving blocks drop out in a fixed scattered order.
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

type Ref<T = number> = { current: T };
/**
 * Where this canvas sits in a shared "world" sky. With it, several canvases show
 * one continuous pattern: block (i, j) samples world point (ox + (i+.5)·base, oy + (j+.5)·base),
 * whatever size the blocks are drawn at, and the clearing is the world's centred ellipse.
 */
export type World = { ox: number; oy: number; base: number; w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number };

type Props = {
  /** Block size in CSS px. Pass `cellRef` to change it live (read every frame). */
  cell?: number;
  cellRef?: Ref;
  /** Clear an elliptical "cloud" in the middle; `clearAmount` (0..1, live) sets how strongly. */
  clearCenter?: boolean;
  clearAmount?: Ref;
  /** Live multiplier on the cleared ellipse (1 = default): >1 pushes the clouds outward. */
  spread?: Ref;
  /** 0..1, live: blocks drop out in a scattered order until the field is gone. */
  dissolve?: Ref;
  /** 0..1, live: blocks appear in a scattered order, from the edges inward (0 = none, 1 = all). */
  build?: Ref;
  /** Live: share one sky with other canvases (see World). */
  world?: Ref<World | null>;
  /** Live: leave this rectangle (canvas px) empty, for another canvas to draw. */
  skip?: Ref<Rect | null>;
  /** Live, world px: only keep blocks inside this centred box; the last two blocks inside its
   *  edge drop out at random, so a shrinking box closes in with a scattered edge. */
  keep?: Ref<{ cx: number; cy: number; hw: number; hh: number } | null>;
  /** 0..1: add block-scale cloud detail and contrast, for small fields (otherwise a few
   *  hundred px of smooth cloud dithers into a flat checkerboard). */
  detail?: number;
  /** Part the field around the pointer. */
  pointer?: boolean;
  className?: string;
};

/**
 * Chunky pixel sky drawn in three tones: solid brand, solid soft brand, and a
 * fine checker of brand over paper. Cloud banks drift slowly.
 */
export function DitherField({ cell = 22, cellRef, clearCenter = false, clearAmount, spread, dissolve, build, world, skip, keep, detail = 0, pointer = false, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tones = { strong: "", soft: "", checker: null as CanvasPattern | null };
    const readColors = () => {
      const s = getComputedStyle(canvas);
      const strong = toRgb(s.getPropertyValue("--brand"));
      const p = document.createElement("canvas");
      p.width = p.height = 4;
      const g = p.getContext("2d")!;
      g.fillStyle = strong;
      g.fillRect(0, 0, 2, 2);
      g.fillRect(2, 2, 2, 2);
      tones = { strong, soft: toRgb(s.getPropertyValue("--brand-soft")), checker: ctx.createPattern(p, "repeat") };
    };
    readColors();

    let w = 0, h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
    };
    resize();

    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };

    const draw = (t: number) => {
      if (canvas.width !== Math.round(w) || canvas.height !== Math.round(h)) resize();
      const c = Math.max(2, cellRef?.current ?? cell);
      const wd = world?.current;
      const base = wd?.base ?? c, ox = wd?.ox ?? 0, oy = wd?.oy ?? 0;
      const ww = wd?.w ?? w, wh = wd?.h ?? h;
      const cols = Math.ceil(w / c), rows = Math.ceil(h / c);
      const sp = spread?.current ?? 1;
      // Phones get a wider, flatter clearing so the clouds stay out from under the text.
      const narrow = ww < 640;
      const cx = ww / 2, cy = wh / 2, rx = ww * (narrow ? 0.62 : 0.36) * sp, ry = wh * (narrow ? 0.34 : 0.3) * sp;
      const k = clearAmount?.current ?? 1, gone = dissolve?.current ?? 0, built = build?.current ?? 1;
      const half = Math.min(w, h) / 2;
      const hole = skip?.current, kb = keep?.current;
      const paths = { strong: new Path2D(), soft: new Path2D(), checker: new Path2D() };
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (hole && x * c >= hole.x - 0.5 && (x + 1) * c <= hole.x + hole.w + 0.5 && y * c >= hole.y - 0.5 && (y + 1) * c <= hole.y + hole.h + 0.5) continue;
          // World position of this block, and its world grid index (keeps dither and dissolve stable across canvases).
          const X = ox + (x + 0.5) * base, Y = oy + (y + 0.5) * base;
          const gx = Math.round(X / base - 0.5), gy = Math.round(Y / base - 0.5);
          if (gone > 0 && hash(gx, gy) < gone) continue;
          if (built < 1) {
            // Each block's turn: mostly random, nudged so the edges fill first and the clouds build inward.
            const toEdge = Math.min(x * c, y * c, w - (x + 1) * c, h - (y + 1) * c) / half;
            if (0.65 * hash(gx + 91.7, gy + 13.3) + 0.35 * Math.min(1, toEdge) > built) continue;
          }
          if (kb) {
            const d = Math.max(Math.abs(X - kb.cx) / kb.hw, Math.abs(Y - kb.cy) / kb.hh);
            if (d > 1) continue;
            const f = Math.min(0.5, (2 * base) / Math.min(kb.hw, kb.hh)); // feather band ≈ two blocks
            if (d > 1 - f && hash(gx + 5.3, gy + 9.1) < (d - (1 - f)) / f) continue;
          }
          // Layered sines in world pixels: the same cloud banks at any block size.
          let v =
            0.5 +
            0.22 * Math.sin(X * 0.0035 + t * 0.25) +
            0.2 * Math.sin(Y * 0.006 - t * 0.18 + X * 0.0012) +
            0.14 * Math.sin((X + Y) * 0.0024 + t * 0.12);
          if (detail > 0) {
            // Small clumps on the block grid, drifting, then stretched so all three tones show.
            const d = 0.5 * Math.sin(gx * 0.85 + t * 0.35) * Math.sin(gy * 1.15 - t * 0.25) + 0.35 * Math.sin((gx + gy) * 0.55 + t * 0.2);
            // Lift the level too: a small patch of sky should read as mostly filled, like the reference.
            v = 0.5 + (v - 0.5 + d * 0.45 * detail) * (1 + 0.8 * detail) + 0.3 * detail;
          }
          if (clearCenter) v *= 1 - k * (1 - smooth(0.55, 1.35, ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2));
          if (pointer) v *= smooth(0, 160, Math.hypot(x * c - mouse.x, y * c - mouse.y));
          const th = BAYER[(gy & 3) * 4 + (gx & 3)];
          const tone = v > 0.66 + th * 0.2 ? "strong" : v > 0.48 + th * 0.2 ? "soft" : v > 0.22 + th * 0.35 ? "checker" : null;
          if (tone) paths[tone].rect(x * c, y * c, c, c);
        }
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = tones.soft;
      ctx.fill(paths.soft);
      ctx.fillStyle = tones.strong;
      ctx.fill(paths.strong);
      if (tones.checker) {
        ctx.fillStyle = tones.checker;
        ctx.fill(paths.checker);
      }
    };

    let raf = 0, last = 0, visible = true;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 33) return; // ~30fps
      last = now;
      draw(reduce ? 0 : now / 1000);
    };

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(() => { resize(); draw(last / 1000); });
    ro.observe(canvas);
    const mo = new MutationObserver(() => { readColors(); draw(last / 1000); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    if (pointer && !reduce) window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect(); mo.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [cell, cellRef, clearCenter, clearAmount, spread, dissolve, build, world, skip, keep, detail, pointer]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
