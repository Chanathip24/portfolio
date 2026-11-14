import { Activity, BarChart3, FolderKanban, Globe, ShieldCheck, TrendingDown, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { ActivityItem } from "@/components/admin/activity-item";
import { DashCard } from "@/components/admin/dash-card";
import { PageHeader } from "@/components/admin/page-header";
import { UserAvatar } from "@/components/admin/user-avatar";
import { ChartMenu } from "@/components/admin/chart-card";
import { ChartPanel } from "@/components/admin/chart-panel";
import { Donut, Legend, ViewsChart } from "@/components/admin/charts";
import { RankList, SegmentedNav } from "@/components/admin/shared";
import { UserTiles, roleSlices } from "@/components/admin/user-insights";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin/auth";
import { type ContentSummary, getAdminStatus, getAnalytics, getContentSummary, listAudit, listPosts, listProjects } from "@/lib/admin/data";
import { userStats } from "@/lib/admin/user-stats";
import { listUsers, usersConfigured } from "@/lib/admin/users";
import { formatCount, formatDate, timeAgo } from "@/lib/format";
import { cn } from "cn";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
const RANGES = [7, 30, 90];

export default async function Overview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range)) ? Number(range) : 30;
  const [me, stats, twice, content, audit, admins, posts, projects, users] = await Promise.all([
    requireAdmin(), getAnalytics(days), getAnalytics(days * 2), getContentSummary(), listAudit({ limit: 6 }), getAdminStatus(), listPosts({ creators: false }), listProjects({ creators: false }), usersConfigured ? listUsers() : null,
  ]);
  const people = users ? userStats(users) : null;
  // What still needs a decision: scheduled and draft items, soonest first, with where to edit them.
  const waiting = [
    ...posts.map((p) => ({ id: p.id, title: p.title, kind: "Post", href: `/admin/posts/${p.id}`, when: p.published_at, visibility: p.visibility })),
    ...projects.map((p) => ({ id: p.id, title: p.title, kind: "Project", href: `/admin/projects/${p.id}`, when: p.published_at, visibility: p.visibility })),
  ].filter((i) => i.visibility === "scheduled" || i.visibility === "draft")
    .sort((a, b) => Number(b.visibility === "scheduled") - Number(a.visibility === "scheduled") || a.when.localeCompare(b.when)).slice(0, 4);
  const views = stats?.views ?? 0;
  const before = Math.max(0, (twice?.views ?? 0) - views); // the same number of days just before this period
  const change = before > 0 ? Math.round(((views - before) / before) * 100) : null;
  const postPages = (stats?.top_pages ?? []).filter((p) => p.path.startsWith("/blog/"));

  return (
    <>
      <PageHeader title="Overview" description="What visitors did, what changed and who is looking after the site."
        action={<ChartMenu charts={[{ id: "overview-views", label: "Page views" }, { id: "overview-people", label: "People" }]} />} />
      <div className="grid gap-4 lg:grid-cols-12">
        <ChartPanel id="overview-views" className="lg:col-span-8" icon={BarChart3} title="Page views" description={`The last ${days} days. Counted without cookies; one visitor is one browser per day.`}
          action={<SegmentedNav label="Time range" items={RANGES.map((r) => ({ href: r === 30 ? "/admin" : `/admin?range=${r}`, label: `${r} days`, active: r === days }))} />}>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="text-4xl font-medium tracking-tight tabular-nums sm:text-5xl">
              {formatCount(views)} <span className="text-lg font-normal text-muted-foreground">page {views === 1 ? "view" : "views"}</span>
            </p>
            <p className="pb-1 text-sm text-muted-foreground">
              from <span className="font-medium text-foreground tabular-nums">{formatCount(stats?.visitors ?? 0)}</span> {stats?.visitors === 1 ? "visitor" : "visitors"}
              {change !== null && (
                <span className={cn("ml-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", change >= 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/10 text-rose-700 dark:text-rose-400")}>
                  {change >= 0 ? <TrendingUp aria-hidden className="size-3" /> : <TrendingDown aria-hidden className="size-3" />}
                  {change >= 0 ? "+" : ""}{change}% <span className="sr-only">compared with the {days} days before</span>
                </span>
              )}
            </p>
          </div>
          {stats && views > 0 ? <ViewsChart data={stats.daily} /> : (
            <p className="py-10 text-center text-sm text-muted-foreground">Nothing recorded in the last {days} days. Views are logged as visitors open public pages; admin visits are never counted.</p>
          )}
        </ChartPanel>

        <DashCard className="lg:col-span-4" icon={FolderKanban} title="Content" description="What a visitor can see right now.">
          <ContentRow label="Blog posts" href="/admin/posts" summary={content.posts} />
          <ContentRow label="Projects" href="/admin/projects" summary={content.projects} />
          <div>
            <h3 className="mb-2 text-sm font-medium">Waiting on you</h3>
            {waiting.length === 0 ? <p className="text-sm text-muted-foreground">Nothing is waiting: every post and project is live or archived.</p> : (
              <ul className="flex flex-col divide-y divide-border">
                {waiting.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <Link href={i.href} className="min-w-0 flex-1 truncate text-sm hover:underline">{i.title}</Link>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{i.visibility === "scheduled" ? `${i.kind} · ${formatDate(i.when)}` : `${i.kind} · draft`}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DashCard>

        {people && (
          <ChartPanel id="overview-people" className="lg:col-span-12" icon={Users} title="People" description="Everyone with an account on the site, and who can change it."
            action={<Link href="/admin/users" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">Manage</Link>}>
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
              <UserTiles stats={people} />
              <div><Donut data={roleSlices(people)} caption="accounts" /><Legend data={roleSlices(people)} /></div>
            </div>
          </ChartPanel>
        )}

        <DashCard className="lg:col-span-7" icon={Activity} title="Recent activity" description="Every change to the site's content and users."
          action={<Link href="/admin/activity" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">View all</Link>}>
          {audit.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet. Changes show up here as they happen.</p> : (
            <ol className="flex flex-col">
              {audit.rows.map((r) => <ActivityItem key={r.id} row={r} />)}
            </ol>
          )}
        </DashCard>

        <DashCard className="lg:col-span-5" icon={ShieldCheck} title="Admins" description="Who can change the site, and how well their accounts are protected."
          action={<Link href="/admin/users" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">Manage</Link>}>
          <ul className="flex flex-col divide-y divide-border">
            {admins.map((a) => (
              <li key={a.user_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <UserAvatar email={a.email} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <span className="truncate">{a.email}</span>
                    {a.user_id === me.id && <Badge variant="secondary" className="shrink-0">You</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.last_sign_in_at ? `Active ${timeAgo(a.last_sign_in_at)}` : "Never signed in"}</p>
                </div>
                <Badge variant="outline" className={cn("shrink-0 gap-1.5 font-normal", !a.mfa_enabled && "border-amber-500/50 text-amber-700 dark:text-amber-400")}>
                  <span aria-hidden className={cn("size-1.5 rounded-full", a.mfa_enabled ? "bg-emerald-500" : "bg-amber-500")} />
                  {a.mfa_enabled ? "2-step on" : "No 2-step"}
                </Badge>
              </li>
            ))}
          </ul>
        </DashCard>

        <DashCard className="lg:col-span-12" icon={Globe} title="Where the traffic goes" description={`Top pages, top posts and sources, last ${days} days.`}>
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
            <RankList title="Pages" rows={(stats?.top_pages ?? []).map((p) => ({ key: p.path, name: p.path, value: p.views }))} empty="No pages yet." />
            <RankList title="Blog posts" rows={postPages.map((p) => ({ key: p.path, name: p.path.replace("/blog/", ""), value: p.views }))} empty="No post views yet." />
            <RankList title="Sources" rows={(stats?.top_referrers ?? []).map((r) => ({ key: r.referrer, name: r.referrer, value: r.views }))} empty="No outside sources yet. Direct visits aren't listed." />
          </div>
        </DashCard>
      </div>
    </>
  );
}

const SEGMENTS: { key: keyof Omit<ContentSummary, "total">; label: string; bar: string; dot: string }[] = [
  { key: "live", label: "live", bar: "bg-brand-ink", dot: "bg-brand-ink" },
  { key: "scheduled", label: "scheduled", bar: "bg-amber-500", dot: "bg-amber-500" },
  { key: "draft", label: "draft", bar: "bg-muted-foreground/40", dot: "bg-muted-foreground/40" },
  { key: "archived", label: "archived", bar: "bg-border", dot: "bg-border" },
];

/** One content type as a single bar split by what visitors can see, with the numbers spelled out beside it. */
function ContentRow({ label, href, summary }: { label: string; href: string; summary: ContentSummary }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{label} <span className="font-normal text-muted-foreground tabular-nums">· {summary.total}</span></p>
        <Link href={href} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">Manage</Link>
      </div>
      <div aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
        {summary.total > 0 && SEGMENTS.filter((s) => summary[s.key] > 0).map((s) => <span key={s.key} className={cn("h-full", s.bar)} style={{ width: `${(summary[s.key] / summary.total) * 100}%` }} />)}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {SEGMENTS.filter((s) => summary[s.key] > 0 || s.key === "live").map((s) => (
          <li key={s.key} className="flex items-center gap-1.5"><span aria-hidden className={cn("size-2 rounded-full", s.dot)} /><span className="tabular-nums text-foreground">{summary[s.key]}</span> {s.label}</li>
        ))}
      </ul>
    </div>
  );
}
