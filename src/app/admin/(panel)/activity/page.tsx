import { Activity, BarChart3, ListFilter, PieChart, Users } from "lucide-react";
import Link from "next/link";
import { ActivityFilters } from "@/components/admin/activity-filters";
import { ActivityItem } from "@/components/admin/activity-item";
import { Donut, Legend, RankBars, TrendChart } from "@/components/admin/charts";
import { ChartMenu } from "@/components/admin/chart-card";
import { ChartPanel } from "@/components/admin/chart-panel";
import { DashCard } from "@/components/admin/dash-card";
import { EmptyState, SegmentedNav } from "@/components/admin/shared";
import { PageHeader } from "@/components/admin/page-header";
import { StatTiles } from "@/components/admin/stat-tiles";
import { UserAvatar } from "@/components/admin/user-avatar";
import { PAGE_SIZE_OPTIONS, UrlSelect } from "@/components/admin/url-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type AuditFilter, type AuditRow, auditStats, listAudit } from "@/lib/admin/data";
import { formatDate, formatTime, timeAgo } from "@/lib/format";
import { cn } from "cn";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
type Params = { page?: string; size?: string; view?: string; dir?: string; q?: string; action?: string; entity?: string; actor?: string; from?: string; to?: string };
const VIEWS = [{ id: "timeline", label: "Timeline" }, { id: "table", label: "Table" }, { id: "cards", label: "Cards" }, { id: "days", label: "By day" }] as const;
const SLICE = { created: "#10b981", updated: "var(--brand-ink)", deleted: "#f43f5e", event: "#a855f7" } as const;
const SERIES = (["created", "updated", "deleted", "event"] as const).map((k) => ({ key: k, label: k === "event" ? "Events" : k[0].toUpperCase() + k.slice(1), color: SLICE[k] }));
const title = (s: string) => s.replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const size = [10, 25, 50, 100].includes(Number(sp.size)) ? Number(sp.size) : 25;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const view = VIEWS.find((v) => v.id === sp.view)?.id ?? "timeline";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const filter: AuditFilter = { q: sp.q, action: sp.action, entity: sp.entity, actor: sp.actor, from: sp.from, to: sp.to, dir };
  const [{ rows, total }, stats] = await Promise.all([listAudit({ limit: size, offset: (page - 1) * size, ...filter }), auditStats(filter)]);
  const pages = Math.max(1, Math.ceil(total / size));
  const filtered = Boolean(sp.q || sp.action || sp.entity || sp.actor || sp.from || sp.to);
  const href = (extra: Record<string, string | number>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v !== undefined && v !== "") next.set(k, String(v));
    return `/admin/activity?${next.toString()}`;
  };
  const count = (k: string) => stats.byAction.find((a) => a.key === k)?.value ?? 0;
  const busiest = stats.daily
    .map((d) => ({ day: String(d.day), n: SERIES.reduce((sum, s) => sum + Number(d[s.key] ?? 0), 0) }))
    .reduce((best, d) => (d.n > best.n ? d : best), { day: "", n: 0 });
  const slices = stats.byAction.map((a) => ({ ...a, color: SLICE[a.key as keyof typeof SLICE] }));

  return (
    <>
      <PageHeader title="Activity" description="Every change to the site's content, categories, settings and users. Written by the database, so nothing is missed."
        action={<ChartMenu charts={[{ id: "activity-over-time", label: "Activity over time" }, { id: "activity-kinds", label: "What kind" }, { id: "activity-areas", label: "Busiest areas" }, { id: "activity-people", label: "Most active people" }]} />} />
      <div className="flex flex-col gap-4">
        <StatTiles items={[
          { label: filtered ? "Matching changes" : "Changes", value: stats.total, note: `${count("created")} created, ${count("updated")} updated` },
          { label: "Deleted", value: count("deleted"), note: count("deleted") ? "Check History to restore" : "Nothing removed", warn: count("deleted") > 0 },
          { label: "People", value: stats.byActor.length, note: stats.byActor[0] ? `Most active: ${stats.byActor[0].name}` : "No one yet" },
          { label: "Busiest day", value: busiest.n, note: busiest.day ? formatDate(`${busiest.day}T00:00:00Z`) : "No activity" },
        ]} />
        <div className="order-2 grid gap-4 lg:order-1 lg:grid-cols-12">
          <ChartPanel id="activity-over-time" className="lg:col-span-8" icon={BarChart3} title="Activity over time" description={`${stats.total} ${filtered ? "matching " : ""}${stats.total === 1 ? "change" : "changes"}, by kind, per day.`}>
            <TrendChart data={stats.daily} series={SERIES} kind="bar" stacked height={200} />
          </ChartPanel>
          <ChartPanel id="activity-kinds" className="lg:col-span-4" icon={PieChart} title="What kind" description="How the changes split.">
            <Donut data={slices} total={stats.total} caption="changes" />
            <Legend data={slices} />
          </ChartPanel>
          <ChartPanel id="activity-areas" className="lg:col-span-6" icon={ListFilter} title="Busiest areas" description="Where the changes happen.">
            {stats.byEntity.length ? <RankBars data={stats.byEntity.map((e) => ({ name: title(e.name), value: e.value }))} label="Changes" /> : <p className="py-6 text-center text-sm text-muted-foreground">Nothing to rank yet.</p>}
          </ChartPanel>
          <ChartPanel id="activity-people" className="lg:col-span-6" icon={Users} title="Most active people" description="Who made the changes.">
            {stats.byActor.length ? <RankBars data={stats.byActor} label="Changes" color="#f59e0b" /> : <p className="py-6 text-center text-sm text-muted-foreground">Nothing to rank yet.</p>}
          </ChartPanel>
        </div>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
        <ActivityFilters entities={stats.entities} actors={stats.actors} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedNav label="View" items={VIEWS.map((v) => ({ href: href({ view: v.id, page: "" }), label: v.label, active: v.id === view }))} />
          <p role="status" className="text-sm tabular-nums text-muted-foreground">{total} {filtered ? "matching" : "recorded"}, {dir === "desc" ? "newest" : "oldest"} first</p>
        </div>

        {rows.length === 0 ? (
          <EmptyState>{filtered ? "Nothing matches those filters." : "Nothing yet. Changes show up here as they happen."}</EmptyState>
        ) : view === "table" ? (
          <ActivityTable rows={rows} dir={dir} sortHref={href({ dir: dir === "desc" ? "asc" : "desc", page: "" })} />
        ) : view === "cards" ? (
          <ActivityCards rows={rows} />
        ) : view === "days" ? (
          <ByDay rows={rows} />
        ) : (
          <DashCard icon={Activity} title="Timeline" description="Newest first, the way it happened.">
            <ol>{rows.map((r) => <ActivityItem key={r.id} row={r} />)}</ol>
          </DashCard>
        )}

        {total > 0 && (
          <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <UrlSelect param="size" value={String(size)} options={PAGE_SIZE_OPTIONS} label="Rows per page" />
            <Button variant="outline" disabled={page <= 1} render={page > 1 ? <Link href={href({ page: page - 1 })} /> : undefined} nativeButton={page <= 1} role={page > 1 ? "link" : undefined}>Newer</Button>
            <span className="tabular-nums text-muted-foreground">Page {page} of {pages}</span>
            <Button variant="outline" disabled={page >= pages} render={page < pages ? <Link href={href({ page: page + 1 })} /> : undefined} nativeButton={page >= pages} role={page < pages ? "link" : undefined}>Older</Button>
          </nav>
        )}
        </div>
      </div>
    </>
  );
}

