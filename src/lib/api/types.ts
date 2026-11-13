import type { JSONContent } from "@tiptap/core";
import type { CareerKind, PostCategory, ProjectTag, PublishStatus, SkillGroup, SocialPlatform, ToolKey } from "@/lib/enums";

// Response shapes of the API, written the way Supabase/PostgREST returns them: snake_case columns,
// uuid ids, ISO timestamps, jsonb as-is. src/mock/api/*.json are sample responses of these shapes.
// Use them to plan the tables:
//   projects(id uuid pk, slug text unique, title, client, tags project_tag[], status publish_status,
//            is_signature bool default false, sort_order int, image_url, summary, live_url null, preview_url null, body jsonb, created_at)
// The home page layout is derived from `is_signature`; there is no separate layout table.

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  client: string;
  tags: ProjectTag[];
  status: PublishStatus;
  /** Signature projects get the large card with full detail; the rest are small cards with a hover preview. */
  is_signature: boolean;
  sort_order: number;
  image_url: string;
  summary: string;
  /** The real, public site. Opened in a new tab; it is not framed, since many sites refuse to be. */
  live_url: string | null;
  /** A page the preview dialog may frame and let visitors try (the site itself if it allows framing, or a demo). null shows the cover instead. */
  preview_url: string | null;
  created_at: string;
};
export type ProjectDetailRow = ProjectRow & { body: JSONContent };

/** GET /projects */
export type ProjectsResponse = { data: ProjectRow[]; count: number };
/** GET /projects/:slug */
export type ProjectResponse = { data: ProjectDetailRow };

// posts(id uuid pk, slug text unique, title, excerpt, category post_category, status publish_status,
//       reading_minutes int, image_url, published_at timestamptz, updated_at timestamptz, author_id -> authors, views int default 0, body jsonb)
//       -- list and detail rows embed the author; list rows omit body
//   authors(id, name, role, bio, avatar_url null, profile_href null)
export type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  status: PublishStatus;
  reading_minutes: number;
  image_url: string;
  published_at: string;
  updated_at: string;
  author_id: string;
  /** Page views. In the real database this is a counter the app increments (or a count over a views table). */
  views: number;
  /** Embedded, as Supabase returns it for select("*, author:authors(*)"). */
  author: AuthorRow;
};
export type AuthorRow = { id: string; name: string; role: string; bio: string; avatar_url: string | null; profile_href: string | null };
export type PostDetailRow = PostRow & { body: JSONContent };
/** GET /posts/:slug */
export type PostResponse = { data: PostDetailRow };
/** GET /posts */
export type PostsResponse = { data: PostRow[]; count: number };

// About page tables:
//   profile(id, display_name, role, location, headline, status_note, years_experience, image_url, bio jsonb)   -- one row
//   socials(id, profile_id -> profile, platform social_platform, label, handle, url, sort_order)
//   skills(id, name, "group" skill_group, years int, note, sort_order)
//   tools(id, name, tool_key tool_key, sort_order)
//   career(id, kind career_kind, role, organisation, location, start_year int, end_year int null = still here, summary, highlights text[], sort_order)
//   testimonials(id, quote, author_name, author_role, company, avatar_url null, sort_order)
export type SocialRow = { id: string; platform: SocialPlatform; label: string; handle: string; url: string; sort_order: number };
export type ProfileRow = {
  id: string;
  display_name: string;
  role: string;
  location: string;
  headline: string;
  status_note: string;
  years_experience: number;
  image_url: string;
  bio: JSONContent;
  /** Embedded rows, as Supabase returns them for select("*, socials(*)"). */
  socials: SocialRow[];
};
export type SkillRow = { id: string; name: string; group: SkillGroup; years: number; note: string; sort_order: number };
export type ToolRow = { id: string; name: string; tool_key: ToolKey; sort_order: number };
export type TestimonialRow = { id: string; quote: string; author_name: string; author_role: string; company: string; avatar_url: string | null; sort_order: number };

/** GET /profile */
export type ProfileResponse = { data: ProfileRow };
/** GET /skills */
export type SkillsResponse = { data: SkillRow[]; count: number };
/** GET /tools */
export type ToolsResponse = { data: ToolRow[]; count: number };
/** GET /testimonials */
export type TestimonialsResponse = { data: TestimonialRow[]; count: number };

export type CareerRow = {
  id: string;
  kind: CareerKind;
  role: string;
  organisation: string;
  location: string;
  start_year: number;
  /** null means the role is current. */
  end_year: number | null;
  summary: string;
  highlights: string[];
  sort_order: number;
};
/** GET /career */
export type CareerResponse = { data: CareerRow[]; count: number };
