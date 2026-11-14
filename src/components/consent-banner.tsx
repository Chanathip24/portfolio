"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setConsent, useConsent } from "@/lib/consent";

/** Tells the visitor once that anonymous, cookieless measurement is on and lets them opt out. Opting out (or Do Not Track) stops every
 *  measurement, including Vercel analytics; the site works the same. Anything that sets cookies would need a real opt-in here. */
export function ConsentBanner() {
  const consent = useConsent();
  const path = usePathname();
  return (
    <>
      {(consent === null || consent === "accepted") && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
      {consent === null && !path.startsWith("/admin") && (
        <section aria-label="Privacy notice" className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-border bg-background p-4 text-sm shadow-lg sm:flex-row sm:items-center sm:gap-4">
          <p className="flex-1 text-muted-foreground">
            I count visits and note how fast pages load, to improve the site. No cookies, no ads, nothing that identifies you.{" "}
            <Link href="/privacy" className="text-foreground underline underline-offset-4">Details</Link>
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => setConsent("declined")}>Opt out</Button>
            <Button onClick={() => setConsent("accepted")}>OK</Button>
          </div>
        </section>
      )}
    </>
  );
}
