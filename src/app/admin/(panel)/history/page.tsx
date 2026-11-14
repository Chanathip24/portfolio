import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { KIND, RevisionList } from "@/components/admin/revisions";
import { SegmentedNav } from "@/components/admin/shared";
import { UrlSelect } from "@/components/admin/url-select";
import { Button } from "@/components/ui/button";
import { listAllRevisions } from "@/lib/admin/data";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
const PAGE = 50;
const SHOW = [{ id: "all", label: "Every change" }, { id: "deleted", label: "Deleted" }] as const;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string; entity?: string; show?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const entity = sp.entity && sp.entity in KIND ? sp.entity : undefined;
  const show = sp.show === "deleted" ? "deleted" : "all";
  const { rows, total } = await listAllRevisions({ entity, action: show === "deleted" ? "deleted" : undefined, limit: PAGE, offset: (page - 1) * PAGE });
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (extra: Record<string, string>) => `/admin/history?${new URLSearchParams({ ...(entity ? { entity } : {}), show, ...extra }).toString()}`;
  return (
    <>
      <PageHeader title="History" description="The version before every change and every deletion, for posts, projects, your profile and the About page. Restore any of them with one click; the version it replaces is kept too." />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedNav label="Show" items={SHOW.map((s) => ({ href: href({ show: s.id }), label: s.label, active: s.id === show }))} />
          <UrlSelect param="entity" value={entity ?? "all"} label="Filter by kind" className="w-48" options={[{ value: "all", label: "Everything" }, ...Object.entries(KIND).map(([value, label]) => ({ value, label }))]} />
          <p role="status" className="ml-auto text-sm tabular-nums text-muted-foreground">{total} saved {total === 1 ? "version" : "versions"}</p>
        </div>
        <RevisionList items={rows} showItem />
        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
            <Button variant="outline" disabled={page <= 1} render={page > 1 ? <Link href={href({ page: String(page - 1) })} /> : undefined} nativeButton={page <= 1} role={page > 1 ? "link" : undefined}>Newer</Button>
            <span className="tabular-nums text-muted-foreground">Page {page} of {pages}</span>
            <Button variant="outline" disabled={page >= pages} render={page < pages ? <Link href={href({ page: String(page + 1) })} /> : undefined} nativeButton={page >= pages} role={page < pages ? "link" : undefined}>Older</Button>
          </nav>
        )}
      </div>
    </>
  );
}
