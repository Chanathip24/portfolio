import "server-only";
import { db, visibilityOf, type Visibility } from "./core";

// ─── overview ────────────────────────────────────────────────────────────────────────────────────
export type Analytics = {
  views: number;
  visitors: number;
  daily: { day: string; views: number; visitors: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  top_referrers: { referrer: string; views: number }[];
};
export async function getAnalytics(days: number) {
  const { data } = await (await db()).rpc("analytics_summary", { days });
  return data as Analytics | null;
}

export type ContentSummary = Record<Visibility, number> & { total: number };
/** Posts and projects by what a visitor can see: live, scheduled, draft, archived. */
export async function getContentSummary() {
  const sb = await db();
  const tally = (rows: { status: string; published_at: string }[] | null): ContentSummary => {
    const out: ContentSummary = { live: 0, scheduled: 0, draft: 0, archived: 0, total: 0 };
    const now = Date.now();
    for (const r of rows ?? []) { out[visibilityOf(r.status, r.published_at, now)]++; out.total++; }
    return out;
  };
  const [posts, projects] = await Promise.all([sb.from("posts").select("status,published_at"), sb.from("projects").select("status,published_at")]);
  return { posts: tally(posts.data), projects: tally(projects.data) };
}

export type SectionAnalytics = {
  views: number; visitors: number;
  daily: { day: string; views: number; visitors: number }[];
  top: { path: string; views: number; visitors: number }[];
  referrers: { referrer: string; views: number }[];
};
/** Views of a whole section ("/blog/" or "/work/") or of one page in it (`path`), over the last `days` days. */
export async function getSectionAnalytics(prefix: "/blog/" | "/work/", days: number, path?: string) {
  const { data } = await (await db()).rpc("section_analytics", { p_prefix: prefix, p_path: path ?? null, days });
  return data as SectionAnalytics | null;
}

export type VitalsSummary = {
  samples: number;
  metrics: { metric: string; n: number; p75: number; good: number; mid: number; poor: number }[];
  daily: { day: string; metric: string; p75: number; n: number }[];
  slow_pages: { path: string; p75: number; n: number }[];
  devices: { device: string; n: number }[];
};
export async function getPerformance(days: number) {
  const { data } = await (await db()).rpc("performance_summary", { days });
  return data as VitalsSummary | null;
}
