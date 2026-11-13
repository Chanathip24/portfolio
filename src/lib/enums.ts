// Closed sets of values, each as a const object plus a union type of the same name:
//   Theme.Dark (a value)    let t: Theme (the type)
// Plain objects rather than TS `enum`: no runtime enum code, and the values are the exact strings stored
// in the API/DB (the ones marked "pg enum" are meant to become Postgres enums in Supabase).

/** Light or dark; the value is also the `theme` localStorage entry and the `<html class>` name. */
export const Theme = { Light: "light", Dark: "dark" } as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

/** Anchors on the home page. The value is the element id and the URL fragment. */
export const SectionId = { Top: "top", Work: "work", About: "about", Notes: "notes", SmallTalk: "small-talk" } as const;
export type SectionId = (typeof SectionId)[keyof typeof SectionId];
export const hash = (id: SectionId) => `#${id}` as const;

/** pg enum publish_status, for projects and posts. Only Published rows are shown on the site. */
export const PublishStatus = { Draft: "draft", Published: "published", Archived: "archived" } as const;
export type PublishStatus = (typeof PublishStatus)[keyof typeof PublishStatus];

/** pg enum post_category. The blog page filters by it; the value is the URL param. */
export const PostCategory = { Engineering: "engineering", Design: "design", Data: "data", Process: "process" } as const;
export type PostCategory = (typeof PostCategory)[keyof typeof PostCategory];

/** pg enum project_tag (or a tags table, if editors need to add their own). */
export const ProjectTag = { Product: "Product", Sync: "Sync", Postgres: "Postgres", Api: "API", Payments: "Payments" } as const;
export type ProjectTag = (typeof ProjectTag)[keyof typeof ProjectTag];

/** Tone of a Callout block in project bodies. */
export const CalloutTone = { Info: "info", Success: "success", Warning: "warning" } as const;
export type CalloutTone = (typeof CalloutTone)[keyof typeof CalloutTone];

/** Names of the custom Tiptap nodes (the built-in ones keep Tiptap's own names). */
export const NodeType = { Callout: "callout" } as const;
export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/** pg enum skill_group. The about page groups skills into tabs by it. */
export const SkillGroup = { Frontend: "frontend", Backend: "backend", Data: "data", Tooling: "tooling" } as const;
export type SkillGroup = (typeof SkillGroup)[keyof typeof SkillGroup];

/** pg enum tool_key. The database stores only this key; the icon for each lives in the frontend (lib/icons.tsx). */
export const ToolKey = {
  TypeScript: "typescript", React: "react", Nextjs: "nextjs", Nodejs: "nodejs", Postgres: "postgres", Supabase: "supabase",
  Tailwind: "tailwind", Docker: "docker", Git: "git", Figma: "figma", Vercel: "vercel", Rust: "rust", Redis: "redis", GraphQL: "graphql",
} as const;
export type ToolKey = (typeof ToolKey)[keyof typeof ToolKey];

/** pg enum social_platform. Same idea as ToolKey: the database stores the key, the frontend maps it to an icon. */
export const SocialPlatform = { GitHub: "github", LinkedIn: "linkedin", X: "x", YouTube: "youtube", Bluesky: "bluesky", Email: "email" } as const;
export type SocialPlatform = (typeof SocialPlatform)[keyof typeof SocialPlatform];

/** How the blog page orders posts. The value is the `sort` URL param (Latest is the default and is left out of the URL). */
export const PostSort = { Latest: "latest", Views: "views" } as const;
export type PostSort = (typeof PostSort)[keyof typeof PostSort];

/** pg enum career_kind. Education, employment and independent work are styled differently on the career path. */
export const CareerKind = { Education: "education", Work: "work", Freelance: "freelance" } as const;
export type CareerKind = (typeof CareerKind)[keyof typeof CareerKind];
