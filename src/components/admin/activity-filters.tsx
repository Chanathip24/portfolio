"use client";

import { X } from "lucide-react";
import { debounce, parseAsString, useQueryStates } from "nuqs";
import { useState, useTransition } from "react";
import { OptionSelect } from "@/components/admin/option-select";
import { SearchInput } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Option } from "@/lib/admin/fields";

const ACTIONS: Option[] = [
  { value: "all", label: "Any action" }, { value: "created", label: "Created" }, { value: "updated", label: "Updated" }, { value: "deleted", label: "Deleted" }, { value: "event", label: "Events" },
];
const PRESETS = [{ label: "Today", days: 0 }, { label: "7 days", days: 6 }, { label: "30 days", days: 29 }];
const title = (s: string) => s.replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());
const dayAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

// shallow: false re-runs the server page, which does the filtering. Changing any filter goes back to the first page.
const filters = { q: parseAsString, action: parseAsString, entity: parseAsString, actor: parseAsString, from: parseAsString, to: parseAsString };

/** Every way to narrow the activity log, kept in the address bar so a filtered view can be bookmarked or shared. */
export function ActivityFilters({ entities, actors }: { entities: string[]; actors: string[] }) {
  const [pending, start] = useTransition();
  const [f, setF] = useQueryStates({ ...filters, page: parseAsString }, { shallow: false, startTransition: start });
  // What is being typed, until the address bar catches up (null = show the address bar's value).
  const [draft, setDraft] = useState<string | null>(null);
  const set = (patch: Partial<Record<keyof typeof filters, string | null>>) => setF({ ...patch, page: null });
  const active = Object.keys(filters).some((k) => f[k as keyof typeof filters]);
  const preset = (days: number) => set({ from: dayAgo(days), to: null });
  const presetOn = (days: number) => f.from === dayAgo(days) && !f.to;
  return (
    <div role="search" aria-label="Filter activity" aria-busy={pending} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput label="Search activity" placeholder="Search what happened or who" value={draft ?? f.q ?? ""} className="sm:max-w-xs"
          onChange={(v) => { setDraft(v); setF({ q: v.trim() || null, page: null }, { limitUrlUpdates: debounce(350) }); }} />
        {/* Two columns on a phone (the person and the clear button take a full row); one flowing row on a wide screen. */}
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <OptionSelect size="sm" label="Filter by action" value={f.action ?? "all"} options={ACTIONS} className="w-full sm:w-36" onChange={(v) => set({ action: v === "all" ? null : v })} />
          <OptionSelect size="sm" label="Filter by area" value={f.entity ?? "all"} options={[{ value: "all", label: "Any area" }, ...entities.map((e) => ({ value: e, label: title(e) }))]} className="w-full sm:w-40" onChange={(v) => set({ entity: v === "all" ? null : v })} />
          <OptionSelect size="sm" label="Filter by person" value={f.actor ?? "all"} options={[{ value: "all", label: "Anyone" }, { value: "system", label: "System" }, ...actors.map((a) => ({ value: a, label: a }))]} className="col-span-2 w-full sm:col-span-1 sm:w-48" onChange={(v) => set({ actor: v === "all" ? null : v })} />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">From
            <Input type="date" aria-label="From date" className="w-full sm:w-40" value={f.from ?? ""} onChange={(e) => set({ from: e.target.value || null })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">To
            <Input type="date" aria-label="To date" className="w-full sm:w-40" value={f.to ?? ""} onChange={(e) => set({ to: e.target.value || null })} />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick range</span>
        {PRESETS.map((p) => (
          <Button key={p.label} size="sm" variant={presetOn(p.days) ? "secondary" : "outline"} aria-pressed={presetOn(p.days)} onClick={() => preset(p.days)}>{p.label}</Button>
        ))}
        {active && <Button variant="ghost" size="sm" onClick={() => { setDraft(null); setF({ q: null, action: null, entity: null, actor: null, from: null, to: null, page: null }); }}><X /> Clear filters</Button>}
      </div>
    </div>
  );
}
