import { BarChart3, ExternalLink, Info, Link2, Pencil } from "lucide-react";
import Link from "next/link";
import { ChartMenu } from "@/components/admin/chart-card";
import { ChartPanel } from "@/components/admin/chart-panel";
import { DashCard } from "@/components/admin/dash-card";
import { RankBars, TrendChart } from "@/components/admin/charts";
import { PageHeader, StatusBadge } from "@/components/admin/page-header";
import { SegmentedNav } from "@/components/admin/shared";
import { StatTiles } from "@/components/admin/stat-tiles";
import { Button } from "@/components/ui/button";
import type { SectionAnalytics } from "@/lib/admin/data";
import { formatCount, formatDate, hostOf } from "@/lib/format";

export const RANGES = [7, 30, 90];

/** The analytics page of one post or project: headline numbers, views per day, where readers came from, and the basics.
 *  `facts` are extra rows for the details card; `tiles` extra headline numbers. */
export function ItemStats({ noun, listLabel, listHref, base, editHref, publicHref, title, visibility, publishedAt, creator, stats, days, facts, tiles }: {
  noun: string; listLabel: string; listHref: string; base: string; editHref: string; publicHref: string; title: string; visibility: string; publishedAt: string;
  creator: string; stats: SectionAnalytics | null; days: number; facts: [string, string][]; tiles: { label: string; value: string | number; note?: string }[];
}) {
  const views = stats?.views ?? 0;
  const live = visibility === "live";
  return (
    <>
      <PageHeader title={title || "Untitled"} back={{ label: listLabel, href: listHref }}
        description={`How this ${noun} is being read. Use Edit to change it${noun === "post" ? " and preview what visitors will see" : ""}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <ChartMenu charts={[{ id: `${noun}-item-views`, label: "Views" }, { id: `${noun}-item-sources`, label: "Where readers come from" }]} />
            {live && <Button variant="outline" render={<a href={publicHref} target="_blank" rel="noopener" />} nativeButton={false} role="link"><ExternalLink /> View on site</Button>}
            <Button render={<Link href={editHref} />} nativeButton={false} role="link"><Pencil /> {noun === "post" ? "Edit and preview" : "Edit"}</Button>
          </div>
        } />
      <div className="flex flex-col gap-4">
        <StatTiles items={[
          { label: `Views, ${days} days`, value: formatCount(views), note: `${(views / days).toFixed(1)} a day` },
          { label: `Readers, ${days} days`, value: formatCount(stats?.visitors ?? 0), note: "One browser counts once a day" },
          ...tiles,
        ]} />
        <div className="grid gap-4 lg:grid-cols-12">
          <ChartPanel id={`${noun}-item-views`} className="lg:col-span-8" icon={BarChart3} title="Views" description={`Per day, last ${days} days.`}
            action={<SegmentedNav label="Time range" items={RANGES.map((r) => ({ href: r === 30 ? base : `${base}?range=${r}`, label: `${r} days`, active: r === days }))} />}>
            {views > 0 ? <TrendChart data={stats!.daily} series={[{ key: "views", label: "Views" }, { key: "visitors", label: "Readers", color: "#f59e0b" }]} table />
              : <p className="py-10 text-center text-sm text-muted-foreground">{live ? `Nobody has read this ${noun} in the last ${days} days.` : `This ${noun} is not live yet, so nothing is counted.`}</p>}
          </ChartPanel>
          <div className="flex flex-col gap-4 lg:col-span-4">
            <DashCard icon={Info} title="Details">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={visibility as never} /></dd>
                <dt className="text-muted-foreground">Created by</dt><dd className="truncate">{creator}</dd>
                <dt className="text-muted-foreground">{visibility === "scheduled" ? "Goes live" : "Published"}</dt><dd>{formatDate(publishedAt)}</dd>
                {facts.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="truncate">{v}</dd></div>)}
                <dt className="text-muted-foreground">Address</dt><dd className="truncate">{publicHref.split("?")[0]}</dd>
              </dl>
            </DashCard>
            <ChartPanel id={`${noun}-item-sources`} icon={Link2} title="Where readers come from" description="Sites that sent readers here.">
              {stats?.referrers.length ? <RankBars data={stats.referrers.map((r) => ({ name: hostOf(r.referrer), value: r.views }))} label="Views" color="#10b981" />
                : <p className="text-sm text-muted-foreground">No outside sources yet. Direct visits aren&apos;t listed.</p>}
            </ChartPanel>
          </div>
        </div>
      </div>
    </>
  );
}
