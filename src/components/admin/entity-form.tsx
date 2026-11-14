"use client";

import type { JSONContent } from "@tiptap/core";
import dynamic from "next/dynamic";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { saveEntity } from "@/app/admin/content-actions";
import { DateTimeField } from "@/components/admin/date-time-field";
import { OptionSelect } from "@/components/admin/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type EntityName, type Field, type Option, fields } from "@/lib/admin/fields";
import { formatLocalDateTime } from "@/lib/format";
import { uploadImage } from "@/lib/admin/upload";
import { cn } from "cn";

// Only the Preview tab needs the HTML renderer, so it is loaded when that tab is first opened.
// Tiptap is large: load it only for forms that have a rich-text field.
const RichEditor = dynamic(() => import("@/components/admin/rich-editor").then((m) => m.RichEditor), { ssr: false, loading: () => <div aria-busy className="h-64 animate-pulse rounded-lg bg-muted" /> });
const PostPreview = dynamic(() => import("@/components/admin/post-preview").then((m) => m.PostPreview), { ssr: false });

type Values = Record<string, unknown>;

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO instant -> the local "YYYY-MM-DDTHH:mm" the date field holds. */
const toLocal = (iso: unknown) => {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Row values -> what the controls hold (strings for inputs, arrays and objects kept as they are). */
const toForm = (list: Field[], v: Values): Values =>
  Object.fromEntries(list.map((f) => {
    const x = v[f.name];
    if (f.type === "datetime") return [f.name, toLocal(x)];
    if (f.type === "lines") return [f.name, Array.isArray(x) ? x.join("\n") : ""];
    if (f.type === "number" || f.type === "select") return [f.name, x === null || x === undefined ? "" : String(x)];
    if (f.type === "multiselect") return [f.name, Array.isArray(x) ? x : []];
    if (f.type === "switch") return [f.name, Boolean(x)];
    if (f.type === "richtext") return [f.name, x ?? { type: "doc", content: [] }];
    return [f.name, x ?? ""];
  }));

/** Controls -> the payload the Server Action validates. */
const toPayload = (list: Field[], v: Values): Values =>
  Object.fromEntries(list.map((f) => {
    const x = v[f.name];
    if (f.type === "datetime") return [f.name, x ? new Date(String(x)).toISOString() : ""];
    if (f.type === "lines") return [f.name, String(x ?? "").split("\n").map((l) => l.trim()).filter(Boolean)];
    if (f.type === "number") return [f.name, x === "" ? (f.nullable ? null : 0) : Number(x)];
    return [f.name, x];
  }));

/** One line saying what the status and date mean together: not visible, scheduled, or live. */
function publishNote(status: unknown, local: unknown) {
  if (status !== "published") return status === "archived" ? "Archived: hidden from the site." : "Draft: not visible on the site.";
  if (typeof local !== "string" || !local) return "Goes live as soon as you save.";
  const date = new Date(local);
  return date.getTime() > Date.now() ? `Scheduled: goes live on ${formatLocalDateTime(date)}.` : `Live since ${formatLocalDateTime(date)}.`;
}

function ImageField({ id, value, onChange, invalid, describedBy, contain }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean; describedBy?: string; contain?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file: File) => {
    setBusy(true); setError("");
    try { onChange(await uploadImage(file)); } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    setBusy(false);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className={cn("grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-input text-muted-foreground", contain ? "bg-white dark:bg-muted" : "bg-muted")}>
          {/* A plain img: this is a preview of an arbitrary URL, not a page image that needs optimising. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className={cn("size-full", contain ? "object-contain p-2" : "object-cover")} /> : <ImagePlus aria-hidden className="size-5" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste an image address, or upload" aria-invalid={invalid} aria-describedby={describedBy} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {busy ? "Uploading…" : "Upload image"}
            </Button>
            {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}><X /> Remove</Button>}
          </div>
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} aria-hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void pick(f); }} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** One form for every kind of item, drawn from the field list in lib/admin/fields.ts. The Server Action is the
 *  authority: it re-validates everything and reports problems per field, which are shown under the field.
 *  `options` supplies the choices of selects that come from the database (categories, groups). */
export function EntityForm({ entity, id, initial, submitLabel = "Save", onSaved, surface = "page", options = {} }: {
  entity: EntityName; id: string | null; initial: Values; submitLabel?: string; onSaved?: (id: string) => void; surface?: "page" | "panel";
  options?: Record<string, Option[]>;
}) {
  const list = fields[entity];
  const uid = useId();
  const [values, setValues] = useState(() => {
    const v = toForm(list, initial);
    // A select fed by the database starts on its first choice when the item has none yet.
    for (const f of list) {
      const choices = options[f.name] ?? (f.type === "select" ? f.options : []);
      if (f.type === "select" && v[f.name] === "" && choices.length > 0 && !choices.some((o) => o.value === "")) v[f.name] = choices[0].value;
    }
    return v;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const canPreview = entity === "post";

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (name: string, v: unknown) => { setValues((s) => ({ ...s, [name]: v })); setDirty(true); setStatus(null); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); setStatus(null);
    start(async () => {
      const r = await saveEntity(entity, id, toPayload(list, values));
      if (!r.ok) { setErrors(r.fieldErrors ?? {}); setStatus({ ok: false, text: r.error }); return; }
      if (r.slug && "slug" in values) setValues((s) => ({ ...s, slug: r.slug }));
      setDirty(false);
      setStatus({ ok: true, text: "Saved." });
      onSaved?.(r.id);
    });
  };

  const renderField = (f: Field) => {
    const fid = `${uid}-${f.name}`, err = errors[f.name];
    const hintText = f.name === "published_at" && "status" in values ? publishNote(values.status, values.published_at) + (f.hint ? ` ${f.hint}` : "") : f.hint;
    const hint = hintText ? `${fid}-hint` : undefined, desc = [err ? `${fid}-err` : "", hint ?? ""].join(" ").trim() || undefined;
    const v = values[f.name];
    const common = { id: fid, "aria-invalid": Boolean(err), "aria-describedby": desc } as const;
    const locked = Boolean(f.lockedOnEdit && id !== null);
    const choices = options[f.name] ?? (f.type === "select" || f.type === "multiselect" ? f.options : []);
    return (
      <div key={f.name} className={cn("flex min-w-0 flex-col gap-1.5", (f.wide || f.type === "richtext") && !f.aside && "sm:col-span-2")}>
        {f.type === "switch" ? (
          <div className="flex items-center gap-3">
            <Switch id={fid} checked={Boolean(v)} onCheckedChange={(c) => set(f.name, c)} aria-describedby={desc} />
            <Label htmlFor={fid}>{f.label}</Label>
          </div>
        ) : (
          <Label htmlFor={fid} className={f.group === f.label ? "sr-only" : undefined}>{f.label}</Label>
        )}
        {(f.type === "text" || f.type === "url") && <Input {...common} type="text" inputMode={f.type === "url" ? "url" : undefined} value={String(v ?? "")} placeholder={f.placeholder} disabled={locked} onChange={(e) => set(f.name, e.target.value)} className={f.name === "title" && f.wide ? "h-12 text-lg" : undefined} />}
        {f.type === "number" && <Input {...common} type="number" inputMode="numeric" placeholder={f.placeholder ?? "0"} min={f.min} max={f.max} className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} />}
        {f.type === "datetime" && <DateTimeField id={fid} value={String(v ?? "")} onChange={(x) => set(f.name, x)} invalid={Boolean(err)} describedBy={desc} />}
        {f.type === "textarea" && <Textarea {...common} rows={4} placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} />}
        {f.type === "lines" && <Textarea {...common} rows={5} placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} />}
        {f.type === "select" && <OptionSelect id={fid} value={String(v ?? "")} onChange={(x) => set(f.name, x)} options={choices} invalid={Boolean(err)} describedBy={desc} />}
        {f.type === "multiselect" && (
          <div role="group" aria-labelledby={fid} className="flex flex-wrap gap-2">
            {choices.length === 0 && <p className="text-sm text-muted-foreground">No categories yet. Add some under Categories.</p>}
            {choices.map((o) => {
              const picked = (v as string[]).includes(o.value);
              return (
                <Button key={o.value} type="button" size="sm" variant={picked ? "default" : "outline"} aria-pressed={picked}
                  onClick={() => set(f.name, picked ? (v as string[]).filter((x) => x !== o.value) : [...(v as string[]), o.value])}>
                  {o.label}
                </Button>
              );
            })}
          </div>
        )}
        {f.type === "image" && <ImageField id={fid} value={String(v ?? "")} onChange={(x) => set(f.name, x)} invalid={Boolean(err)} describedBy={desc} contain={f.name === "logo_url"} />}
        {f.type === "richtext" && <RichEditor label={f.label} value={v as JSONContent} onChange={(d) => set(f.name, d)} invalid={Boolean(err)} />}
        {hintText && <p id={hint} className={cn("text-xs text-muted-foreground", f.name === "published_at" && "text-foreground/80")}>{hintText}</p>}
        {err && <p id={`${fid}-err`} role="alert" className="text-sm text-destructive">{err}</p>}
      </div>
    );
  };

  // Sections by `group`, in order. Long forms (post, project) put some of them in a narrow column beside the content.
  const group = (items: Field[]) => items.reduce<{ title?: string; fields: Field[] }[]>((acc, f) => {
    const last = acc[acc.length - 1];
    if (last && last.title === f.group) last.fields.push(f);
    else acc.push({ title: f.group, fields: [f] });
    return acc;
  }, []);
  const main = group(list.filter((f) => !f.aside));
  const side = group(list.filter((f) => f.aside));

  const categoryName = (options.category ?? []).find((o) => o.value === values.category)?.label ?? String(values.category ?? "");
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      {canPreview && (
        <div role="tablist" aria-label="Edit or preview" className="flex w-fit gap-0.5 rounded-lg bg-muted p-0.5 text-sm">
          {(["edit", "preview"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cn("rounded-md px-3 py-1 capitalize", tab === t ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{t}</button>
          ))}
        </div>
      )}
      {canPreview && tab === "preview" && (
        <PostPreview title={String(values.title ?? "")} excerpt={String(values.excerpt ?? "")} image={String(values.image_url ?? "")} imageAlt={String(values.image_alt ?? "")} category={categoryName}
          minutes={Number(initial.reading_minutes) || 1} note={publishNote(values.status, values.published_at)} doc={values.body as JSONContent} />
      )}
      <div hidden={canPreview && tab === "preview"} className={cn(side.length > 0 && "grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start")}>
        <div className="flex min-w-0 flex-col gap-10">
          {main.map((sec) => (
            <section key={sec.title ?? "all"} className="flex flex-col gap-5">
              {sec.title && <h2 className="border-b border-border pb-2 text-base font-medium">{sec.title}</h2>}
              <div className="grid gap-5 sm:grid-cols-2">{sec.fields.map(renderField)}</div>
            </section>
          ))}
        </div>
        {side.length > 0 && (
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            {side.map((sec) => (
              <section key={sec.title} aria-label={sec.title} className="flex flex-col gap-4 rounded-xl border border-border p-4">
                <h2 className="text-sm font-medium">{sec.title}</h2>
                {sec.fields.map(renderField)}
              </section>
            ))}
          </div>
        )}
      </div>
      <div className={cn("sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-border py-3", surface === "panel" ? "bg-popover" : "bg-background")}>
        <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{pending ? "Saving…" : submitLabel}</Button>
        <p role="status" className={cn("text-sm", status && !status.ok ? "text-destructive" : "text-muted-foreground")}>
          {status?.text ?? (dirty ? "Unsaved changes" : "")}
        </p>
      </div>
    </form>
  );
}