const ACTION_TONE: Record<AuditRow["action"], string> = {
  created: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400", updated: "", deleted: "border-rose-500/40 text-rose-700 dark:text-rose-400", event: "border-purple-500/40 text-purple-700 dark:text-purple-400",
};

function ActivityTable({ rows, dir, sortHref }: { rows: AuditRow[]; dir: "asc" | "desc"; sortHref: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table className="tabular-nums">
        <TableHeader className="bg-muted/70 [&_th]:h-11 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase [&_tr]:border-b-2">
          <TableRow>
            <TableHead aria-sort={dir === "asc" ? "ascending" : "descending"} className="whitespace-nowrap"><Link href={sortHref} className="rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground">When {dir === "asc" ? "↑" : "↓"}</Link></TableHead>
            <TableHead>Who</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>What</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className="[&>td]:py-3">
              <TableCell className="whitespace-nowrap text-muted-foreground"><time dateTime={r.at}>{formatDate(r.at)}, {formatTime(r.at)}</time></TableCell>
              <TableCell className="max-w-48 truncate">{r.actor_email ?? "System"}</TableCell>
              <TableCell><Badge variant="outline" className={cn("font-normal", ACTION_TONE[r.action])}>{r.action}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{title(r.entity)}</TableCell>
              <TableCell className="max-w-md truncate">{r.summary}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** The same page of changes, grouped under the day they happened. */
function ByDay({ rows }: { rows: AuditRow[] }) {
  const groups = rows.reduce<Map<string, AuditRow[]>>((m, r) => m.set(r.at.slice(0, 10), [...(m.get(r.at.slice(0, 10)) ?? []), r]), new Map());
  return (
    <div className="flex flex-col gap-4">
      {[...groups].map(([day, items]) => (
        <DashCard key={day} icon={Activity} title={formatDate(`${day}T00:00:00Z`)} description={`${items.length} ${items.length === 1 ? "change" : "changes"}`}>
          <ol>{items.map((r) => <ActivityItem key={r.id} row={r} />)}</ol>
        </DashCard>
      ))}
    </div>
  );
}

/** One card per change: who, what kind, which area, and the summary. A grid reads faster than a list when you are scanning. */
function ActivityCards({ rows }: { rows: AuditRow[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className={cn("font-normal", ACTION_TONE[r.action])}>{r.action}</Badge>
            <time dateTime={r.at} className="text-xs text-muted-foreground tabular-nums" title={`${formatDate(r.at)}, ${formatTime(r.at)} UTC`}>{timeAgo(r.at)}</time>
          </div>
          <p className="line-clamp-3 text-sm">{r.summary}</p>
          <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
            <UserAvatar email={r.actor_email ?? "System"} className="size-6" />
            <span className="min-w-0 flex-1 truncate">{r.actor_email ?? "System"}</span>
            <span>{title(r.entity)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
