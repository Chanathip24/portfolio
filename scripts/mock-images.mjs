// Generates MOCK images into public/mock/. Replace them with real screenshots later.
//   node scripts/mock-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const out = new URL("../public/mock/", import.meta.url);
mkdirSync(out, { recursive: true });

// Small deterministic PRNG so the images are stable between runs.
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** A fake app screenshot: window chrome, sidebar, header, cards, a chart. */
function appShot({ name, w, h, accent, bg, dark = false, seed }) {
  const r = rng(seed);
  const ink = dark ? "#e8e8ea" : "#16161a";
  const panel = dark ? "#1f1f24" : "#ffffff";
  const line = dark ? "#2e2e35" : "#e6e6ea";
  const muted = dark ? "#55555f" : "#c9c9cf";
  const pad = w * 0.06, winW = w - pad * 2, winH = h - pad * 1.4, x0 = pad, y0 = pad;
  const side = winW * 0.17;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;
  s += `<rect width="${w}" height="${h}" fill="${bg}"/>`;
  // soft pixel field behind the window
  for (let i = 0; i < 90; i++) {
    const cx = Math.floor(r() * (w / 24)) * 24, cy = Math.floor(r() * (h / 24)) * 24;
    s += `<rect x="${cx}" y="${cy}" width="24" height="24" fill="${accent}" opacity="${(0.12 + r() * 0.25).toFixed(2)}"/>`;
  }
  s += `<rect x="${x0}" y="${y0}" width="${winW}" height="${winH}" rx="16" fill="${panel}" stroke="${line}"/>`;
  [0, 1, 2].forEach((i) => (s += `<circle cx="${x0 + 22 + i * 16}" cy="${y0 + 20}" r="5" fill="${muted}"/>`));
  s += `<line x1="${x0}" y1="${y0 + 40}" x2="${x0 + winW}" y2="${y0 + 40}" stroke="${line}"/>`;
  s += `<line x1="${x0 + side}" y1="${y0 + 40}" x2="${x0 + side}" y2="${y0 + winH}" stroke="${line}"/>`;
  for (let i = 0; i < 7; i++) s += `<rect x="${x0 + 18}" y="${y0 + 64 + i * 30}" width="${side * (0.4 + r() * 0.4)}" height="9" rx="4" fill="${i === 1 ? accent : muted}"/>`;
  const cx = x0 + side + 28, cw = winW - side - 56;
  s += `<text x="${cx}" y="${y0 + 82}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(w * 0.024)}" font-weight="600" fill="${ink}">${name}</text>`;
  const cards = 3, gap = 16, cardW = (cw - gap * (cards - 1)) / cards;
  for (let i = 0; i < cards; i++) {
    const x = cx + i * (cardW + gap), y = y0 + 104;
    s += `<rect x="${x}" y="${y}" width="${cardW}" height="${winH * 0.2}" rx="10" fill="none" stroke="${line}"/>`;
    s += `<rect x="${x + 14}" y="${y + 16}" width="${cardW * 0.4}" height="8" rx="4" fill="${muted}"/>`;
    s += `<text x="${x + 14}" y="${y + 16 + winH * 0.11}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(w * 0.03)}" font-weight="600" fill="${i === 0 ? accent : ink}">${Math.round(r() * 900 + 100)}</text>`;
  }
  const chY = y0 + 104 + winH * 0.2 + 22, chH = winH - (chY - y0) - 28;
  s += `<rect x="${cx}" y="${chY}" width="${cw}" height="${chH}" rx="10" fill="none" stroke="${line}"/>`;
  const bars = 18, bw = (cw - 40) / bars;
  for (let i = 0; i < bars; i++) {
    const bh = (0.25 + r() * 0.65) * (chH - 40);
    s += `<rect x="${cx + 20 + i * bw + 3}" y="${chY + chH - 20 - bh}" width="${bw - 6}" height="${bh}" rx="3" fill="${accent}" opacity="${i % 3 === 0 ? 1 : 0.45}"/>`;
  }
  return s + `</svg>`;
}

/** A pixel landscape (mountain, house, sun) in one hue, for note stamps. */
function landscape({ hue, seed }) {
  const r = rng(seed), W = 48, H = 40, c = 10;
  const tone = (l) => `hsl(${hue} 80% ${l}%)`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * c} ${H * c}" width="${W * c}" height="${H * c}" shape-rendering="crispEdges">`;
  const peak = 8 + r() * 10, px = 10 + r() * 28, sunX = 34 + r() * 8;
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const mountain = y > peak + Math.abs(x - px) * 0.7;
      const ground = y > H * 0.72;
      const house = x > px + 4 && x < px + 12 && y > H * 0.58 && y <= H * 0.72;
      const roof = x > px + 3 && x < px + 13 && y > H * 0.52 - (6 - Math.abs(x - px - 8)) * 0.4 && y <= H * 0.58;
      const sun = Math.hypot(x - sunX, y - 7) < 4;
      let v = 0.08 + (y / H) * 0.25; // sky gradient
      if (sun) v = 0.15;
      if (mountain) v = 0.55 + ((x + y) % 5) * 0.03;
      if (ground) v = 0.35;
      if (roof) v = 0.85;
      if (house) v = 0.05;
      const th = (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const level = v > 0.66 + th * 0.2 ? 30 : v > 0.25 + th * 0.4 ? 55 : 92;
      if (level !== 92) s += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="${tone(level)}"/>`;
    }
  return s + `</svg>`;
}

const work = [
  { file: "work-tidewater", name: "Tidewater", w: 1400, h: 1000, accent: "#14a38b", bg: "#d9f2ec", seed: 3 },
  { file: "work-ledgerline", name: "Ledgerline", w: 1400, h: 1000, accent: "#3d5afe", bg: "#e3e8ff", seed: 7 },
  { file: "work-pantry", name: "Pantry", w: 800, h: 560, accent: "#f59e0b", bg: "#fdf0d5", seed: 11 },
  { file: "work-hearth", name: "Hearth CI", w: 800, h: 560, accent: "#22c55e", bg: "#141418", dark: true, seed: 13 },
  { file: "work-signal", name: "Signal", w: 800, h: 560, accent: "#ec4899", bg: "#fde2ef", seed: 17 },
  { file: "work-atlas", name: "Atlas", w: 800, h: 560, accent: "#0ea5e9", bg: "#101317", dark: true, seed: 19 },
];
for (const it of work) writeFileSync(new URL(`${it.file}.svg`, out), appShot(it));

const notes = [{ hue: 150 }, { hue: 330 }, { hue: 32 }, { hue: 205 }, { hue: 265 }];
notes.forEach((n, i) => writeFileSync(new URL(`note-${i + 1}.svg`, out), landscape({ ...n, seed: 31 + i * 7 })));

console.log(`wrote ${work.length + notes.length} mock images to public/mock/`);
