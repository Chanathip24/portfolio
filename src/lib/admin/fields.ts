import { CareerKind, PublishStatus, SocialPlatform, ToolKey } from "@/lib/enums";
import { titleCase } from "@/lib/format";

/** What the admin form renders for each field. The server never trusts this: schemas.ts validates every write. */
export type Option = { value: string; label: string };
/**
 * `group` titles a section of the form. `aside` puts the section in the narrow column beside the main content (the publish
 * box of a post, its category and cover); fields without a group (the small side-panel forms) are not sectioned.
 * `lockedOnEdit` fields can be typed when something is created and are fixed afterwards (a category's slug).
 * Selects whose choices come from the database (categories, groups) have `options: []` here; the page passes the real list.
 */
export type Field = { name: string; label: string; hint?: string; placeholder?: string; wide?: boolean; group?: string; aside?: boolean; lockedOnEdit?: boolean } & (
  | { type: "text" | "textarea" | "url" | "image" | "richtext" | "lines" | "switch" | "datetime" }
  | { type: "number"; min?: number; max?: number; nullable?: boolean }
  | { type: "select" | "multiselect"; options: Option[] }
);

const opts = (values: Record<string, string>, label = titleCase): Option[] => Object.values(values).map((value) => ({ value, label: label(value) }));
const platformLabel: Record<string, string> = { github: "GitHub", linkedin: "LinkedIn", x: "X", youtube: "YouTube", bluesky: "Bluesky", email: "Email" };
const thisYear = new Date().getFullYear();
/** "0 years", "1 year", … for a Select. */
const yearsOf = (max: number): Option[] => Array.from({ length: max + 1 }, (_, n) => ({ value: String(n), label: n === 1 ? "1 year" : `${n} years` }));
/** Calendar years, newest first. */
const calendarYears = (from: number): Option[] => Array.from({ length: thisYear + 1 - from + 1 }, (_, i) => String(thisYear + 1 - i)).map((y) => ({ value: y, label: y }));
const sortOrder = (): Field => ({ name: "sort_order", label: "Order", type: "number", min: 0, max: 9999, placeholder: "0", hint: "Lower numbers come first." });

export const EntityName = {
  Post: "post", Project: "project", Profile: "profile", Social: "social", Skill: "skill", Tool: "tool", Career: "career", Testimonial: "testimonial",
  PostCategory: "postCategory", ProjectCategory: "projectCategory", SkillGroup: "skillGroup",
} as const;
export type EntityName = (typeof EntityName)[keyof typeof EntityName];

/** A name and a slug (fixed once created), in the order the admin sets. Shared by the three managed lists. */
const taxonomy = (what: string): Field[] => [
  { name: "name", label: "Name", type: "text", placeholder: `e.g. ${what}`, hint: "Shown on the site." },
  { name: "slug", label: "URL name", type: "text", lockedOnEdit: true, placeholder: "auto-from-name", hint: "Lower-case words and dashes. Can't be changed later. Empty uses the name." },
  sortOrder(),
];

