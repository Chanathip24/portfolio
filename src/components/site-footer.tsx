"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { clocks, nav, owner } from "@/content/site";
import { HatchMark } from "@/components/hatch-mark";
import { cn } from "@/lib/utils";

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const nowMinute = () => Math.floor(Date.now() / 60000);

function zoneParts(timeZone: string, ms: number) {
  const d = new Date(ms);
  const time = d.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" });
  const hour = Number(d.toLocaleString("en-GB", { timeZone, hour: "2-digit", hour12: false }));
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "shortOffset" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? "";
  return { time, offset, day: hour >= 6 && hour < 19 };
}

/** Name and socials, page links, and live clocks for the cities that matter; a large hatched mark closes the page. */
export function SiteFooter() {
  const minute = useSyncExternalStore(subscribe, nowMinute, () => null);

  return (
    <footer className="mt-40 overflow-hidden">
      <div className="page-x grid gap-10 border-t border-border pt-12 md:grid-cols-[1.5fr_0.6fr_1fr]">
        <div>
          <p className="font-display text-[clamp(2.5rem,5vw,4rem)] italic leading-[0.95] tracking-[-0.02em]">{owner.name}</p>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {owner.socials.map((s) => (
              <li key={s.label}><a href={s.href} className="no-underline transition-opacity duration-100 ease-out hover:opacity-40">{s.label}</a></li>
            ))}
            <li><a href={`mailto:${owner.email}`} className="no-underline transition-opacity duration-100 ease-out hover:opacity-40">{owner.email}</a></li>
          </ul>
        </div>

        <nav aria-label="Footer">
          <ul className="space-y-1.5 text-sm">
            {nav.map((l) => (
              <li key={l.href}><a href={l.href} className="no-underline transition-opacity duration-100 ease-out hover:opacity-40">{l.label}</a></li>
            ))}
          </ul>
        </nav>

        <ul className="space-y-1.5 text-sm" aria-label="Local times">
          {clocks.map((c, i) => {
            const z = minute === null ? null : zoneParts(c.timeZone, minute * 60000);
            const Icon = z?.day ? Sun : Moon;
            return (
              <li key={c.city} className={cn("grid grid-cols-[1rem_1fr_auto_auto] items-center gap-3 tabular-nums", i === 0 ? "font-medium" : "font-medium opacity-45")}>
                <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
                <span>{c.city}</span>
                <span>{z?.time ?? "--:--"}</span>
                <span className="w-14 text-right text-xs">{z?.offset ?? ""}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Closing mark: the initial in hatching that drifts and bends away from the pointer. */}
      <HatchMark glyph={owner.firstName[0]} className="mt-10 h-[26vw] max-h-[30rem] w-full" />
      <p className="page-x pb-6 text-xs text-muted-foreground">Sample content · built with Next.js</p>
    </footer>
  );
}
