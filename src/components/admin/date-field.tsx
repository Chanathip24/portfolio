"use client";

import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "cn";

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (v: string) => { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d); }; // a local day, not UTC midnight

/** A day as "YYYY-MM-DD" (empty = not set), picked from the Calendar in a popover. Replaces the browser's own date control.
 *  `min` and `max` are keys too, so a range's start cannot pass its end. */
export function DateField({ label, value, onChange, min, max, className }: {
  label: string; value: string; onChange: (v: string) => void; min?: string; max?: string; className?: string;
}) {
  const date = value ? parse(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" variant="outline" aria-label={date ? `${label}: ${value}` : label} className={cn("h-10 w-full justify-start gap-2 px-3 font-normal", className)} />}>
        <CalendarDays aria-hidden className="text-muted-foreground" />
        <span className={date ? "" : "text-muted-foreground"}>{date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Pick a date"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-2 p-3">
        <Calendar mode="single" selected={date} defaultMonth={date} onSelect={(d) => onChange(d ? toKey(d) : "")}
          disabled={[...(min ? [{ before: parse(min) }] : []), ...(max ? [{ after: parse(max) }] : [])]} />
        {value && <Button type="button" variant="ghost" size="sm" className="self-end" onClick={() => onChange("")}><X /> Clear</Button>}
      </PopoverContent>
    </Popover>
  );
}
