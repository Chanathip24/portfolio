"use client";

import { Clock, Database, Palette } from "lucide-react";
import { useState, useTransition } from "react";
import { setDataTools, setTimeZone } from "@/app/admin/system-actions";
import { DashCard } from "@/components/admin/dash-card";
import { OptionSelect } from "@/components/admin/option-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Option } from "@/lib/admin/fields";

/** App settings. One for now: whether the in-app data tools (table browser, media library) are available. */
export function SettingsPanel({ dataTools }: { dataTools: boolean }) {
  const [on, setOn] = useState(dataTools);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const change = (next: boolean) => {
    setOn(next); setMessage("");
    start(async () => {
      const r = await setDataTools(next);
      if (!r.ok) { setOn(!next); setMessage(r.error); } else setMessage(next ? "Data and Media are on." : "Data and Media are off.");
    });
  };
  return (
    <DashCard icon={Database} title="Data tools" description="A read-only look at the site's tables and a library of the images you uploaded, without leaving the admin.">
      <div className="flex items-start gap-4">
        <Switch id="data-tools" checked={on} disabled={pending} onCheckedChange={change} aria-describedby="data-tools-hint" />
        <div className="flex flex-col gap-1">
          <Label htmlFor="data-tools">Show Data and Media in the menu</Label>
          <p id="data-tools-hint" className="max-w-prose text-sm text-muted-foreground">
            Off by default. The table browser only reads (nothing can be changed or deleted from it) and never shows sign-in data. The media library lets you copy, upload and delete images.
          </p>
          <p role="status" className="min-h-5 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </DashCard>
  );
}

/** The time zone the admin's day charts and date filters count in. `options` starts with "default" (the site's own zone). */
export function TimeZoneSettings({ value, options }: { value: string; options: Option[] }) {
  const [zone, setZone] = useState(value);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const change = (next: string) => {
    const before = zone;
    setZone(next); setMessage("");
    start(async () => {
      const r = await setTimeZone(next);
      if (!r.ok) { setZone(before); setMessage(r.error); } else setMessage("Time zone saved.");
    });
  };
  return (
    <DashCard icon={Clock} title="Time zone" description="Which day a visit, a change or an error belongs to in the charts and the date filters.">
      <div className="flex flex-col gap-2">
        <Label htmlFor="time-zone">Count days in</Label>
        <div className={pending ? "opacity-60" : ""}><OptionSelect id="time-zone" label="Time zone" value={zone} options={options} onChange={change} /></div>
        <p className="max-w-prose text-sm text-muted-foreground">A visit at 01:30 in Bangkok is still the day before in UTC. Pick the zone you read the charts in. Nothing stored changes; only which day each bar covers.</p>
        <p role="status" className="min-h-5 text-sm text-muted-foreground">{message}</p>
      </div>
    </DashCard>
  );
}

/** Light or dark. It lives here, not in the menu, and applies to the whole site (the choice is kept in this browser). */
export function AppearanceSettings() {
  return (
    <DashCard icon={Palette} title="Appearance" description="Light or dark. Kept in this browser, for the admin and the public site.">
      <div className="flex items-center justify-between gap-4">
        <Label>Colour mode</Label>
        <ThemeToggle />
      </div>
    </DashCard>
  );
}
