"use client";

import { useRouter } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { useMedia } from "@/lib/admin/use-media";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

/** The palette every admin chart draws from: the brand ink first, then colours that stay apart in light and dark. */
export const PALETTE = ["var(--brand-ink)", "#f59e0b", "#10b981", "#a855f7", "#f43f5e", "#64748b", "#06b6d4", "#84cc16"];

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
export const dayLabel = (v: unknown) => (isDay(v) ? dayFmt.format(new Date(`${v.slice(0, 10)}T00:00:00Z`)) : String(v));

/** 1830 -> "1.8k", so a four-digit axis label fits in the narrow gutter. */
const compact = (v: number) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v));

export type Series = { key: string; label: string; color?: string };

const configOf = (series: Series[]): ChartConfig =>
  Object.fromEntries(series.map((s, i) => [s.key, { label: s.label, color: s.color ?? PALETTE[i % PALETTE.length] }]));

/** A value over time (or any ordered x), as areas or bars, one series or several. Hover or focus shows the exact numbers.
 *  The table under it holds the same numbers for anyone who prefers them. */
export function TrendChart({ data, xKey = "day", series, kind = "area", stacked = false, height = 220, table = false }: {
  data: Record<string, string | number>[]; xKey?: string; series: Series[]; kind?: "area" | "bar"; stacked?: boolean; height?: number; table?: boolean;
}) {
  const config = configOf(series);
  const common = { data, margin: { left: 0, right: 8, top: 8 } };
  const axes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={dayLabel} />
      <YAxis tickLine={false} axisLine={false} width={40} tickCount={4} allowDecimals={false} tickFormatter={compact} />
      <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => dayLabel(v)} />} />
      {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
    </>
  );
  return (
    <figure className="flex flex-col gap-3">
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        {kind === "bar" ? (
          <BarChart accessibilityLayer {...common}>
            {axes}
            {series.map((s) => <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={stacked ? 0 : [3, 3, 0, 0]} maxBarSize={18} stackId={stacked ? "a" : undefined} />)}
          </BarChart>
        ) : (
          <AreaChart accessibilityLayer {...common}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${s.key})`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`var(--color-${s.key})`} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {axes}
            {series.map((s) => <Area key={s.key} dataKey={s.key} type="monotone" stroke={`var(--color-${s.key})`} strokeWidth={2} connectNulls fill={`url(#fill-${s.key})`} stackId={stacked ? "a" : undefined} />)}
          </AreaChart>
        )}
      </ChartContainer>
      {table && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as a table</summary>
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm tabular-nums">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr><th scope="col" className="px-3 py-1.5">Day</th>{series.map((s) => <th key={s.key} scope="col" className="px-3 py-1.5 text-right">{s.label}</th>)}</tr>
              </thead>
              <tbody>
                {[...data].reverse().map((d) => (
                  <tr key={String(d[xKey])} className="border-t border-border">
                    <th scope="row" className="px-3 py-1.5 font-normal">{dayLabel(d[xKey])}</th>
                    {series.map((s) => <td key={s.key} className="px-3 py-1.5 text-right">{d[s.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

/** Daily page views and visitors on the overview. */
export function ViewsChart({ data }: { data: { day: string; views: number; visitors: number }[] }) {
  return <TrendChart data={data} series={[{ key: "views", label: "Views" }, { key: "visitors", label: "Visitors", color: PALETTE[1] }]} table />;
}

/** A ranked list as horizontal bars: names on the left, the exact value at the end of each bar. A bar with an `href` is a link
 *  (its name and the bar itself both go there). */
export function RankBars({ data, label = "Count", color = PALETTE[0] }: { data: { name: string; value: number; href?: string }[]; label?: string; color?: string }) {
  const router = useRouter();
  const narrow = useMedia("(max-width: 639px)");
  const config: ChartConfig = { value: { label, color } };
  const hrefOf = new Map(data.map((d) => [d.name, d.href]));
  const room = narrow ? 14 : 24;
  const short = (v: string) => (v.length > room ? `${v.slice(0, room - 1)}…` : v);
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(96, data.length * 38 + 16) }}>
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 0, right: 44 }}>
        <XAxis type="number" dataKey="value" hide />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={narrow ? 104 : 150}
          tick={({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string } }) => {
            const name = String(payload?.value ?? "");
            const href = hrefOf.get(name);
            const text = <text x={x} y={y} dy={4} textAnchor="end" className={href ? "fill-foreground text-xs underline-offset-2 hover:underline" : "fill-muted-foreground text-xs"}>{short(name)}</text>;
            return href ? <a href={href} onClick={(e) => { e.preventDefault(); router.push(href); }}><title>{name}</title>{text}</a> : text;
          }} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} barSize={20} label={{ position: "right", className: "fill-foreground text-xs tabular-nums" }}
          onClick={(d) => { const href = (d as { payload?: { href?: string } }).payload?.href; if (href) router.push(href); }} className="cursor-pointer" />
      </BarChart>
    </ChartContainer>
  );
}

/** Parts of a whole as a ring with the total in the middle and a legend. Colours are fixed per slice. */
export function Donut({ data, total, caption }: { data: { key: string; label: string; value: number; color?: string }[]; total?: number; caption: string }) {
  const rows = data.map((d, i) => ({ ...d, fill: d.color ?? PALETTE[i % PALETTE.length] }));
  const config = configOf(rows.map((d) => ({ key: d.key, label: d.label, color: d.fill })));
  const sum = total ?? rows.reduce((n, d) => n + d.value, 0);
  return (
    <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-52">
      <PieChart accessibilityLayer>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
        <Pie data={rows} dataKey="value" nameKey="key" innerRadius="62%" strokeWidth={3}>
          {rows.map((r) => <Cell key={r.key} fill={r.fill} />)}
          <Label content={({ viewBox }) => viewBox && "cx" in viewBox ? (
            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-medium tabular-nums">{sum}</tspan>
              <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">{caption}</tspan>
            </text>
          ) : null} />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

/** The legend for a Donut, kept as real text so the numbers are readable and selectable. */
export function Legend({ data }: { data: { key: string; label: string; value: number; color?: string }[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {data.map((d, i) => (
        <li key={d.key} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: d.color ?? PALETTE[i % PALETTE.length] }} />
          <span className="tabular-nums text-foreground">{d.value}</span> {d.label}
        </li>
      ))}
    </ul>
  );
}
