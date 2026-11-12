import { hash, SectionId } from "@/lib/enums";

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
  { href: hash(SectionId.Work), label: "Work" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: hash(SectionId.SmallTalk), label: "Small talk" },
];

export const hero = {
  lines: ["Developer who", "ships with care"],
  /** After the sky shrinks into its slot, this headline animates in; the slot sits between `before` and `after`. */
  swap: { before: "Full-stack", after: "Developer", line2: "who ships end to end" },
  intro:
    "I build interfaces and the systems underneath them, from the first sketch to the database migration, so that the product feels as good as it works.",
};

export const about = {
  heading: "Happiest mid-build",
  body: "Placeholder about text. I work best in motion: owning a feature from schema to hover state, writing down what surprised me, and shipping in small steps from Bangkok.",
};

export const notes = {
  heading: "Build notes",
  blurb: "Writing on code, craft, and the small decisions that make software feel right.",
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
