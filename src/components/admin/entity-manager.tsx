"use client";

import { Loader2, Pencil, Plus, Quote, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEntity } from "@/app/admin/content-actions";
import { EntityForm } from "@/components/admin/entity-form";
import { Tip } from "@/components/admin/tip";
import { UserAvatar } from "@/components/admin/user-avatar";
import { ToolMark, toolTint } from "@/components/tool-mark";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { type EntityName, type Option, blank } from "@/lib/admin/fields";
import type { ToolRow } from "@/lib/api/types";
import { cn } from "cn";

/** Asks first, then deletes. After it succeeds the page re-reads its data (or goes to `redirectTo`). */
export function DeleteButton({ entity, id, name, redirectTo, iconOnly }: { entity: EntityName; id: string; name: string; redirectTo?: string; iconOnly?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const confirm = () => start(async () => {
    const r = await deleteEntity(entity, id);
    if (!r.ok) return setError(r.error ?? "Could not delete.");
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  });
  const trigger = (
    <Button type="button" variant={iconOnly ? "ghost" : "destructive"} size={iconOnly ? "icon-sm" : "default"} aria-label={`Delete ${name}`} onClick={() => { setError(""); setOpen(true); }}>
      <Trash2 /> {!iconOnly && "Delete"}
    </Button>
  );
  return (
    <>
      {iconOnly ? <Tip label="Delete">{trigger}</Tip> : trigger}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes it from the site and can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirm}>{pending && <Loader2 className="animate-spin" />}Delete</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export type ManagerItem = {
  /** uuid, or the slug for categories and groups. */
  id: string;
  title: string;
  meta: string;
  values: Record<string, unknown>;
  /** Headings the list is split under (skills by group). */
  group?: string;
  badge?: string;
  /** For the tile view: what to draw as the mark. */
  tool?: Pick<ToolRow, "name" | "tool_key" | "logo_url">;
  /** For the quote view. */
  quote?: { text: string; avatar: string | null; who: string };
  /** A short line under the title, e.g. how many things use this category. */
  note?: string;
};
export type ManagerVariant = "list" | "tiles" | "timeline" | "quotes";

/** The small items of the About page and the managed lists, in four shapes: a list (optionally grouped), logo tiles, a
 *  timeline and quote cards. Adding and editing happen in a side panel, so the list stays in view beside it. */
export function EntityManager({ entity, noun, items, empty, variant = "list", options }: {
  entity: EntityName; noun: string; items: ManagerItem[]; empty: string; variant?: ManagerVariant; options?: Record<string, Option[]>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; values: Record<string, unknown> } | null>(null);
  const add = () => setEditing({ id: null, values: blank[entity] });
  const edit = (it: ManagerItem) => setEditing({ id: it.id, values: it.values });
  const actions = (it: ManagerItem) => (
    <div className="flex shrink-0 items-center">
      <Tip label="Edit"><Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${it.title}`} onClick={() => edit(it)}><Pencil /></Button></Tip>
      <DeleteButton entity={entity} id={it.id} name={it.title} iconOnly />
    </div>
  );

  // Items arrive in the order to show; a heading appears wherever the group changes.
  const groups = items.reduce<{ title?: string; items: ManagerItem[] }[]>((acc, it) => {
    const last = acc[acc.length - 1];
    if (last && last.title === it.group) last.items.push(it);
    else acc.push({ title: it.group, items: [it] });
    return acc;
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={add}><Plus /> Add {noun}</Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{empty}</p>
          <Button type="button" variant="outline" size="sm" onClick={add}><Plus /> Add {noun}</Button>
        </div>
      ) : variant === "tiles" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <li key={it.id} style={it.tool ? ({ "--tool": toolTint(it.tool) } as React.CSSProperties) : undefined}
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 pt-6 text-center transition-colors hover:border-[color-mix(in_oklab,var(--tool,var(--brand-ink))_45%,var(--border))]">
              {it.tool && <ToolMark tool={it.tool} iconClassName="size-7" className="size-16 rounded-xl bg-[color-mix(in_oklab,var(--tool)_12%,transparent)] text-[var(--tool)]" />}
              <div className="min-w-0">
                <p className="truncate font-medium">{it.title}</p>
                <p className="truncate text-xs text-muted-foreground">{it.meta}</p>
              </div>
              <div className="absolute top-1.5 right-1.5">{actions(it)}</div>
            </li>
          ))}
        </ul>
      ) : variant === "timeline" ? (
        <ol className="relative flex flex-col gap-4 border-l border-border pl-6">
          {items.map((it) => (
            <li key={it.id} className="relative rounded-xl border border-border bg-card p-4">
              <span aria-hidden className="absolute top-6 -left-[1.72rem] size-3 rounded-full border-2 border-background bg-brand-ink" />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">{it.title} {it.badge && <Badge variant="secondary">{it.badge}</Badge>}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{it.meta}</p>
                  {it.note && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{it.note}</p>}
                </div>
                {actions(it)}
              </div>
            </li>
          ))}
        </ol>
      ) : variant === "quotes" ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
              <Quote aria-hidden className="size-5 text-brand-ink/60" />
              <p className="line-clamp-4 flex-1 text-[0.9375rem] leading-relaxed">{it.quote?.text}</p>
              <div className="flex items-center gap-3">
                <UserAvatar name={it.title} src={it.quote?.avatar} className="size-9" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{it.title}</p><p className="truncate text-xs text-muted-foreground">{it.meta}</p></div>
                {actions(it)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.title ?? "all"} aria-label={g.title}>
              {g.title && <h3 className="mb-2 flex items-baseline gap-2 text-sm font-medium">{g.title} <span className="font-normal text-muted-foreground tabular-nums">{g.items.length}</span></h3>}
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {g.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-3.5 pr-3 pl-6 transition-colors hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium"><span className="truncate">{it.title}</span> {it.badge && <Badge variant="secondary">{it.badge}</Badge>}</p>
                      {it.meta && <p className="truncate text-sm text-muted-foreground">{it.meta}</p>}
                    </div>
                    {it.note && <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{it.note}</span>}
                    {actions(it)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className={cn("w-full overflow-y-auto sm:max-w-lg")}>
          <SheetHeader>
            <SheetTitle>{editing?.id ? `Edit ${noun}` : `Add ${noun}`}</SheetTitle>
            <SheetDescription>Changes appear on the site after you save.</SheetDescription>
          </SheetHeader>
          {editing && (
            <div className="px-4 pb-4">
              <EntityForm key={editing.id ?? "new"} entity={entity} id={editing.id} initial={editing.values} submitLabel={editing.id ? "Save changes" : `Add ${noun}`} surface="panel" options={options}
                onSaved={() => { setEditing(null); router.refresh(); }} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
