import { Gauge, Smartphone, Timer, Turtle } from "lucide-react";
import { ChartMenu } from "@/components/admin/chart-card";
import { ChartPanel } from "@/components/admin/chart-panel";
import { Donut, Legend, RankBars, TrendChart } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState, SegmentedNav } from "@/components/admin/shared";
import { StatTiles } from "@/components/admin/stat-tiles";
import { getPerformance } from "@/lib/admin/data";
import { VITALS, type VitalName, rate } from "@/lib/analytics";

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export const instant = false;

const RANGES = [7, 30, 90];
const ORDER: VitalName[] = ["LCP", "INP", "CLS", "FCP", "TTFB"];
const RATING = { good: "Good", "needs-improvement": "Needs work", poor: "Poor" } as const;
/** 1830 -> "1.8 s", 640 -> "640 ms", 0.083 -> "0.08" */
const show = (name: VitalName, v: number) => (name === "CLS" ? v.toFixed(2) : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range)) ? Number(range) : 30;
  const stats = await getPerformance(days);
  const byMetric = new Map((stats?.metrics ?? []).map((m) => [m.metric as VitalName, m]));
  const have = stats && stats.samples > 0;

  const timeMetrics = ORDER.filter((n) => n !== "CLS");
  const daily = [...(stats?.daily ?? []).reduce((m, r) => m.set(r.day, { ...(m.get(r.day) ?? { day: r.day }), [r.metric]: Math.round(r.p75) }), new Map<string, Record<string, string | number>>()).values()];
  const ratings = ORDER.filter((n) => byMetric.has(n)).map((n) => { const m = byMetric.get(n)!; return { metric: n, good: m.good, mid: m.mid, poor: m.poor }; });
  const devices = (stats?.devices ?? []).map((d) => ({ key: d.device, label: d.device === "mobile" ? "phone" : "desktop", value: d.n }));
  const ids = [{ id: "perf-ratings", label: "How visits rate" }, { id: "perf-trend", label: "Load times over time" }, { id: "perf-slow", label: "Slowest pages" }, { id: "perf-devices", label: "Phone and desktop" }];

  return (
    <>
      <PageHeader title="Performance" description="Core Web Vitals measured in real visitors' browsers. Each number is the 75th percentile: three in four visits were at least this fast."
        action={<div className="flex flex-wrap items-center gap-2"><SegmentedNav label="Time range" items={RANGES.map((r) => ({ href: r === 30 ? "/admin/performance" : `/admin/performance?range=${r}`, label: `${r} days`, active: r === days }))} /><ChartMenu charts={ids} /></div>} />
      {!have ? (
        <EmptyState>No measurements in the last {days} days yet. They arrive when someone opens the public pages and then leaves or switches tab (that is when the browser reports its final numbers). Your own visits do not count while you are signed in to the admin, and neither do visitors with Do Not Track on: open the site in a private window to try it.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <StatTiles className="lg:grid-cols-5" items={ORDER.map((n) => {
            const m = byMetric.get(n);
            return m
              ? { label: `${VITALS[n].short} (${n})`, value: show(n, m.p75), note: `${RATING[rate(n, m.p75)]} · ${m.n} ${m.n === 1 ? "sample" : "samples"}`, warn: rate(n, m.p75) !== "good" }
              : { label: `${VITALS[n].short} (${n})`, value: "-", note: "No samples yet" };
          })} />
          <div className="grid gap-4 lg:grid-cols-12">
            <ChartPanel id="perf-ratings" className="lg:col-span-7" icon={Gauge} title="How visits rate" description="Visits per metric that were good, needed work or were poor.">
              <TrendChart data={ratings} xKey="metric" kind="bar" stacked height={220}
                series={[{ key: "good", label: "Good", color: "#10b981" }, { key: "mid", label: "Needs work", color: "#f59e0b" }, { key: "poor", label: "Poor", color: "#f43f5e" }]} />
            </ChartPanel>
            <ChartPanel id="perf-devices" className="lg:col-span-5" icon={Smartphone} title="Phone and desktop" description="Where the measurements came from.">
              <Donut data={devices} caption="samples" />
              <Legend data={devices} />
            </ChartPanel>
            <ChartPanel id="perf-trend" className="lg:col-span-12" icon={Timer} title="Load times over time" description="Daily 75th percentile, in milliseconds. Lower is better.">
              <TrendChart data={daily} height={240} series={timeMetrics.map((n) => ({ key: n, label: n }))} />
            </ChartPanel>
            <ChartPanel id="perf-slow" className="lg:col-span-12" icon={Turtle} title="Slowest pages" description="Largest Contentful Paint per page, slowest first. Select a page to open it.">
              {stats.slow_pages.length
                ? <RankBars label="LCP (ms)" color="#f43f5e" data={stats.slow_pages.map((p) => ({ name: p.path, value: Math.round(p.p75), href: p.path }))} />
                : <EmptyState>No page has a Largest Contentful Paint yet.</EmptyState>}
            </ChartPanel>
          </div>
        </div>
      )}
    </>
  );
}
