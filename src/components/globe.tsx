"use client";

import { type MotionValue, useMotionValueEvent } from "motion/react";
import { useEffect, useRef } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopo from "world-atlas/land-110m.json";
import { onThemeChange } from "@/lib/site-store";
import { BAYER } from "@/lib/constants";

const RAD = Math.PI / 180;
const MAP_W = 720, MAP_H = 360; // land mask resolution: 0.5 degree per pixel

/** Rasterise Natural Earth land (110m) into an equirectangular boolean mask, once. */
let landMask: Uint8Array | null = null;
function getLandMask() {
  if (landMask) return landMask;
  const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
  const land = feature(topo, topo.objects.land);
  const c = document.createElement("canvas");
  c.width = MAP_W;
  c.height = MAP_H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.beginPath();
  for (const f of land.features) {
    const geom = f.geometry;
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
    for (const poly of polys)
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => {
          const px = ((lon + 180) / 360) * MAP_W, py = ((90 - lat) / 180) * MAP_H;
          // Rings that jump across the antimeridian would streak across the map: restart the path there.
          const prev = ring[i - 1];
          if (i === 0 || (prev && Math.abs(prev[0] - lon) > 180)) g.moveTo(px, py);
          else g.lineTo(px, py);
        });
        g.closePath();
      }
  }
  g.fill("evenodd");
  const d = g.getImageData(0, 0, MAP_W, MAP_H).data;
  landMask = new Uint8Array(MAP_W * MAP_H);
  for (let i = 0; i < landMask.length; i++) landMask[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return landMask;
}

function toRgb(css: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d")!;
  g.fillStyle = css;
  g.fillRect(0, 0, 1, 1);
  const [r, gg, b] = g.getImageData(0, 0, 1, 1).data;
  return [r, gg, b];
}

type Pin = { label: string; lat: number; lon: number };

/**
 * A dithered 3D globe (orthographic projection, per-pixel). Scroll drives
 * `focus` 0..1 from a start view to the pin; dragging adds an offset that
 * eases back so the scroll story always ends on the pin.
 */
