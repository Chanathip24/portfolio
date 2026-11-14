/** Shared by the two cookie-less beacons (/api/track and /api/vitals). */

/** Only real public routes are recorded, so the logs can't be filled with made-up paths. */
export const KNOWN_PATH = /^\/(?:|blog|about|work|blog\/[a-z0-9-]+|work\/[a-z0-9-]+)$/;
export const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|node-fetch/i;

/** The path of a URL without its query, hash or trailing slash. */
export const cleanPath = (raw: string) => raw.split(/[?#]/)[0].replace(/(.)\/$/, "$1");

/** Core Web Vitals: [good up to, poor from], in ms (CLS has no unit). From web.dev/articles/vitals. */
export const VITALS = {
  LCP: { short: "Main content", label: "Largest Contentful Paint", good: 2500, poor: 4000, unit: "ms", hint: "How fast the main content appears" },
  INP: { short: "Responsiveness", label: "Interaction to Next Paint", good: 200, poor: 500, unit: "ms", hint: "How quickly the page reacts to a tap or click" },
  CLS: { short: "Stability", label: "Cumulative Layout Shift", good: 0.1, poor: 0.25, unit: "", hint: "How much the page jumps while loading" },
  FCP: { short: "First paint", label: "First Contentful Paint", good: 1800, poor: 3000, unit: "ms", hint: "When anything first appears" },
  TTFB: { short: "Server answer", label: "Time to First Byte", good: 800, poor: 1800, unit: "ms", hint: "How fast the server answers" },
} as const;
export type VitalName = keyof typeof VITALS;
export const rate = (name: VitalName, value: number) => (value <= VITALS[name].good ? "good" : value <= VITALS[name].poor ? "needs-improvement" : "poor");
