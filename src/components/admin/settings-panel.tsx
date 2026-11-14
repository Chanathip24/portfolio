"use client";

import { Database } from "lucide-react";
import { useState, useTransition } from "react";
import { setDataTools } from "@/app/admin/system-actions";
import { DashCard } from "@/components/admin/dash-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
