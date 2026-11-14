import { AlertTriangle, BarChart3, Bug, Globe, Server } from "lucide-react";
import { ChartMenu } from "@/components/admin/chart-card";
import { ChartPanel } from "@/components/admin/chart-panel";
import { RankBars, TrendChart } from "@/components/admin/charts";
import { DashCard } from "@/components/admin/dash-card";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState, SegmentedNav } from "@/components/admin/shared";
import { StatTiles } from "@/components/admin/stat-tiles";
import { Badge } from "@/components/ui/badge";
import { type ErrorGroup, getErrorSummary } from "@/lib/admin/data";
import { formatDate, formatTime, timeAgo } from "@/lib/format";
import { cn } from "cn";
import { Streamed } from "@/components/admin/page-loading";
import { ChartsSkeleton } from "@/components/admin/skeletons";

const RANGES = [1, 7, 30];
const SERIES = [{ key: "client", label: "Browser", color: "#f59e0b" }, { key: "server", label: "Server", color: "#f43f5e" }];
const dayLabel = (days: number) => (days === 1 ? "24 hours" : `${days} days`);

export default function ErrorsPage(props: Parameters<typeof ErrorsPageContent>[0]) {
  return <Streamed fallback={<ChartsSkeleton tiles={4} list />}><ErrorsPageContent {...props} /></Streamed>;
}

async function ErrorsPageContent({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range)) ? Number(range) : 7;
  const stats = await getErrorSummary(days);
  const groups = stats?.groups ?? [];
  const count = (source: string) => (stats?.daily ?? []).filter((d) => d.source === source).reduce((n, d) => n + d.n, 0);
  const ids = [{ id: "errors-trend", label: "Errors over time" }, { id: "errors-pages", label: "Pages with errors" }];

  return (
    <>
      <PageHeader title="Errors" description="Errors thrown in visitors' browsers and on the server, grouped so the same bug counts once. Nothing identifying is stored."
        action={<div className="flex flex-wrap items-center gap-2"><SegmentedNav label="Time range" items={RANGES.map((r) => ({ href: r === 7 ? "/admin/errors" : `/admin/errors?range=${r}`, label: dayLabel(r), active: r === days }))} /><ChartMenu charts={ids} /></div>} />
      {!stats || stats.total === 0 ? (
        <EmptyState>No errors in the last {dayLabel(days)}. Errors appear here when a visitor&apos;s browser or the server throws one.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <StatTiles items={[
            { label: "Errors", value: stats.total, note: `Last ${dayLabel(days)}`, warn: true },
            { label: "Different bugs", value: groups.length, note: "Grouped by message and place" },
            { label: "In browsers", value: count("client"), note: "Visitors saw these" },
            { label: "On the server", value: count("server"), note: "Rendering, routes and actions" },
          ]} />
          <div className="grid gap-4 lg:grid-cols-12">
            <ChartPanel id="errors-trend" className="lg:col-span-8" icon={BarChart3} title="Errors over time" description="Per day, browser and server.">
              <TrendChart data={stats.series} series={SERIES} kind="bar" stacked height={200} />
            </ChartPanel>
            <ChartPanel id="errors-pages" className="lg:col-span-4" icon={Bug} title="Pages with errors" description="Where they happen.">
              <RankBars data={stats.paths} label="Errors" color="#f43f5e" />
            </ChartPanel>
          </div>
          <DashCard icon={AlertTriangle} title="Bugs, newest first" description="Open one to see the stack trace.">
            <ul className="flex flex-col">
              {groups.map((g) => <GroupRow key={g.fingerprint} g={g} />)}
            </ul>
          </DashCard>
        </div>
      )}
    </>
  );
}

function GroupRow({ g }: { g: ErrorGroup }) {
  const Icon = g.source === "server" ? Server : Globe;
  return (
    <li className="border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3">
          <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", g.source === "server" ? "text-rose-600" : "text-amber-600")} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium">{g.message}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {g.source === "server" ? "Server" : "Browser"} · {g.path}{g.pages > 1 ? ` and ${g.pages - 1} more` : ""} · last seen <time dateTime={g.last_seen}>{timeAgo(g.last_seen)}</time>
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 tabular-nums">{g.n}×</Badge>
        </summary>
        <div className="mt-3 flex flex-col gap-2 pl-7 text-xs text-muted-foreground">
          <p>First seen {formatDate(g.first_seen)}, {formatTime(g.first_seen)} UTC · last {formatDate(g.last_seen)}, {formatTime(g.last_seen)} UTC</p>
          {g.stack ? <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground">{g.stack}</pre> : <p>No stack trace was recorded.</p>}
        </div>
      </details>
    </li>
  );
}
