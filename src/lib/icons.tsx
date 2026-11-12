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
