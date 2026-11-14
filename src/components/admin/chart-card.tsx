"use client";

import { ChartColumn, EyeOff } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useChartPrefs } from "@/lib/admin/chart-prefs";

/** Loads the saved choice of hidden charts once the page is on screen. Mounted once, in the admin layout. */
export function ChartPrefsHydrator() {
  useEffect(() => { void useChartPrefs.persist.rehydrate(); }, []);
  return null;
}

/** Renders its children (a whole chart card) unless the admin hid this chart. The check comes first, so a hidden chart is never drawn. */
export function ChartGate({ id, children }: { id: string; children: React.ReactNode }) {
  const hidden = useChartPrefs((s) => s.hidden.includes(id));
  return hidden ? null : <>{children}</>;
}

export function HideChartButton({ id, label }: { id: string; label: string }) {
  const hide = useChartPrefs((s) => s.hide);
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Hide ${label}`} title="Hide this chart (bring it back from the Charts menu)" onClick={() => hide(id)}><EyeOff /></Button>
  );
}

/** The menu that brings charts back (or hides them) for the page it sits on. */
export function ChartMenu({ charts }: { charts: { id: string; label: string }[] }) {
  const hidden = useChartPrefs((s) => s.hidden);
  const hide = useChartPrefs((s) => s.hide);
  const show = useChartPrefs((s) => s.show);
  const showAll = useChartPrefs((s) => s.showAll);
  const count = charts.filter((c) => hidden.includes(c.id)).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <ChartColumn /> Charts{count > 0 && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{count} hidden</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup><DropdownMenuLabel>Charts on this page</DropdownMenuLabel></DropdownMenuGroup>
        <DropdownMenuSeparator />
        {charts.map((c) => (
          <DropdownMenuCheckboxItem key={c.id} checked={!hidden.includes(c.id)} onCheckedChange={(on) => (on ? show(c.id) : hide(c.id))}>{c.label}</DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={count === 0} onClick={() => showAll(charts.map((c) => c.id))}>Show all charts</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
