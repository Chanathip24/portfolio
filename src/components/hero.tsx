"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DitherField, type World } from "@/components/dither-field";
import { useSiteStore } from "@/lib/site-store";
import { EASE } from "@/lib/constants";

const PIN = 720; // px of scroll the stage stays pinned, as on the reference
const BASE = 22; // sky block size in px
const SQ = 14; // the square is 14 blocks across, at every size
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

type Swap = { before: string; after: string; line2: string };
type Rect = { x: number; y: number; w: number; h: number };

/**
 * Pinned hero, one pixel sky in two canvases that share a world grid (as on the reference):
 * - Outer sky: full screen. On load its blocks build up, scattered, edges first; then the text arrives. On scroll (0 → 0.5) the clouds stay
 *   where they are but the area they show in narrows into the square: sides first and
 *   faster, then top and bottom, with a scattered edge, until only the square is left.
 * - Square: a 14x14-block patch of that same sky, under the headline. It stays while the
 *   rest leaves, its hollow middle fills in, then (0.5 → 0.92) it shrinks into the slot
 *   inside the second headline, same pattern, smaller blocks.
 * Words arrive from pixel tiles. Scroll is spring-smoothed.
 */
export function Hero({ lines, swap, intro, note }: { lines: string[]; swap: Swap; intro: string; note: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const geo = useRef({ vw: 1, vh: 1, sq: { x: 0, y: 0, w: BASE * SQ, h: BASE * SQ } as Rect, slot: { x: 0, y: 0, w: 1, h: 1 } as Rect });

  // Live values the canvases read every frame.
  const outerWorld = useRef<World | null>(null);
  const outerBuild = useRef(0);
  const outerSkip = useRef<Rect | null>(null);
  const outerKeep = useRef<{ cx: number; cy: number; hw: number; hh: number } | null>(null);
  const sqWorld = useRef<World | null>(null);
  const sqClear = useRef(1);
  const sqCell = useRef(BASE);

  // Shared with the nav and the section entry, which both wait for it.
  const introDone = useSiteStore((s) => s.introDone);
  const setIntroDone = useSiteStore((s) => s.setIntroDone);
  const [landed, setLanded] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const s = stageRef.current!.getBoundingClientRect();
      const r = slotRef.current!.getBoundingClientRect();
      const size = BASE * SQ;
      // Snap the square to the sky's grid so its blocks line up with the clouds around it.
      const x = Math.round((s.width / 2 - size / 2) / BASE) * BASE;
      // Sits just above the intro paragraph, as on the reference.
      const y = Math.round((s.height * 0.37 - size / 2) / BASE) * BASE;
      geo.current = { vw: s.width, vh: s.height, sq: { x, y, w: size, h: size }, slot: { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height } };
      sqWorld.current = { ox: x, oy: y, base: BASE, w: s.width, h: s.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stageRef.current!);
    return () => ro.disconnect();
  }, []);

  // Load intro: 0 = no blocks yet, 1 = the sky fully built.
  const introT = useMotionValue(0);
  useEffect(() => {
    // Reset on the way out too, so a return to this page plays the intro again and anything waiting
    // on it (the nav, a section entry) waits again instead of seeing the previous visit's "done".
    if (reduce) {
      introT.set(1);
      setIntroDone(true);
      return () => setIntroDone(false);
    }
    let cancelled = false;
    const c = animate(introT, 1, { duration: 1.4, delay: 0.2, ease: [0.33, 0, 0.2, 1] });
    c.then(() => !cancelled && setIntroDone(true));
    return () => {
      cancelled = true;
      c.stop();
      setIntroDone(false);
    };
  }, [introT, reduce, setIntroDone]);

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.7 });

  // Square box: holds still, then glides and shrinks into the slot.
  const sq = useTransform(p, (v) => {
    const { sq: a, slot } = geo.current;
    const k = easeInOut(clamp01((v - 0.5) / 0.42));
    const size = lerp(a.w, slot.h, k);
    const cx = lerp(a.x + a.w / 2, slot.x + slot.w / 2, k), cy = lerp(a.y + a.h / 2, slot.y + slot.h / 2, k);
    return { x: cx - size / 2, y: cy - size / 2, s: size };
  });
  const sLeft = useTransform(sq, (b) => b.x);
  const sTop = useTransform(sq, (b) => b.y);
  const sSize = useTransform(sq, (b) => b.s);

  const aOpacity = useTransform(p, [0, 0.22], [1, 0]);
  const aY = useTransform(p, [0, 0.22], [0, -33]);
  const aBlur = useTransform(p, [0, 0.22], ["blur(0px)", "blur(6px)"]);

  const sync = () => {
    const s = p.get(), i = introT.get();
    const { vw, vh, sq: a } = geo.current;
    outerWorld.current = { ox: 0, oy: 0, base: BASE, w: vw, h: vh };
    outerBuild.current = i;
    // The visible area narrows into the square (world coords). It starts larger than the
    // screen, so nothing is cut at rest; the sides close in first, top and bottom follow.
    const kx = easeInOut(clamp01(s / 0.42)), ky = easeInOut(clamp01((s - 0.06) / 0.44));
    outerKeep.current = {
      cx: a.x + a.w / 2,
      cy: a.y + a.h / 2,
      hw: lerp(vw * 0.62, a.w / 2, kx),
      hh: lerp(vh * 0.75, a.h / 2, ky),
    };
    // Once the intro is done, the square's patch belongs to the square canvas.
    outerSkip.current = i >= 1 && !reduce ? { x: a.x, y: a.y, w: a.w, h: a.h } : null;
    // The square keeps the sky; its hollow fills in as the rest leaves.
    sqClear.current = 1 - easeInOut(clamp01((s - 0.04) / 0.42));
    sqCell.current = sSize.get() / SQ;
  };
  useMotionValueEvent(introT, "change", sync);
  useMotionValueEvent(p, "change", (v) => {
    sync();
    setLanded(v >= 0.8);
  });
  useEffect(sync); // first frame, before any change events

  // Key = word + how many times it has appeared so far, so repeated words stay unique without using the index.
  const keyed = (text: string) => {
    const seen: Record<string, number> = {};
    return text.split(" ").map((w) => ({ w, key: `${w}-${(seen[w] = (seen[w] ?? 0) + 1)}` }));
  };
  const wordsA = lines.map(keyed);
  const line2 = keyed(swap.line2);
  const startOf = wordsA.map((_, li) => wordsA.slice(0, li).reduce((sum, ws) => sum + ws.length, 0));

  return (
    <div ref={wrapRef} style={{ height: reduce ? "100svh" : `calc(100svh + ${PIN}px)` }}>
      <div ref={stageRef} className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-5 text-center">
        <DitherField clearCenter build={outerBuild} world={outerWorld} skip={outerSkip} keep={outerKeep} pointer className="absolute inset-0 size-full" />

        {!reduce && (
          <motion.div
            aria-hidden
            style={{ left: sLeft, top: sTop, width: sSize, height: sSize, opacity: introDone ? 1 : 0 }}
            className="absolute"
          >
            <DitherField clearCenter clearAmount={sqClear} world={sqWorld} cellRef={sqCell} detail={1} className="size-full" />
          </motion.div>
        )}

        <h1 className="relative grid font-display text-[clamp(2.5rem,10.5vw,8.25rem)] italic leading-[0.95] tracking-[-0.03em] [text-shadow:0_0_28px_var(--background),0_0_10px_var(--background)]">
          <motion.span style={reduce ? undefined : { opacity: aOpacity, y: aY, filter: aBlur }} className="[grid-area:1/1]">
            {wordsA.map((ws, li) => (
              <span key={lines[li]} className="block">
                {ws.map(({ w, key }, wi) => (
                  <TileWord key={key} delay={0.08 + (startOf[li] + wi) * 0.1} show={introDone} reduce={!!reduce}>{w}</TileWord>
                ))}
              </span>
            ))}
          </motion.span>

          {/* Second headline: laid out from the start so the slot can be measured. */}
          <span aria-hidden className="pointer-events-none [grid-area:1/1]">
            <span className="block whitespace-nowrap">
              <TileWord delay={0} show={landed && !reduce} reduce={!!reduce}>{swap.before}</TileWord>
              {/* Never transformed, so its measured box is the square's true landing spot. */}
              <span ref={slotRef} className="mr-[0.25em] inline-block size-[0.62em] shrink-0 translate-y-[0.02em] align-[-0.02em]" />
              <TileWord delay={0.1} show={landed && !reduce} reduce={!!reduce}>{swap.after}</TileWord>
            </span>
            <span className="block">
              {line2.map(({ w, key }, i) => (
                <TileWord key={key} delay={0.2 + i * 0.1} show={landed && !reduce} reduce={!!reduce}>{w}</TileWord>
              ))}
            </span>
          </span>
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={introDone ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          className="relative mt-8 max-w-[34rem] text-pretty text-lg font-medium leading-relaxed [text-shadow:0_0_16px_var(--background),0_0_6px_var(--background)] sm:text-xl sm:font-normal"
        >
          {intro}
        </motion.p>
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={introDone ? { opacity: 1 } : undefined}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="relative mt-6 rounded-full bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
        >
          {note}
        </motion.p>
      </div>
    </div>
  );
}

