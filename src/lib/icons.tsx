import type { IconType } from "react-icons";
import { FaLinkedinIn } from "react-icons/fa6";
import { SiBluesky, SiDocker, SiFigma, SiGit, SiGithub, SiGraphql, SiNextdotjs, SiNodedotjs, SiPostgresql, SiReact, SiRedis, SiRust, SiSupabase, SiTailwindcss, SiTypescript, SiVercel, SiX, SiYoutube } from "react-icons/si";
import { Mail } from "lucide-react";
import { SocialPlatform, ToolKey } from "@/lib/enums";

// The API sends only the enum keys. Typed Record<Enum, ...>: adding a value to an enum without an icon here
// is a compile error, so an icon can't go missing at runtime.
export const toolIcons: Record<ToolKey, IconType> = {
  [ToolKey.TypeScript]: SiTypescript,
  [ToolKey.React]: SiReact,
  [ToolKey.Nextjs]: SiNextdotjs,
  [ToolKey.Nodejs]: SiNodedotjs,
  [ToolKey.Postgres]: SiPostgresql,
  [ToolKey.Supabase]: SiSupabase,
  [ToolKey.Tailwind]: SiTailwindcss,
  [ToolKey.Docker]: SiDocker,
  [ToolKey.Git]: SiGit,
  [ToolKey.Figma]: SiFigma,
  [ToolKey.Vercel]: SiVercel,
  [ToolKey.Rust]: SiRust,
  [ToolKey.Redis]: SiRedis,
  [ToolKey.GraphQL]: SiGraphql,
};

export const socialIcons: Record<SocialPlatform, IconType> = {
  [SocialPlatform.GitHub]: SiGithub,
  [SocialPlatform.LinkedIn]: FaLinkedinIn,
  [SocialPlatform.X]: SiX,
  [SocialPlatform.YouTube]: SiYoutube,
  [SocialPlatform.Bluesky]: SiBluesky,
  [SocialPlatform.Email]: Mail as unknown as IconType,
};

// Brand colour per tool, used to tint its tile. Typed Record<ToolKey, ...> like the icons: a tool added to the enum
// without a colour here is a compile error. Black marks (Next.js, Vercel) follow the page's foreground so they stay
// visible in both themes.
export const toolColors: Record<ToolKey, string> = {
  [ToolKey.TypeScript]: "#3178c6",
  [ToolKey.React]: "#149eca",
  [ToolKey.Nextjs]: "var(--foreground)",
  [ToolKey.Nodejs]: "#5fa04e",
  [ToolKey.Postgres]: "#4169e1",
  [ToolKey.Supabase]: "#2eb67d",
  [ToolKey.Tailwind]: "#06a6c4",
  [ToolKey.Docker]: "#2496ed",
  [ToolKey.Git]: "#f05032",
  [ToolKey.Figma]: "#f24e1e",
  [ToolKey.Vercel]: "var(--foreground)",
  [ToolKey.Rust]: "#ce422b",
  [ToolKey.Redis]: "#dc382d",
  [ToolKey.GraphQL]: "#e10098",
};
