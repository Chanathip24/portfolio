"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type CSSProperties } from "react";
import { Globe } from "@/components/globe";
import { onThemeChange } from "@/lib/site-store";
import { EASE } from "@/lib/constants";
import { SectionId } from "@/lib/enums";

// Keep the globe, scene and fringe on one local sky-blue palette.
const SKY_PALETTE = {
  "--brand-ink": "#00a8f5",
  "--brand": "#38baff",
  "--brand-soft": "#83d5fb",
  color: "#ffffff",
} as CSSProperties;

type Pin = { label: string; lat: number; lon: number };

/* ---------------------------------------------------------------------------
 * About scene (320vh), matching the reference's sequence:
 * 1. An oversized globe rises over the white page (its top arc shows first).
 * 2. It keeps growing until it fills the screen; the scene background, which
 *    is exactly the globe's ocean colour, switches on behind it unseen.
 * 3. Pinned, it zooms out while turning to the pin and settles high.
 * 4. Heading (left) and copy + actions (right) rise in along the bottom.
 * The globe can be dragged at any point and eases back to the pin.
 * ------------------------------------------------------------------------- */
export function GlobeScene({ pin, heading, body, primary }: {
  pin: Pin;
  heading: string;
  body: string;
  primary: { label: string; href: string };
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.6 });
  // Phases over a 360vh section. PIN: the stage pins (section top reaches the viewport top);
  // only after that, with Work fully off-screen, may the globe grow past the section top.
  const PIN = 100 / 360, FILL = PIN + 0.13, SETTLE = 0.72;
  const scale = useTransform(p, [0, PIN, FILL, SETTLE], [2.6, 2.6, 4.6, 0.92]);
  // Globe box is 80vmin, so at 2.6x its radius is 104vmin. Offsetting by (104vmin - 38vh) puts the
  // dome's top 12vh below the section top. CSS units keep server and client output identical.
  const y = useTransform(p, (v) => {
    if (v <= PIN) return "calc(104vmin - 38vh)";
    if (v <= FILL) return `calc(${(1 - (v - PIN) / (FILL - PIN)).toFixed(4)} * (104vmin - 38vh))`;
    return `${(-14 * Math.min(1, (v - FILL) / (SETTLE - FILL))).toFixed(3)}vh`;
  });
  const focus = useTransform(p, [0, SETTLE], [0, 1]);
  // Switch the scene colour on only once the globe covers the whole screen, so the hand-over is unseen.
  const bg = useTransform(p, [FILL - 0.03, FILL], [0, 1]);
  const copyOpacity = useTransform(p, [0.7, 0.86], [0, 1]);
  const copyY = useTransform(p, [0.7, 0.86], [40, 0]);
  const reducedFocus = useTransform(p, () => 1);

  if (reduce) {
    return (
      <section ref={ref} id={SectionId.About} aria-labelledby="about-title" style={SKY_PALETTE} className="relative bg-brand-ink py-24">
        <Globe focus={reducedFocus} pin={pin} className="mx-auto size-[min(80vw,26rem)]" />
        <Copy heading={heading} body={body} primary={primary} />
      </section>
    );
  }

  return (
    <section ref={ref} id={SectionId.About} aria-labelledby="about-title" style={SKY_PALETTE} className="relative h-[360vh] overflow-x-clip">
      {/* Clipped at the bottom and sides only: the rising dome may poke above, but a lagging
          (spring-smoothed) giant globe can never spill down over the next section. */}
      <div className="sticky top-0 h-svh [clip-path:inset(-100vh_0_0_0)]">
        <motion.div aria-hidden style={{ opacity: bg }} className="absolute inset-0 bg-brand-ink" />
        <motion.div style={{ scale, y }} className="absolute left-1/2 top-1/2 size-[min(80vw,80vh)] -translate-x-1/2 -translate-y-1/2">
          <Globe focus={focus} pin={pin} outerScale={scale} className="size-full" />
        </motion.div>
        <motion.div style={{ opacity: copyOpacity, y: copyY }} className="absolute inset-x-0 bottom-0 pb-12 sm:pb-16">
          <Copy heading={heading} body={body} primary={primary} />
        </motion.div>
      </div>
      {/* Hangs below the section: as the scene scrolls away, it breaks up into pixels instead of a ruled edge. */}
      <PixelEdge className="pointer-events-none absolute left-0 top-[calc(100%-1px)] h-40 w-full sm:h-48" />
    </section>
  );
}

function Copy({ heading, body, primary }: { heading: string; body: string; primary: { label: string; href: string } }) {
  return (
    <div className="page-x grid items-end gap-6 lg:grid-cols-2">
      <h2 id="about-title" className="text-[clamp(2.75rem,6vw,4rem)] font-medium leading-none tracking-[-0.02em]">{heading}</h2>
      <div className="max-w-[28rem] lg:justify-self-end">
        <p className="text-base leading-relaxed">{body}</p>
        <a href={primary.href} className="group mt-5 inline-flex items-center gap-1.5 no-underline">
          <span className="inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white">{primary.label}</span>
          <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-black text-white">
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:-rotate-45" strokeWidth={2} />
          </span>
        </a>
      </div>
    </div>
  );
}

/**
 * The scene's bottom edge as a bank of pixel cloud, like the reference: solid
 * scene colour on top, one lighter row and one checker row. Each column
 * ends cleanly, keeping the stepped silhouette free of scattered debris.
 */
function PixelEdge({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const C = 22;
    let solid = "", light = "", checker: CanvasPattern | null = null;
    const colors = () => {
      const cs = getComputedStyle(canvas);
      solid = cs.getPropertyValue("--brand-ink");
      light = cs.getPropertyValue("--brand-soft");
      const p = document.createElement("canvas");
      p.width = p.height = 4;
      const g = p.getContext("2d")!;
      g.fillStyle = solid;
      g.fillRect(0, 0, 2, 2);
      g.fillRect(2, 2, 2, 2);
      checker = ctx.createPattern(p, "repeat");
    };
    const draw = (t: number) => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / C);
      for (let x = 0; x < cols; x++) {
        // Cloud line: slow sine layers give rounded bumps of different sizes, drifting sideways.
        const u = x + t * 0.35;
        const line = Math.max(1, Math.round(2.5 + 1.1 * Math.sin(u * 0.39) + 0.7 * Math.sin(u * 0.83 + 1.7)));
        ctx.fillStyle = solid;
        ctx.fillRect(x * C, 0, C, line * C);
        ctx.fillStyle = light;
        ctx.fillRect(x * C, line * C, C, C);
        if (checker) {
          ctx.fillStyle = checker;
          ctx.fillRect(x * C, (line + 1) * C, C, C);
        }
      }
    };
    colors();
    let raf = 0, last = 0, visible = false;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 66) return; // ~15fps is plenty for drifting cloud
      last = now;
      draw(reduce ? 0 : now / 1000);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    const refresh = () => { colors(); draw(reduce ? 0 : last / 1000); };
    const ro = new ResizeObserver(() => draw(reduce ? 0 : last / 1000));
    ro.observe(canvas);
    const offTheme = onThemeChange(refresh);
    draw(0);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); offTheme(); };
  }, []);
  return <canvas ref={ref} aria-hidden className={className} />;
}

/** Reveal on entering the viewport, once. */
export function Reveal({ delay = 0, className, children }: { delay?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
