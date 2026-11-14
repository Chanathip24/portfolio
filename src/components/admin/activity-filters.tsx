"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchInput } from "@/components/admin/shared";
import { UrlSelect } from "@/components/admin/url-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Option } from "@/lib/admin/fields";

const ACTIONS: Option[] = [
  { value: "all", label: "Any action" }, { value: "created", label: "Created" }, { value: "updated", label: "Updated" }, { value: "deleted", label: "Deleted" }, { value: "event", label: "Events" },
];
const FILTER_KEYS = ["q", "action", "entity", "actor", "from", "to"];
const title = (s: string) => s.replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Every way to narrow the activity log, kept in the address bar so a filtered view can be bookmarked or shared. */
export function ActivityFilters({ entities, actors }: { entities: string[]; actors: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    router.replace(`${path}?${next.toString()}`);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const active = FILTER_KEYS.some((k) => params.get(k));
  const reset = () => {
    const next = new URLSearchParams(params.toString());
    for (const k of FILTER_KEYS) next.delete(k);
    next.delete("page");
    setText("");
    router.replace(`${path}?${next.toString()}`);
  };
  return (
    <div role="search" aria-label="Filter activity" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchInput label="Search activity" placeholder="Search what happened or who" value={text} className="sm:max-w-xs"
        onChange={(v) => { setText(v); clearTimeout(timer.current); timer.current = setTimeout(() => set("q", v.trim()), 350); }} />
      {/* Two columns on a phone (the person and the clear button take a full row); one flowing row on a wide screen. */}
      <div className="grid grid-cols-2 gap-2 sm:contents">
        <UrlSelect param="action" value={params.get("action") ?? "all"} options={ACTIONS} label="Filter by action" className="w-full sm:w-36" />
        <UrlSelect param="entity" value={params.get("entity") ?? "all"} options={[{ value: "all", label: "Any area" }, ...entities.map((e) => ({ value: e, label: title(e) }))]} label="Filter by area" className="w-full sm:w-40" />
        <UrlSelect param="actor" value={params.get("actor") ?? "all"} options={[{ value: "all", label: "Anyone" }, { value: "system", label: "System" }, ...actors.map((a) => ({ value: a, label: a }))]} label="Filter by person" className="col-span-2 w-full sm:col-span-1 sm:w-48" />
        <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">From
          <Input type="date" aria-label="From date" className="w-full sm:w-40" value={params.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">To
          <Input type="date" aria-label="To date" className="w-full sm:w-40" value={params.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} />
        </label>
        {active && <Button variant="outline" size="sm" className="col-span-2 sm:col-span-1" onClick={reset}><X /> Clear filters</Button>}
      </div>
    </div>
  );
}
