import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

/** Placeholders shaped like each admin page, so the page that is coming looks familiar before its data arrives. Built from the small
 *  pieces below; a page picks the one that matches its layout (see the `fallback` of <Streamed> in each page). */

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">{children}</div>
);

const Header = ({ action = false }: { action?: boolean }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex flex-col gap-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-80 max-w-full" /></div>
    {action && <Skeleton className="h-9 w-28" />}
  </div>
);

const COLS = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" } as const;
const Tiles = ({ n = 4 }: { n?: 3 | 4 | 5 }) => (
  <div className={cn("grid grid-cols-2 gap-3", COLS[n])}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"><Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-28" /></div>
    ))}
  </div>
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
    <div className="flex items-center gap-3"><Skeleton className="size-9 rounded-xl" /><div className="flex flex-col gap-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></div>
    {children}
  </div>
);

const Chart = ({ className = "h-52" }: { className?: string }) => <Skeleton className={cn("w-full", className)} />;

const Toolbar = () => (
  <div className="flex flex-wrap gap-2"><Skeleton className="h-9 w-full sm:w-64" /><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-32" /></div>
);

const Rows = ({ n = 6, avatar = false }: { n?: number; avatar?: boolean }) => (
  <div className="flex flex-col divide-y divide-border">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="flex items-center gap-3 py-3">
        {avatar && <Skeleton className="size-8 rounded-full" />}
        <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-2/5" /></div>
        <Skeleton className="h-4 w-14" />
      </div>
    ))}
  </div>
);

const Table = ({ rows = 8 }: { rows?: number }) => (
  <div className="overflow-hidden rounded-xl border border-border bg-card">
    <Skeleton className="h-11 w-full rounded-none" />
    <div className="flex flex-col divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 p-3"><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-4" /></div>
      ))}
    </div>
  </div>
);

const Field = ({ tall = false }: { tall?: boolean }) => (
  <div className="flex flex-col gap-2"><Skeleton className="h-4 w-24" /><Skeleton className={cn("w-full", tall ? "h-40" : "h-10")} /></div>
);

/** Admin, Overview: page views with a chart, then content, activity and traffic cards. */
export const OverviewSkeleton = () => (
  <Frame><Header />
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-8"><Skeleton className="h-12 w-64" /><Chart /></Card>
      <Card className="lg:col-span-4"><Rows n={3} /></Card>
      <Card className="lg:col-span-6"><Rows n={4} avatar /></Card>
      <Card className="lg:col-span-6"><Rows n={4} /></Card>
    </div>
  </Frame>
);

/** Blog posts, Projects, Users: a toolbar, a table, and a chart under it. */
export const ListSkeleton = ({ tiles = false }: { tiles?: boolean }) => (
  <Frame><Header action />{tiles && <Tiles />}<Toolbar /><Table /><Card><Chart className="h-40" /></Card></Frame>
);

/** Performance and Errors: headline numbers, then charts. `list` adds the list of bugs. */
export const ChartsSkeleton = ({ tiles = 5, list = false }: { tiles?: 4 | 5; list?: boolean }) => (
  <Frame><Header /><Tiles n={tiles} />
    <div className="grid gap-4 lg:grid-cols-12"><Card className="lg:col-span-8"><Chart /></Card><Card className="lg:col-span-4"><Chart /></Card></div>
    {list && <Card><Rows /></Card>}
  </Frame>
);

/** Activity: tiles, charts, filters, then the log. */
export const ActivitySkeleton = () => (
  <Frame><Header /><Tiles />
    <div className="grid gap-4 lg:grid-cols-12"><Card className="lg:col-span-8"><Chart className="h-44" /></Card><Card className="lg:col-span-4"><Chart className="h-44" /></Card></div>
    <Toolbar /><Card><Rows n={7} avatar /></Card>
  </Frame>
);

/** Inbox: the list of messages beside the open one. */
export const InboxSkeleton = () => (
  <Frame><Header />
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <Card><Rows n={7} /></Card>
      <Card><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /><Chart className="h-64" /></Card>
    </div>
  </Frame>
);

/** History and Data: filters above a long list or table. */
export const HistorySkeleton = () => <Frame><Header /><Toolbar /><Card><Rows n={8} /></Card></Frame>;
export const DataSkeleton = () => <Frame><Header /><Toolbar /><Table rows={10} /></Frame>;

/** Media: a grid of pictures. */
export const MediaSkeleton = () => (
  <Frame><Header action />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-square w-full" />)}</div>
  </Frame>
);

/** Categories and the About lists: stacked cards of rows (the About page also has tab pills). */
export const CardsSkeleton = ({ tabs = false }: { tabs?: boolean }) => (
  <Frame><Header />
    {tabs && <div className="flex flex-wrap gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-28 rounded-full" />)}</div>}
    <Card><Rows n={4} /></Card>{!tabs && <Card><Rows n={4} /></Card>}
  </Frame>
);

/** Profile, Account, Settings, and the new and edit forms (`side` adds the preview or help column). */
export const FormSkeleton = ({ side = false }: { side?: boolean }) => (
  <Frame><Header action />
    <div className={cn("grid gap-6", side && "lg:grid-cols-[1fr_20rem]")}>
      <div className="flex flex-col gap-5"><Field /><Field /><Field tall /><Field /></div>
      {side && <Card><Chart className="h-48" /><Rows n={2} /></Card>}
    </div>
  </Frame>
);

/** One post's or project's stats: name and facts, headline numbers, a chart, then top pages and referrers. */
export const StatsSkeleton = () => (
  <Frame><Header action /><Tiles n={3} />
    <Card><Chart /></Card>
    <div className="grid gap-4 lg:grid-cols-2"><Card><Rows n={4} /></Card><Card><Rows n={4} /></Card></div>
  </Frame>
);