export function Globe({ focus, pin, cell = 6, outerScale, className }: {
  focus: MotionValue<number>;
  pin: Pin;
  cell?: number;
  /** Scale applied to the globe from outside; the pin label is counter-scaled so it stays readable. */
  outerScale?: MotionValue<number>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const state = useRef({ focus: focus.get(), dLon: 0, dLat: 0, spin: 0, hover: false, dragging: false, lastDrag: 0, dirty: true });

  useMotionValueEvent(focus, "change", (v) => {
    state.current.focus = v;
    state.current.dirty = true;
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const mask = getLandMask();
    const s = state.current;
    let n = 0, img: ImageData;
    let pal: [number, number, number][] = [];
    const readColors = () => {
      const cs = getComputedStyle(canvas);
      // Ocean = the scene background (--brand-ink) so a screen-filling globe hands over seamlessly;
      // lit water and coasts in --brand; land in white.
      pal = [toRgb(cs.getPropertyValue("--brand-ink")), toRgb(cs.getPropertyValue("--brand")), [255, 255, 255]];
      s.dirty = true;
    };
    readColors();
    const resize = () => {
      n = Math.max(16, Math.round(canvas.clientWidth / cell));
      canvas.width = canvas.height = n;
      img = ctx.createImageData(n, n);
      s.dirty = true;
    };
    resize();

    const START = { lon: -30, lat: 20 }; // Atlantic, a long turn before Asia
    const view = () => {
      const k = 1 - (1 - Math.min(1, s.focus)) ** 3;
      return {
        lon: START.lon + (pin.lon - START.lon) * k + s.dLon + s.spin,
        lat: Math.max(-80, Math.min(80, START.lat + (pin.lat - START.lat) * k + s.dLat)),
      };
    };

    const draw = (t: number) => {
      const { lon: l0, lat: p0 } = view();
      const sp = Math.sin(p0 * RAD), cp = Math.cos(p0 * RAD);
      const d = img.data, r = n / 2;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const o = (j * n + i) * 4;
          const x = (i + 0.5 - r) / r, y = (r - j - 0.5) / r;
          const rho2 = x * x + y * y;
          if (rho2 > 1) { d[o + 3] = 0; continue; }
          const z = Math.sqrt(1 - rho2);
          // Inverse orthographic projection: screen point -> lat/lon.
          const lat = Math.asin(z * sp + y * cp) / RAD;
          let lon = l0 + Math.atan2(x, z * cp - y * sp) / RAD;
          lon = ((((lon + 180) % 360) + 360) % 360) - 180;
          const mx = Math.min(MAP_W - 1, Math.floor(((lon + 180) / 360) * MAP_W));
          const my = Math.min(MAP_H - 1, Math.floor(((90 - lat) / 180) * MAP_H));
          const isLand = mask[my * MAP_W + mx] === 1;
          // Light from the upper left; limb darkens.
          const light = Math.max(0, 0.4 + 0.35 * z + 0.35 * y - 0.25 * x);
          // Water stays mostly flat (tone 0) with lit speckle; land dithers between tones 1 and 2.
          let v = isLand ? 0.62 + 0.4 * light : 0.02 + 0.28 * light;
          // Weather: cloud bands that drift east over the surface, so the planet reads as alive.
          const la = lat * RAD, lo = lon * RAD + t * 0.05;
          const cloud = 0.5 + 0.32 * Math.sin(3 * lo + 1.7 * Math.sin(2 * la + t * 0.07)) * Math.cos(5 * la) + 0.22 * Math.sin(7 * lo - 6 * la + t * 0.11);
          if (cloud > 0.78) v = Math.max(v, 0.78 + 0.3 * light);
          else if (cloud > 0.68) v = Math.max(v, 0.42 + 0.2 * light);
          // Ordered dither into three tones: deep ocean, light ocean, land.
          const level = Math.min(2, Math.floor(v * 2 + BAYER[(j & 3) * 4 + (i & 3)]));
          const c = pal[level];
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      // Forward projection for the pin label.
      const dl = (pin.lon - l0) * RAD, pl = pin.lat * RAD;
      const visible = sp * Math.sin(pl) + cp * Math.cos(pl) * Math.cos(dl) > 0.05;
      const px = Math.cos(pl) * Math.sin(dl);
      const py = cp * Math.sin(pl) - sp * Math.cos(pl) * Math.cos(dl);
      const el = pinRef.current!;
      el.style.left = `${50 + px * 50}%`;
      el.style.top = `${50 - py * 50}%`;
      el.style.opacity = visible ? "1" : "0";
      el.style.scale = String(1 / (outerScale?.get() ?? 1));
    };

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SPIN = 4; // degrees per second: a slow, steady turn
    let raf = 0, visibleOnScreen = true, last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visibleOnScreen || now - last < 33) return; // ~30fps
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const settled = s.focus >= 0.98;
      if (settled && !s.hover && !s.dragging && !reduce) {
        // Idle: keep turning, like a planet does.
        s.spin = ((((s.spin + SPIN * dt) + 180) % 360) + 360) % 360 - 180;
      } else if (!settled && Math.abs(s.spin) > 0.05) {
        // Scrolling back into the scene: unwind the shortest way so it lands on the pin.
        s.spin *= 0.9;
      }
      // Drag offset eases home after a pause, so the scroll story still ends on the pin.
      if (!s.dragging && performance.now() - s.lastDrag > 1500 && (Math.abs(s.dLon) > 0.05 || Math.abs(s.dLat) > 0.05)) {
        s.dLon *= 0.93; s.dLat *= 0.93;
      }
      draw(reduce ? 0 : now / 1000);
    };

    // Drag to rotate; hovering pauses the idle spin.
    let prev = { x: 0, y: 0 };
    const down = (e: PointerEvent) => {
      s.dragging = true; prev = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!s.dragging) return;
      const deg = 180 / canvas.getBoundingClientRect().width; // one globe-width drag = half a turn
      s.dLon -= (e.clientX - prev.x) * deg;
      s.dLat += (e.clientY - prev.y) * deg;
      prev = { x: e.clientX, y: e.clientY };
      s.lastDrag = performance.now();
    };
    const up = () => { s.dragging = false; s.lastDrag = performance.now(); };
    const enter = () => (s.hover = true);
    const leave = () => (s.hover = false);
    canvas.addEventListener("pointerenter", enter);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    // Release can land outside the canvas (or capture can be lost): end the drag on any of them.
    window.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);

    const io = new IntersectionObserver(([e]) => (visibleOnScreen = e.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const offTheme = onThemeChange(readColors);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect(); offTheme();
      canvas.removeEventListener("pointerenter", enter);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
    };
  }, [cell, pin.lat, pin.lon, outerScale]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Globe turning to ${pin.label}. Drag to spin it.`}
        className="size-full cursor-grab touch-none rounded-full active:cursor-grabbing"
        style={{ imageRendering: "pixelated" }}
      />
      <div ref={pinRef} className="pointer-events-none absolute flex origin-top-left -translate-x-1.5 -translate-y-1.5 items-center gap-2 opacity-0 transition-opacity">
        <span className="relative size-3">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/70 motion-reduce:hidden" />
          <span className="absolute inset-0 rounded-full border-2 border-white bg-[oklch(0.6_0.2_25)]" />
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-black shadow-[0_4px_12px_-4px_rgba(0,0,0,0.4)]">{pin.label}</span>
      </div>
    </div>
  );
}
