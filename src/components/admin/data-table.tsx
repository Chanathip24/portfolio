"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Loader2, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState, useTransition } from "react";
import { OptionSelect } from "@/components/admin/option-select";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePref } from "@/lib/admin/use-pref";
import { cn } from "cn";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Makes the column sortable: the value rows are ordered by. */
  sort?: (row: T) => string | number;
  align?: "right";
  /** Always shown: the column chooser does not offer it. */
  required?: boolean;
  defaultHidden?: boolean;
  className?: string;
};
export type Sort = { id: string; dir: "asc" | "desc" } | null;
export type BulkResult = { ok: true; message?: string } | { ok: false; error: string };
export type BulkAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
  /** Asked first, with the number selected in the title. */
  confirm?: { title: (n: number) => string; body: string; go: string };
  run: (ids: string[]) => Promise<BulkResult>;
};

const SIZES = [...[10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} rows` })), { value: "0", label: "All rows" }];
/** Past this many rows on one page only the rows in view are drawn (TanStack Virtual); the page scrolls inside its own frame. */
const VIRTUAL_AFTER = 40;
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Page numbers to show: all when few, otherwise the ends and the neighbours of the current page. */
function pageList(current: number, total: number) {
  const keep = [...new Set([0, total - 1, current - 1, current, current + 1].filter((n) => n >= 0 && n < total))].sort((a, b) => a - b);
  return keep.flatMap((n, i) => (i > 0 && n - keep[i - 1] > 1 ? ["gap" as const, n] : [n]));
}

/**
 * The admin's list: a table on a wide screen and cards on a phone, with the same features on both. Click a column to sort,
 * tick rows to act on several at once (the actions come from `bulk`), choose how many rows per page and which columns
 * show. Those choices are remembered per list (`name`). Search and filters belong to the caller, which passes the rows
 * that passed them; this component owns order, paging, selection and columns.
 */
export function DataTable<T>({ name, noun, rows, getId, label, columns, card, rowActions, toolbar, bulk = [], selectable, initialSort = null, empty }: {
  name: string;
  noun: string;
  rows: T[];
  getId: (row: T) => string;
  /** A name for a row, for the checkbox's accessible label. */
  label: (row: T) => string;
  columns: Column<T>[];
  /** What a row looks like as a card on a phone (beside its checkbox). */
  card: (row: T) => React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  toolbar?: React.ReactNode;
  bulk?: BulkAction[];
  /** Rows that cannot be ticked (your own account in the users list). */
  selectable?: (row: T) => boolean;
  initialSort?: Sort;
  empty?: React.ReactNode;
}) {
  const router = useRouter();
  const [size, setSize] = usePref<number>(`admin:${name}:size`, 25);
  const [sort, setSort] = usePref<Sort>(`admin:${name}:sort`, initialSort);
  const [defaultHidden] = useState(() => columns.filter((c) => c.defaultHidden).map((c) => c.id));
  const [hidden, setHidden] = usePref<string[]>(`admin:${name}:hidden`, defaultHidden);
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<BulkAction | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const canPick = (r: T) => (selectable ? selectable(r) : true);
  const shown = columns.filter((c) => c.required || !hidden.includes(c.id));
  const sortable = columns.filter((c) => c.sort);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.id === sort.id)?.sort;
    if (!col) return rows;
    const dir = sort!.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col(a), y = col(b);
      return dir * (typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns are rebuilt every render; only their ids and sort keys matter, which `sort` names
  }, [rows, sort]);

  const per = size === 0 ? Math.max(1, sorted.length) : size;
  const pages = Math.max(1, Math.ceil(sorted.length / per));
  const at = Math.min(page, pages - 1);
  const pageRows = sorted.slice(at * per, at * per + per);

  // Windowing for long pages: the table and the phone cards each get a virtualizer over the same rows.
  const big = pageRows.length > VIRTUAL_AFTER;
  const tableFrame = useRef<HTMLDivElement>(null);
  const cardFrame = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- the virtualizer is only read during render, never memoised
  const vRows = useVirtualizer({ count: big ? pageRows.length : 0, getScrollElement: () => tableFrame.current, estimateSize: () => 57, overscan: 10 });
  const vCards = useVirtualizer({ count: big ? pageRows.length : 0, getScrollElement: () => cardFrame.current, estimateSize: () => 120, overscan: 6, gap: 12 });

  // The selection can only hold rows that still exist (a filter or a delete may have removed some).
  const live = new Set(rows.filter(canPick).map(getId));
  const chosen = [...picked].filter((id) => live.has(id));
  const pageIds = pageRows.filter(canPick).map(getId);
  const pageAll = pageIds.length > 0 && pageIds.every((id) => picked.has(id));
  const pageSome = pageIds.some((id) => picked.has(id));

  const toggle = (id: string, on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const togglePage = (on: boolean) => setPicked((s) => { const n = new Set(s); for (const id of pageIds) { if (on) n.add(id); else n.delete(id); } return n; });
  const clickSort = (id: string) => { setPage(0); setSort(!sort || sort.id !== id ? { id, dir: "asc" } : sort.dir === "asc" ? { id, dir: "desc" } : null); };

  const run = (action: BulkAction) => start(async () => {
    const r = await action.run(chosen);
    setConfirming(null);
    setNotice(r.ok ? { ok: true, text: r.message ?? "Done." } : { ok: false, text: r.error });
    if (r.ok) { setPicked(new Set()); router.refresh(); }
  });

  if (rows.length === 0) return <div className="flex flex-col gap-4"><div className="flex flex-wrap items-center gap-2">{toolbar}</div>{empty}</div>;

  const start1 = at * per + 1;
  const end = Math.min(sorted.length, at * per + per);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          {sortable.length > 0 && (
            <div className="flex items-center gap-1 md:hidden">
              <OptionSelect label="Sort by" value={sort?.id ?? ""} onChange={(v) => { setPage(0); setSort(v ? { id: v, dir: sort?.dir ?? "asc" } : null); }} className="w-40"
                options={[{ value: "", label: "Default order" }, ...sortable.map((c) => ({ value: c.id, label: c.header }))]} />
              <Button variant="outline" size="icon" aria-label={sort?.dir === "desc" ? "Sorted descending, switch to ascending" : "Sorted ascending, switch to descending"} disabled={!sort}
                onClick={() => sort && setSort({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })}>{sort?.dir === "desc" ? <ArrowDown /> : <ArrowUp />}</Button>
            </div>
          )}
          {columns.some((c) => !c.required) && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" className="hidden md:inline-flex" />}><Columns3 /> Columns</DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuGroup><DropdownMenuLabel>Show columns</DropdownMenuLabel></DropdownMenuGroup>
                <DropdownMenuSeparator />
                {columns.filter((c) => !c.required).map((c) => (
                  <DropdownMenuCheckboxItem key={c.id} checked={!hidden.includes(c.id)} onCheckedChange={(on) => setHidden(on ? hidden.filter((h) => h !== c.id) : [...hidden, c.id])}>{c.header}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {bulk.length > 0 && chosen.length > 0 && (
        <div role="region" aria-label="Bulk actions" className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-popover px-4 py-2.5 shadow-md md:top-3">
          <p className="mr-1 text-sm font-medium tabular-nums">{chosen.length} selected</p>
          {pageAll && live.size > chosen.length && (
            <Button variant="link" size="sm" onClick={() => setPicked(new Set(live))}>Select all {live.size}</Button>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {bulk.map((a) => (
              <Button key={a.id} variant={a.destructive ? "destructive" : "outline"} size="sm" disabled={pending}
                onClick={() => (a.confirm ? setConfirming(a) : run(a))}><a.icon /> {a.label}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}><X /> Clear</Button>
          </div>
        </div>
      )}
      {notice && <p role={notice.ok ? "status" : "alert"} className={cn("rounded-xl px-4 py-2.5 text-sm", notice.ok ? "bg-muted" : "bg-destructive/10 text-destructive")}>{notice.text}</p>}

      {/* phone and tablet: cards */}
      <div ref={cardFrame} className={cn("md:hidden", big && "max-h-[70vh] overflow-auto")}>
        <ul className={big ? "relative" : "flex flex-col gap-3"} style={big ? { height: vCards.getTotalSize() } : undefined}>
          {(big ? vCards.getVirtualItems().map((v) => ({ r: pageRows[v.index], v })) : pageRows.map((r) => ({ r, v: null }))).map(({ r, v }) => {
            const id = getId(r);
            return (
              <li key={id} data-index={v?.index} ref={v ? vCards.measureElement : undefined} data-selected={picked.has(id) || undefined}
                style={v ? { position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${v.start}px)` } : undefined}
                className="flex items-start gap-3 rounded-xl border border-border bg-card py-4 pr-3 pl-4 data-selected:border-foreground/40 data-selected:bg-muted/40">
                {bulk.length > 0 && <Checkbox className="mt-1" aria-label={`Select ${label(r)}`} disabled={!canPick(r)} checked={picked.has(id)} onCheckedChange={(on) => toggle(id, Boolean(on))} />}
                <div className="min-w-0 flex-1">{card(r)}</div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* wide screens: the table */}
      <div ref={tableFrame} className={cn("hidden rounded-xl border border-border bg-card md:block", big ? "max-h-[70vh] overflow-auto" : "overflow-hidden")}><Table className="tabular-nums">
        <TableHeader className="sticky top-0 z-[1] bg-muted/70 [&_th]:h-11 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase [&_tr]:border-b-2">
          <TableRow>
            {bulk.length > 0 && (
              <TableHead className="w-10">
                <Checkbox aria-label={`Select all ${noun}s on this page`} checked={pageAll} indeterminate={!pageAll && pageSome} onCheckedChange={(on) => togglePage(Boolean(on))} />
              </TableHead>
            )}
            {shown.map((c) => {
              const active = sort?.id === c.id;
              return (
                <TableHead key={c.id} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined} className={cn("whitespace-nowrap", c.align === "right" && "text-right")}>
                  {c.sort ? (
                    <button type="button" onClick={() => clickSort(c.id)} className={cn("-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground", active && "text-foreground")}>
                      {c.header}
                      {active ? (sort!.dir === "asc" ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />) : <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />}
                    </button>
                  ) : c.header}
                </TableHead>
              );
            })}
            {rowActions && <TableHead><span className="sr-only">Actions</span></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {big && vRows.getVirtualItems().length > 0 && <tr aria-hidden style={{ height: vRows.getVirtualItems()[0].start }} />}
          {(big ? vRows.getVirtualItems().map((v) => ({ r: pageRows[v.index], i: v.index })) : pageRows.map((r) => ({ r, i: undefined }))).map(({ r, i }) => {
            const id = getId(r);
            return (
              <TableRow key={id} data-index={i} ref={big ? vRows.measureElement : undefined} data-state={picked.has(id) ? "selected" : undefined} className="data-[state=selected]:bg-primary/10 [&>td]:py-3">
                {bulk.length > 0 && (
                  <TableCell><Checkbox aria-label={`Select ${label(r)}`} disabled={!canPick(r)} checked={picked.has(id)} onCheckedChange={(on) => toggle(id, Boolean(on))} /></TableCell>
                )}
                {shown.map((c) => <TableCell key={c.id} className={cn(c.align === "right" && "text-right", c.className)}>{c.cell(r)}</TableCell>)}
                {rowActions && <TableCell>{rowActions(r)}</TableCell>}
              </TableRow>
            );
          })}
          {big && vRows.getVirtualItems().length > 0 && <tr aria-hidden style={{ height: vRows.getTotalSize() - vRows.getVirtualItems()[vRows.getVirtualItems().length - 1].end }} />}
        </TableBody>
      </Table></div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm">
        <div className="flex items-center gap-3">
          <OptionSelect label="Rows per page" value={String(size)} onChange={(v) => { setSize(Number(v)); setPage(0); }} options={SIZES} size="sm" className="w-28" />
          <p role="status" className="tabular-nums text-muted-foreground">{start1}–{end} of {sorted.length}</p>
        </div>
        {pages > 1 && (
          <nav aria-label={`${noun} pages`} className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={at === 0} onClick={() => setPage(at - 1)}><ChevronLeft /></Button>
            {pageList(at, pages).map((n, i) => n === "gap"
              ? <span key={`gap${i}`} aria-hidden className="px-1 text-muted-foreground">…</span>
              : <Button key={n} variant={n === at ? "secondary" : "ghost"} size="icon-sm" aria-label={`Page ${n + 1}`} aria-current={n === at ? "page" : undefined} className="tabular-nums" onClick={() => setPage(n)}>{n + 1}</Button>)}
            <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}><ChevronRight /></Button>
          </nav>
        )}
      </div>

      <AlertDialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming?.confirm?.title(chosen.length)}</AlertDialogTitle>
            <AlertDialogDescription>{confirming?.confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant={confirming?.destructive ? "destructive" : "default"} disabled={pending} onClick={() => confirming && run(confirming)}>{pending && <Loader2 className="animate-spin" />} {confirming?.confirm?.go}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