/**
 * A word that arrives from a pixel tile: the tile pops at the word's start,
 * then the word wipes in from the left as the tile leaves.
 */
function TileWord({ delay, show, reduce, children }: { delay: number; show: boolean; reduce: boolean; children: string }) {
  if (reduce) return <span className="inline-block">{children}{" "}</span>;
  return (
    <span className="relative inline-block">
      <motion.span
        aria-hidden
        initial={false}
        animate={show ? { scale: [0, 1, 1, 0], opacity: [1, 1, 1, 0] } : { scale: 0, opacity: 0 }}
        transition={show ? { duration: 0.7, delay, times: [0, 0.3, 0.65, 1], ease: "easeOut" } : { duration: 0.15 }}
        className="dither-tile absolute bottom-[0.18em] left-0 size-[0.42em] origin-bottom-left rounded-[2px]"
      />
      <motion.span
        initial={false}
        animate={show ? { clipPath: "inset(0 0% 0 0)", opacity: 1, filter: "blur(0px)" } : { clipPath: "inset(0 100% 0 0)", opacity: 0, filter: "blur(6px)" }}
        transition={show ? { duration: 0.6, delay: delay + 0.22, ease: EASE } : { duration: 0.2 }}
        className="inline-block"
      >
        {children}
      </motion.span>
      {" "}
    </span>
  );
}
