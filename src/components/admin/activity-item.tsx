import { UserAvatar } from "@/components/admin/user-avatar";
import type { AuditRow } from "@/lib/admin/data";
import { timeAgo } from "@/lib/format";

const NOUN: Record<string, string> = {
  posts: "post", projects: "project", profile: "profile", socials: "social link", skills: "skill", tools: "tool", career: "career entry", testimonials: "testimonial",
  post_categories: "blog category", project_categories: "work category", skill_groups: "skill group", app_settings: "settings",
};

/** "Chan updated the post “Sync without fear” · 5 min ago". Events recorded by the app already read as sentences. */
export function ActivityItem({ row }: { row: AuditRow }) {
  const who = row.actor_email ?? "System";
  return (
    <li className="flex items-start gap-3 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <UserAvatar email={who} className="mt-0.5 size-8" />
      <p className="min-w-0 flex-1 text-sm leading-snug">
        <span className="font-medium">{who}</span>{" "}
        {row.action === "event" ? (
          <span className="text-muted-foreground">{row.summary.charAt(0).toLowerCase() + row.summary.slice(1)}</span>
        ) : (
          <span className="text-muted-foreground">{row.action} the {NOUN[row.entity] ?? row.entity} <span className="text-foreground">“{row.summary}”</span></span>
        )}
      </p>
      <time dateTime={row.at} className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">{timeAgo(row.at)}</time>
    </li>
  );
}
