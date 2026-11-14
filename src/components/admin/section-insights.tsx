import { BarChart3, Globe, Layers } from "lucide-react";
import { ChartMenu } from "@/components/admin/chart-card";
import { ChartPanel } from "@/components/admin/chart-panel";
import { Donut, Legend, RankBars, TrendChart } from "@/components/admin/charts";
import { EmptyState } from "@/components/admin/shared";
import { StatTiles } from "@/components/admin/stat-tiles";
import type { SectionAnalytics } from "@/lib/admin/data";
import { formatCount } from "@/lib/format";

export type InsightItem = { id: string; slug: string; visibility: string; groups: string[] };

/** The numbers and charts above a list of posts or projects: tiles, views over time, what they are about, and which are read most.
 *  Every chart can be hidden from the Charts menu. */
export function SectionInsights({ noun, plural, prefix, adminBase, items, stats, days, extra, groupTitle }: {
  noun: string; plural: string; prefix: "/blog/" | "/work/"; adminBase: string; items: InsightItem[]; stats: SectionAnalytics | null; days: number;
  extra: { label: string; value: string | number; note?: string }; groupTitle: string;
}) {
  const live = items.filter((i) => i.visibility === "live");
  const idOf = new Map(items.map((i) => [`${prefix}${i.slug}`, i.id]));
  const groups = [...live.flatMap((i) => i.groups).reduce((m, g) => m.set(g, (m.get(g) ?? 0) + 1), new Map<string, number>())].map(([label, value]) => ({ key: label, label, value }));
  const views = stats?.views ?? 0;
  const ids = { views: `${noun}-views`, groups: `${noun}-groups`, top: `${noun}-top` };
  return (
    <div className="contents">
      <div className="order-1 flex justify-end">
        <ChartMenu charts={[{ id: ids.views, label: `${noun[0].toUpperCase()}${noun.slice(1)} views` }, { id: ids.groups, label: groupTitle }, { id: ids.top, label: "Most read" }]} />
      </div>
      <StatTiles className="order-2" items={[
        { label: capital(plural), value: items.length, note: `${live.length} live, ${items.length - live.length} not visible` },
        { label: `Views, ${days} days`, value: formatCount(views), note: `${(views / days).toFixed(1)} a day` },
        { label: `Readers, ${days} days`, value: formatCount(stats?.visitors ?? 0), note: "One browser counts once a day" },
        extra,
      ]} />
      <div className="order-4 grid gap-4 lg:order-3 lg:grid-cols-12">
        <ChartPanel id={ids.views} className="lg:col-span-8" icon={BarChart3} title={`${capital(noun)} views`} description={`Every ${noun} together, last ${days} days.`}>
          {views > 0 ? <TrendChart data={stats!.daily} series={[{ key: "views", label: "Views" }, { key: "visitors", label: "Readers", color: "#f59e0b" }]} height={200} />
            : <p className="py-10 text-center text-sm text-muted-foreground">Nothing has been read in the last {days} days.</p>}
        </ChartPanel>
        <ChartPanel id={ids.groups} className="lg:col-span-4" icon={Layers} title={groupTitle} description={`What the ${plural} are about.`}>
          {groups.length ? <><Donut data={groups} caption={`live ${plural}`} /><Legend data={groups} /></> : <p className="py-10 text-center text-sm text-muted-foreground">Nothing live yet.</p>}
        </ChartPanel>
        <ChartPanel id={ids.top} className="lg:col-span-12" icon={Globe} title="Most read" description={`Top ${plural} by address, last ${days} days. Select one to open its analytics.`}>
          {stats?.top.length
            ? <RankBars label="Views" data={stats.top.map((t) => { const id = idOf.get(t.path); return { name: t.path.slice(prefix.length), value: t.views, href: id ? `${adminBase}/${id}/stats` : undefined }; })} />
            : <EmptyState>Nothing yet.</EmptyState>}
        </ChartPanel>
      </div>
    </div>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