export const fields: Record<EntityName, Field[]> = {
  post: [
    { name: "title", label: "Title", type: "text", wide: true, placeholder: "A clear title for the post" },
    { name: "excerpt", label: "Excerpt", type: "textarea", wide: true, placeholder: "One or two sentences that make someone want to read it", hint: "Shown on cards and in search results. Up to 400 characters." },
    { name: "body", label: "Content", type: "richtext", wide: true },
    { name: "status", label: "Status", type: "select", options: opts(PublishStatus), group: "Publish", aside: true },
    { name: "published_at", label: "Publish date and time", type: "datetime", group: "Publish", aside: true, hint: "Set a future time to schedule it: the post stays hidden until then." },
    { name: "category", label: "Category", type: "select", options: [], group: "Organise", aside: true },
    { name: "slug", label: "URL slug", type: "text", placeholder: "my-post", hint: "Lower-case words and dashes. Empty uses the title.", group: "Organise", aside: true },
    { name: "image_url", label: "Cover image", type: "image", group: "Cover image", aside: true },
    { name: "image_alt", label: "Cover image description", type: "text", group: "Cover image", aside: true, placeholder: "Describe the image", hint: "Read aloud by screen readers, and shown if the image fails to load." },
  ],
  project: [
    { name: "title", label: "Title", type: "text", wide: true, placeholder: "Project name" },
    { name: "summary", label: "Summary", type: "textarea", wide: true, placeholder: "What it is and what you did, in a sentence or two", hint: "Up to 500 characters." },
    { name: "client", label: "Client", type: "text", placeholder: "Who it was for" },
    { name: "live_url", label: "Live site", type: "url", placeholder: "https://example.com", hint: "Opened in a new tab." },
    { name: "preview_url", label: "Preview page", type: "url", wide: true, placeholder: "https://example.com", hint: "Framed in the preview window. Leave empty to show the cover instead." },
    { name: "body", label: "Content", type: "richtext", wide: true },
    { name: "status", label: "Status", type: "select", options: opts(PublishStatus), group: "Publish", aside: true },
    { name: "published_at", label: "Publish date and time", type: "datetime", group: "Publish", aside: true, hint: "Also sets the year shown on the project. A future time schedules it." },
    { name: "is_signature", label: "Signature project", type: "switch", group: "Display", aside: true, hint: "Signature projects get the large card on the home page." },
    sortOrderIn("Display"),
    { name: "tags", label: "Categories", type: "multiselect", options: [], group: "Organise", aside: true },
    { name: "slug", label: "URL slug", type: "text", placeholder: "my-project", hint: "Lower-case words and dashes. Empty uses the title.", group: "Organise", aside: true },
    { name: "image_url", label: "Cover image", type: "image", group: "Cover image", aside: true },
    { name: "image_alt", label: "Cover image description", type: "text", group: "Cover image", aside: true, placeholder: "Describe the image", hint: "Read aloud by screen readers, and shown if the image fails to load." },
  ],
  profile: [
    { name: "display_name", label: "Name", type: "text", group: "Basics", placeholder: "Your name" },
    { name: "role", label: "Role", type: "text", group: "Basics", placeholder: "What you do, e.g. Full-stack developer" },
    { name: "location", label: "Location", type: "text", group: "Basics", placeholder: "City, Country" },
    { name: "years_experience", label: "Years of experience", type: "select", options: yearsOf(50), group: "Basics" },
    { name: "headline", label: "Headline", type: "text", wide: true, group: "Basics", placeholder: "One line that says who you are" },
    { name: "status_note", label: "Availability note", type: "text", wide: true, group: "Basics", placeholder: "e.g. Open to small projects from January" },
    { name: "image_url", label: "Portrait", type: "image", wide: true, group: "Portrait" },
    { name: "bio", label: "Bio", type: "richtext", wide: true, group: "Bio" },
  ],
  social: [
    { name: "platform", label: "Platform", type: "select", options: opts(SocialPlatform, (v) => platformLabel[v] ?? titleCase(v)) },
    { name: "label", label: "Label", type: "text", placeholder: "e.g. GitHub" },
    { name: "handle", label: "Handle", type: "text", placeholder: "@yourname" },
    { name: "url", label: "Link", type: "url", wide: true, placeholder: "https://github.com/yourname" },
    sortOrder(),
  ],
  skill: [
    { name: "name", label: "Skill", type: "text", placeholder: "e.g. TypeScript" },
    { name: "group", label: "Group", type: "select", options: [] },
    { name: "years", label: "Experience", type: "select", options: yearsOf(40) },
    sortOrder(),
    { name: "note", label: "Note", type: "text", wide: true, placeholder: "What you use it for" },
  ],
  tool: [
    { name: "name", label: "Name", type: "text", placeholder: "e.g. Figma" },
    { name: "tool_key", label: "Built-in icon", type: "select", options: [{ value: "", label: "None (use the logo or initials)" }, ...opts(ToolKey)], hint: "Used when there is no logo." },
    { name: "logo_url", label: "Logo", type: "image", wide: true, hint: "A square or wide PNG, JPG or WebP. It replaces the built-in icon." },
    sortOrder(),
  ],
  career: [
    { name: "kind", label: "Kind", type: "select", options: opts(CareerKind) },
    { name: "role", label: "Role or degree", type: "text", placeholder: "e.g. Senior Developer" },
    { name: "organisation", label: "Organisation", type: "text", placeholder: "Company or school" },
    { name: "location", label: "Location", type: "text", placeholder: "City, Country" },
    { name: "start_year", label: "Start year", type: "select", options: calendarYears(1970) },
    { name: "end_year", label: "End year", type: "select", options: [{ value: "", label: "Present (still there)" }, ...calendarYears(1970)] },
    sortOrder(),
    { name: "summary", label: "Summary", type: "textarea", wide: true, placeholder: "What the role was about" },
    { name: "highlights", label: "Highlights", type: "lines", wide: true, placeholder: "One achievement per line", hint: "One per line." },
  ],
  testimonial: [
    { name: "quote", label: "Quote", type: "textarea", wide: true, placeholder: "What they said about working with you" },
    { name: "author_name", label: "Name", type: "text", placeholder: "Their name" },
    { name: "author_role", label: "Role", type: "text", placeholder: "Their job title" },
    { name: "company", label: "Company", type: "text", placeholder: "Their company" },
    sortOrder(),
    { name: "avatar_url", label: "Photo", type: "image", wide: true },
  ],
  postCategory: taxonomy("Engineering"),
  projectCategory: taxonomy("Payments"),
  skillGroup: taxonomy("Frontend"),
};

function sortOrderIn(group: string): Field {
  return { ...sortOrder(), group, aside: true };
}

const emptyDoc = { type: "doc", content: [] };

/** Starting values for the "new" forms. Selects fed by the database start empty; the page fills in the first choice. */
export const blank: Record<EntityName, Record<string, unknown>> = {
  post: { title: "", slug: "", category: "", status: "draft", published_at: "", image_url: "", image_alt: "", excerpt: "", body: emptyDoc },
  project: { title: "", slug: "", client: "", status: "draft", published_at: "", tags: [], is_signature: false, sort_order: 0, image_url: "", image_alt: "", summary: "", live_url: "", preview_url: "", body: emptyDoc },
  profile: {},
  social: { platform: "github", label: "", handle: "", url: "", sort_order: 0 },
  skill: { name: "", group: "", years: 0, note: "", sort_order: 0 },
  tool: { name: "", tool_key: "", logo_url: "", sort_order: 0 },
  career: { kind: "work", role: "", organisation: "", location: "", start_year: thisYear, end_year: null, summary: "", highlights: [], sort_order: 0 },
  testimonial: { quote: "", author_name: "", author_role: "", company: "", avatar_url: "", sort_order: 0 },
  postCategory: { name: "", slug: "", sort_order: 0 },
  projectCategory: { name: "", slug: "", sort_order: 0 },
  skillGroup: { name: "", slug: "", sort_order: 0 },
};
