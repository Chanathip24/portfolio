import "server-only";
import { z } from "zod";
import { CareerKind, PublishStatus, SocialPlatform, ToolKey } from "@/lib/enums";
import type { EntityName } from "./fields";

const oneOf = <T extends Record<string, string>>(o: T) => z.enum(Object.values(o) as [T[keyof T], ...T[keyof T][]]);
const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => text(max).min(1, "Required");
// Only http(s) or a site-relative path: never javascript: or data: URLs.
const link = z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/\S+$/.test(v) || /^\/[^\s/]/.test(v), "Use https://… or a /path");
const optionalLink = link.transform((v) => v || null);
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const order = int(0, 9999).default(0);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slug = z.string().trim().toLowerCase().max(96).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Lower-case words separated by dashes");
// A category or group named by its slug; whether it exists is the database's call (a foreign key / trigger).
const slugRef = z.string().trim().max(48).regex(SLUG, "Choose one of the listed options");
const body = z.looseObject({ type: z.literal("doc"), content: z.array(z.unknown()).optional() }).refine((d) => JSON.stringify(d).length < 400_000, "Content is too long");
const instant = z.string().trim().refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Not a date");

export const schemas = {
  post: z.object({
    title: required(160), slug, excerpt: text(400), category: slugRef, status: oneOf(PublishStatus), published_at: instant, image_url: link, image_alt: text(300), body,
  }),
  project: z.object({
    title: required(160), slug, client: text(120), status: oneOf(PublishStatus), published_at: instant, tags: z.array(slugRef).max(8),
    is_signature: z.boolean(), sort_order: order, image_url: link, image_alt: text(300), summary: text(500), live_url: optionalLink, preview_url: optionalLink, body,
  }),
  profile: z.object({
    display_name: required(120), role: text(120), location: text(120), headline: text(240), status_note: text(240),
    years_experience: int(0, 80), image_url: link, bio: body,
  }),
  social: z.object({
    platform: oneOf(SocialPlatform), label: required(60), handle: text(120), sort_order: order,
    url: z.string().trim().max(500).refine((v) => /^(https?:\/\/\S+|mailto:\S+@\S+)$/.test(v), "Use https://… or mailto:…"),
  }),
  skill: z.object({ name: required(80), group: slugRef, years: int(0, 60), note: text(240), sort_order: order }),
  tool: z.object({
    name: required(60), sort_order: order, logo_url: optionalLink,
    tool_key: z.preprocess((v) => (v === "" || v === undefined ? null : v), oneOf(ToolKey).nullable()),
  }),
  career: z.object({
    kind: oneOf(CareerKind), role: required(120), organisation: required(120), location: text(120), start_year: int(1950, 2100),
    end_year: z.preprocess((v) => (v === "" || v === undefined ? null : v), int(1950, 2100).nullable()),
    summary: text(500), highlights: z.array(text(240)).max(12).transform((l) => l.filter(Boolean)), sort_order: order,
  }).refine((c) => c.end_year === null || c.end_year >= c.start_year, { path: ["end_year"], message: "Before the start year" }),
  testimonial: z.object({
    quote: required(600), author_name: required(120), author_role: text(120), company: text(120), sort_order: order, avatar_url: optionalLink,
  }),
  postCategory: z.object({ name: required(48), slug: z.string().trim().toLowerCase().max(48).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Lower-case words separated by dashes"), sort_order: order }),
  projectCategory: z.object({ name: required(48), slug: z.string().trim().toLowerCase().max(48).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Lower-case words separated by dashes"), sort_order: order }),
  skillGroup: z.object({ name: required(48), slug: z.string().trim().toLowerCase().max(48).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Lower-case words separated by dashes"), sort_order: order }),
} satisfies Record<EntityName, z.ZodType>;

/** Table, cache tag, primary key and whether the admin may delete rows (the profile row is permanent). The three taxonomies are
 *  keyed by their slug. */
export const tables: Record<EntityName, { table: string; tag: "posts" | "projects" | "about"; deletable: boolean; key: "id" | "slug" }> = {
  post: { table: "posts", tag: "posts", deletable: true, key: "id" },
  project: { table: "projects", tag: "projects", deletable: true, key: "id" },
  profile: { table: "profile", tag: "about", deletable: false, key: "id" },
  social: { table: "socials", tag: "about", deletable: true, key: "id" },
  skill: { table: "skills", tag: "about", deletable: true, key: "id" },
  tool: { table: "tools", tag: "about", deletable: true, key: "id" },
  career: { table: "career", tag: "about", deletable: true, key: "id" },
  testimonial: { table: "testimonials", tag: "about", deletable: true, key: "id" },
  postCategory: { table: "post_categories", tag: "posts", deletable: true, key: "slug" },
  projectCategory: { table: "project_categories", tag: "projects", deletable: true, key: "slug" },
  skillGroup: { table: "skill_groups", tag: "about", deletable: true, key: "slug" },
};

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);

/** Words in a Tiptap document at ~200 words a minute, at least one minute. */
export function readingMinutes(doc: unknown) {
  let words = 0;
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const node = n as { text?: string; content?: unknown[] };
    if (node.text) words += node.text.split(/\s+/).filter(Boolean).length;
    node.content?.forEach(walk);
  };
  walk(doc);
  return Math.max(1, Math.round(words / 200));
}
