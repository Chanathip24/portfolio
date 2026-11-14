"use client";

import { Button } from "@/components/ui/button";
import { setConsent, useConsent } from "@/lib/consent";

/** The privacy page's switch: shows whether measurement is on and lets the visitor change it at any time. */
export function ConsentControls() {
  const consent = useConsent();
  if (consent === undefined) return <div aria-hidden className="h-10" />;
  const off = consent === "declined";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="text-sm text-muted-foreground">{off ? "Measurement is off." : "Measurement is on."}</p>
      <Button variant="outline" onClick={() => setConsent(off ? "accepted" : "declined")}>{off ? "Turn on" : "Opt out"}</Button>
    </div>
  );
}
