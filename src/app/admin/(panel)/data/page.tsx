import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { DataToolsOff } from "@/components/admin/data-tools-off";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UrlSelect, PAGE_SIZE_OPTIONS } from "@/components/admin/url-select";
import { BROWSABLE, browseTable, getSettings, isBrowsable } from "@/lib/admin/data";
import { cn } from "cn";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
/** One cell as short text: long strings and JSON are cut, and the full row is under "Show JSON". */
function cell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

export default async function DataPage({ searchParams }: { searchParams: Promise<{ table?: string; page?: string; size?: string; sort?: string; dir?: string }> }) {
  if (!(await getSettings()).dataToolsEnabled) return (<><PageHeader title="Data" /><DataToolsOff /></>);
  const sp = await searchParams;
  const table = sp.table && isBrowsable(sp.table) ? sp.table : "posts";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const size = [10, 25, 50, 100].includes(Number(sp.size)) ? Number(sp.size) : 25;
  const dir = sp.dir === "desc" ? "desc" : "asc";
  const { rows, total } = await browseTable(table, page, size, sp.sort, dir);
  const q = (extra: Record<string, string | number>) => new URLSearchParams({ table, size: String(size), ...(sp.sort ? { sort: sp.sort, dir } : {}), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) }).toString();
  const columns = rows[0] ? Object.keys(rows[0]).filter((c) => c !== "body" && c !== "bio") : [];
  const pages = Math.max(1, Math.ceil(total / size));

  return (
    <>
      <PageHeader title="Data" description="A read-only look at the site's tables. To change something, use its page in the menu." />
      <nav aria-label="Tables" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {BROWSABLE.map((t) => (
          <Link key={t} href={`/admin/data?table=${t}`} aria-current={t === table ? "page" : undefined}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", t === table ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")}>{t}</Link>
        ))}
      </nav>
      <p className="mb-3 text-sm text-muted-foreground" role="status"><span className="font-medium text-foreground tabular-nums">{total}</span> {total === 1 ? "row" : "rows"} in <code className="rounded bg-muted px-1.5 py-0.5">{table}</code></p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">This table is empty.</p>
      ) : (
        <>
        <p className="mb-2 text-xs text-muted-foreground sm:hidden">Swipe sideways to see more columns.</p>
        <div className="overflow-hidden rounded-xl border border-border bg-card"><Table className="tabular-nums">
          <TableHeader className="bg-muted/70 [&_th]:h-11 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase [&_tr]:border-b-2"><TableRow>{columns.map((c) => <TableHead key={c} aria-sort={sp.sort === c ? (dir === "asc" ? "ascending" : "descending") : undefined} className="whitespace-nowrap"><Link href={`/admin/data?${q({ sort: c, dir: sp.sort === c && dir === "asc" ? "desc" : "asc" })}`} className="-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground">{c}{sp.sort === c ? (dir === "asc" ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />) : <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />}</Link></TableHead>)}<TableHead><span className="sr-only">Details</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={String(r.id ?? r.slug ?? i)}>
                {columns.map((c) => <TableCell key={c} className="max-w-36 truncate font-mono text-xs sm:max-w-56">{cell(r[c])}</TableCell>)}
                <TableCell>
                  <details className="text-xs">
                    <summary className="cursor-pointer whitespace-nowrap text-muted-foreground hover:text-foreground">Show JSON</summary>
                    <pre className="mt-2 max-h-64 max-w-md overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed whitespace-pre-wrap">{JSON.stringify(r, null, 2)}</pre>
                  </details>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div>
        </>
      )}
      {total > 0 && (
        <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <UrlSelect param="size" value={String(size)} options={PAGE_SIZE_OPTIONS} label="Rows per page" />
          <Button variant="outline" disabled={page <= 1} render={page > 1 ? <Link href={`/admin/data?${q({ page: page - 1 })}`} /> : undefined} nativeButton={page <= 1} role={page > 1 ? "link" : undefined}>Previous</Button>
          <span className="tabular-nums text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page >= pages} render={page < pages ? <Link href={`/admin/data?${q({ page: page + 1 })}`} /> : undefined} nativeButton={page >= pages} role={page < pages ? "link" : undefined}>Next</Button>
        </nav>
      )}
    </>
  );
}
