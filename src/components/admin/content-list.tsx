"use client";

import { Archive, ExternalLink, FilePenLine, Globe, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { bulkDelete, bulkSetStatus } from "@/app/admin/content-actions";
import { type BulkAction, type Column, DataTable, type Sort } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/entity-manager";
import { OptionSelect } from "@/components/admin/option-select";
import { StatusBadge } from "@/components/admin/page-header";
import { EmptyState, SearchInput } from "@/components/admin/shared";
import { Tip } from "@/components/admin/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount, formatDate } from "@/lib/format";

type Visibility = "live" | "scheduled" | "draft" | "archived";
export type PostRowData = { id: string; slug: string; title: string; creator: string; categoryName: string; views: number; published_at: string; visibility: Visibility };
export type ProjectRowData = { id: string; slug: string; title: string; creator: string; client: string; tagNames: string[]; is_signature: boolean; sort_order: number; published_at: string; visibility: Visibility };
type Row = PostRowData | ProjectRowData;

const VISIBILITY = [
  { value: "all", label: "Everything" }, { value: "live", label: "Live" }, { value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" },
];
const RANK: Record<Visibility, number> = { live: 0, scheduled: 1, draft: 2, archived: 3 };
const time = (iso: string) => new Date(iso).getTime();
// Constants, so the remembered-setting hook gets a stable fallback.
const POST_SORT: Sort = { id: "date", dir: "desc" };
const PROJECT_SORT: Sort = { id: "order", dir: "asc" };

const statusActions = (entity: "post" | "project", noun: string): BulkAction[] => [
  { id: "publish", label: "Publish", icon: Globe, run: (ids) => bulkSetStatus(entity, ids, "published") },
  { id: "draft", label: "Move to draft", icon: FilePenLine, run: (ids) => bulkSetStatus(entity, ids, "draft") },
  { id: "archive", label: "Archive", icon: Archive, run: (ids) => bulkSetStatus(entity, ids, "archived") },
  { id: "delete", label: "Delete", icon: Trash2, destructive: true, run: (ids) => bulkDelete(entity, ids),
    confirm: { title: (n) => `Delete ${n} ${noun}${n === 1 ? "" : "s"}?`, body: "They are removed from the site and can't be recovered.", go: "Delete" } },
];

type Props = { kind: "post"; rows: PostRowData[] } | { kind: "project"; rows: ProjectRowData[] };

/** Posts or projects: search, a visibility filter, sortable columns, row selection with bulk publish, draft, archive and delete,
 *  paging with a rows-per-page choice, and a column chooser. A table on a wide screen, cards on a phone. */
export function ContentList(props: Props) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState("all");
  const isPost = props.kind === "post";
  const base = isPost ? "/admin/posts" : "/admin/projects";
  const publicBase = isPost ? "/blog" : "/work";
  const noun = isPost ? "post" : "project";
  // A title opens how the item is read; its Edit button goes to the editor (a post's has a preview of what visitors see).
  const open = (id: string) => `${base}/${id}/stats`;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (props.rows as Row[]).filter((r) =>
      (shown === "all" || r.visibility === shown) &&
      (!needle || r.title.toLowerCase().includes(needle) || r.slug.toLowerCase().includes(needle) || r.creator.toLowerCase().includes(needle) || ("client" in r && r.client.toLowerCase().includes(needle)) ||
        ("categoryName" in r && r.categoryName.toLowerCase().includes(needle)) || ("tagNames" in r && r.tagNames.some((t) => t.toLowerCase().includes(needle)))));
  }, [props.rows, q, shown]);

  const columns: Column<Row>[] = [
    { id: "title", header: "Title", required: true, sort: (r) => r.title, className: "max-w-72 whitespace-normal", cell: (r) => <><Link href={open(r.id)} className="font-medium hover:underline">{r.title}</Link><span className="block truncate text-xs text-muted-foreground">/{r.slug}</span></> },
    { id: "creator", header: "Created by", sort: (r) => r.creator, className: "max-w-44 truncate", cell: (r) => <span className="text-muted-foreground">{r.creator}</span> },
    ...(isPost ? [
      { id: "category", header: "Category", sort: (r: Row) => ("categoryName" in r ? r.categoryName : ""), cell: (r: Row) => ("categoryName" in r ? r.categoryName : "") },
    ] : [
      { id: "client", header: "Client", sort: (r: Row) => ("client" in r ? r.client : ""), cell: (r: Row) => ("client" in r ? r.client : "") },
      { id: "categories", header: "Categories", defaultHidden: true, cell: (r: Row) => ("tagNames" in r ? r.tagNames.join(", ") : "") },
    ]),
    { id: "status", header: "Status", sort: (r) => RANK[r.visibility], cell: (r) => <StatusBadge status={r.visibility} /> },
    ...(isPost ? [
      { id: "views", header: "Views", align: "right" as const, sort: (r: Row) => ("views" in r ? r.views : 0), cell: (r: Row) => ("views" in r ? formatCount(r.views) : "") },
    ] : [
      { id: "layout", header: "Layout", sort: (r: Row) => ("is_signature" in r && r.is_signature ? 0 : 1), cell: (r: Row) => ("is_signature" in r && r.is_signature ? <Badge variant="outline">Signature</Badge> : <span className="text-muted-foreground">Index</span>) },
      { id: "order", header: "Order", align: "right" as const, sort: (r: Row) => ("sort_order" in r ? r.sort_order : 0), cell: (r: Row) => ("sort_order" in r ? r.sort_order : "") },
    ]),
    { id: "date", header: "Date", className: "whitespace-nowrap", sort: (r) => time(r.published_at), cell: (r) => formatDate(r.published_at) },
  ];

  const actions = (r: Row, big?: boolean) => (
    <div className="flex justify-end gap-1">
      <Tip label="Edit"><Button variant="ghost" size={big ? "icon" : "icon-sm"} aria-label={`Edit ${r.title}`} render={<Link href={`${base}/${r.id}`} />} nativeButton={false} role="link"><Pencil /></Button></Tip>
      {r.visibility === "live" && (
        <Tip label="View on site"><Button variant="ghost" size={big ? "icon" : "icon-sm"} aria-label={`View ${r.title} on the site`} render={<a href={`${publicBase}/${r.slug}`} target="_blank" rel="noopener" />} nativeButton={false} role="link"><ExternalLink /></Button></Tip>
      )}
      <DeleteButton entity={props.kind} id={r.id} name={r.title} iconOnly />
    </div>
  );

  if (props.rows.length === 0) {
    return (
      <EmptyState className="p-12" action={<Button render={<Link href={`${base}/new`} />} nativeButton={false} role="link"><Plus /> New {noun}</Button>}>No {noun}s yet. Write the first one and it shows up here.</EmptyState>
    );
  }

  return (
    <DataTable<Row>
      name={`${noun}s`}
      noun={noun}
      rows={rows}
      getId={(r) => r.id}
      label={(r) => r.title}
      columns={columns}
      initialSort={isPost ? POST_SORT : PROJECT_SORT}
      bulk={statusActions(props.kind, noun)}
      rowActions={(r) => actions(r)}
      toolbar={
        <>
          <SearchInput label={`Search ${noun}s`} placeholder={`Search by title, address or creator`} value={q} onChange={setQ} />
          <OptionSelect label="Filter by visibility" value={shown} onChange={setShown} options={VISIBILITY} className="w-40" />
          <p role="status" className="text-sm tabular-nums text-muted-foreground">{rows.length} of {props.rows.length}</p>
        </>
      }
      card={(r) => (
        <>
          <div className="flex items-start justify-between gap-3">
            <Link href={open(r.id)} className="min-w-0 font-medium leading-snug hover:underline">{r.title}</Link>
            <StatusBadge status={r.visibility} />
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="min-w-0 pb-2 text-sm text-muted-foreground">
              {"categoryName" in r
                ? <>{r.categoryName} · {formatDate(r.published_at)} · {formatCount(r.views)} views</>
                : <>{[r.is_signature ? "Signature" : "", r.client, r.tagNames.join(", ")].filter(Boolean).join(" · ")} · {formatDate(r.published_at)}</>}
            </p>
            {actions(r, true)}
          </div>
        </>
      )}
      empty={
        <EmptyState action={<Button variant="outline" size="sm" onClick={() => { setQ(""); setShown("all"); }}>Clear filters</Button>}>No {noun}s match that.</EmptyState>
      }
    />
  );
}
