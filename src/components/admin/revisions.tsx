"use client";

import { History, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreRevision } from "@/app/admin/history-actions";
import { EmptyState } from "@/components/admin/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { RevisionRow } from "@/lib/admin/data";
import { formatDate, formatTime, timeAgo } from "@/lib/format";

export const KIND: Record<string, string> = {
  posts: "Post", projects: "Project", profile: "Profile", socials: "Social link", skills: "Skill", tools: "Tool", career: "Career entry",
  testimonials: "Testimonial", post_categories: "Blog category", project_categories: "Work category", skill_groups: "Skill group",
};
const field = (k: string) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** A list of saved versions, each with a Restore button that works at once. `showItem` names the kind of item (for the site-wide list). */
export function RevisionList({ items, showItem = false }: { items: RevisionRow[]; showItem?: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const restore = (id: number) => { setNote(null); setBusy(id); start(async () => { const r = await restoreRevision(id); setNote(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error }); setBusy(null); if (r.ok) router.refresh(); }); };
  if (items.length === 0) return <EmptyState>No earlier versions yet. Each time something is changed or deleted, the version before it is kept here.</EmptyState>;
  return (
    <div className="flex flex-col gap-3">
      {note && <p role={note.ok ? "status" : "alert"} className={note.ok ? "rounded-xl bg-muted px-4 py-2.5 text-sm" : "rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive"}>{note.text}</p>}
      <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {showItem && <Badge variant="outline" className="font-normal">{KIND[r.entity] ?? r.entity}</Badge>}
                {r.action === "deleted" && <Badge variant="destructive" className="gap-1 font-normal"><Trash2 aria-hidden className="size-3" /> Deleted</Badge>}
                <span className="truncate font-medium">{r.label || "(untitled)"}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <time dateTime={r.at} title={`${formatDate(r.at)}, ${formatTime(r.at)} UTC`}>{timeAgo(r.at)}</time> · {r.actor_email ?? "System"}
                {r.changed.length > 0 && <> · changed {r.changed.slice(0, 4).map(field).join(", ").toLowerCase()}{r.changed.length > 4 && ` and ${r.changed.length - 4} more`}</>}
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0" disabled={pending} onClick={() => restore(r.id)} aria-label={`${r.action === "deleted" ? "Bring back" : "Restore"} the version from ${formatDate(r.at)} ${formatTime(r.at)}`}>
              {busy === r.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} {r.action === "deleted" ? "Bring back" : "Restore"}
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The History button on an item's page: a side sheet with that item's earlier versions. */
export function HistoryButton({ items }: { items: RevisionRow[] }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}><History /> History{items.length > 0 && <span className="tabular-nums text-muted-foreground">{items.length}</span>}</SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>History</SheetTitle><SheetDescription>Earlier versions, newest first. Restore puts one back at once; the version it replaces is kept, so you can always go back.</SheetDescription></SheetHeader>
        <div className="px-4 pb-6"><RevisionList items={items} /></div>
      </SheetContent>
    </Sheet>
  );
}
