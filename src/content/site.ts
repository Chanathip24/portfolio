// SAMPLE CONTENT. Every name, project, number, note and answer below is a placeholder,
// and every image in public/mock/ is a generated mock (scripts/mock-images.mjs).
// Replace them with your own; the page reads everything from here.

export const owner = {
  name: "Your Name",
  firstName: "Your",
  role: "Full-stack developer",
  city: "Bangkok",
  timeZone: "Asia/Bangkok",
  email: "you@example.com",
  /** Where the About globe turns to as you scroll. */
  pin: { label: "Thailand", lat: 13.75, lon: 100.5 },
  socials: [
    { label: "GitHub", href: "https://github.com/your-handle" },
    { label: "LinkedIn", href: "#" },
    { label: "X", href: "#" },
  ],
};

export const nav = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#notes", label: "Notes" },
  { href: "#small-talk", label: "Small talk" },
];

export const hero = {
  lines: ["Developer who", "ships with care"],
  /** After the sky shrinks into its slot, this headline animates in; the slot sits between `before` and `after`. */
  swap: { before: "Full-stack", after: "Developer", line2: "who ships end to end" },
  intro:
    "I build interfaces and the systems underneath them, from the first sketch to the database migration, so that the product feels as good as it works.",
};

export type WorkItem = { slug: string; title: string; client: string; tags: string[]; image: string; href: string };

/** Two lead case studies, each paired with a wall of four smaller pieces. */
export const work: { lead: WorkItem; wall: WorkItem[] }[] = [
  {
    lead: { slug: "tidewater", title: "A shift planner clinics edit offline, with zero sync conflicts", client: "Tidewater · sample", tags: ["Product", "Sync", "Postgres"], image: "/mock/work-tidewater.svg", href: "/work/tidewater" },
    wall: [
      { slug: "pantry-search", title: "Pantry search", client: "Sample", tags: [], image: "/mock/work-pantry.svg", href: "/work/pantry-search" },
      { slug: "hearth-ci", title: "Hearth CI", client: "Sample", tags: [], image: "/mock/work-hearth.svg", href: "/work/hearth-ci" },
      { slug: "signal", title: "Signal", client: "Sample", tags: [], image: "/mock/work-signal.svg", href: "/work/signal" },
      { slug: "atlas", title: "Atlas", client: "Sample", tags: [], image: "/mock/work-atlas.svg", href: "/work/atlas" },
    ],
  },
  {
    lead: { slug: "ledgerline", title: "A bookkeeping API freelancers trust with their taxes", client: "Ledgerline · sample", tags: ["API", "Payments"], image: "/mock/work-ledgerline.svg", href: "/work/ledgerline" },
    wall: [
      { slug: "atlas", title: "Atlas", client: "Sample", tags: [], image: "/mock/work-atlas.svg", href: "/work/atlas" },
      { slug: "signal", title: "Signal", client: "Sample", tags: [], image: "/mock/work-signal.svg", href: "/work/signal" },
      { slug: "pantry-search", title: "Pantry search", client: "Sample", tags: [], image: "/mock/work-pantry.svg", href: "/work/pantry-search" },
      { slug: "hearth-ci", title: "Hearth CI", client: "Sample", tags: [], image: "/mock/work-hearth.svg", href: "/work/hearth-ci" },
    ],
  },
];

export const about = {
  heading: "Happiest mid-build",
  body: "Placeholder about text. I work best in motion: owning a feature from schema to hover state, writing down what surprised me, and shipping in small steps from Bangkok.",
};

export const notes = {
  heading: "Build notes",
  blurb: "Writing on code, craft, and the small decisions that make software feel right.",
  items: [
    { n: "05", date: "2026.10", title: "Sync without fear", image: "/mock/note-1.svg", hue: "oklch(0.62 0.15 160)", turn: -2 },
    { n: "04", date: "2026.08", title: "Ship the boring part", image: "/mock/note-2.svg", hue: "oklch(0.62 0.2 350)", turn: 1.5 },
    { n: "03", date: "2026.05", title: "Money is an integer", image: "/mock/note-3.svg", hue: "oklch(0.7 0.16 60)", turn: -1 },
    { n: "02", date: "2026.02", title: "Small diffs, calm days", image: "/mock/note-4.svg", hue: "oklch(0.62 0.15 240)", turn: 2 },
    { n: "01", date: "2025.11", title: "Hello, world", image: "/mock/note-5.svg", hue: "oklch(0.55 0.18 290)", turn: -1.5 },
  ],
};

export const smallTalk = {
  heading: "Small talk",
  blurb: "The short answers are here. For anything else, just ask.",
  items: [
    { q: "How did you get into code?", a: "Placeholder answer: a broken game mod at fourteen, and wanting to know why it broke." },
    { q: "What do you build?", a: "Placeholder answer: web products end to end, usually TypeScript on both sides with Postgres underneath." },
    { q: "Where are you based?", a: "Placeholder answer: Bangkok, working with teams across time zones." },
    { q: "What are you learning?", a: "Placeholder answer: Rust, and how to write shorter notes." },
    { q: "How can I get in touch?", a: "Placeholder answer: email is best. I reply within a day or two." },
  ],
};

/** Footer clocks: the first is home. */
export const clocks = [
  { city: "Bangkok, TH", timeZone: "Asia/Bangkok" },
  { city: "London, UK", timeZone: "Europe/London" },
  { city: "San Francisco, US", timeZone: "America/Los_Angeles" },
];
