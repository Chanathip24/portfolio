"use client";

import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const pad = (n: number) => String(n).padStart(2, "0");
const show = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** A date and time in the browser's own timezone, as "YYYY-MM-DDTHH:mm" (empty means "not set"). shadcn Calendar in a
 *  popover for the day, a time field for the hour; replaces the browser's own date control. */
export function DateTimeField({ id, value, onChange, invalid, describedBy }: {
  id: string; value: string; onChange: (v: string) => void; invalid?: boolean; describedBy?: string;
}) {
  const date = value ? new Date(value) : undefined; // no zone in the string: read as local time
  const time = value ? value.slice(11, 16) : "09:00";
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const pickDay = (d?: Date) => onChange(d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}` : "");
  const pickTime = (t: string) => t && onChange(`${value ? value.slice(0, 10) : today()}T${t}`);

  return (
    <Popover>
      <PopoverTrigger
        render={<Button id={id} type="button" variant="outline" aria-invalid={invalid} aria-describedby={describedBy} className="h-10 w-full justify-start gap-2 px-3 font-normal" />}
      >
        <CalendarDays aria-hidden className="text-muted-foreground" />
        {/* Formatted in the browser's timezone, so it can differ from the server-rendered text. */}
        <span suppressHydrationWarning className={date ? "" : "text-muted-foreground"}>{date ? show.format(date) : "Pick a date and time"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-3 p-3">
        <Calendar mode="single" selected={date} onSelect={pickDay} defaultMonth={date} />
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <label htmlFor={`${id}-time`} className="text-sm text-muted-foreground">Time</label>
          <Input id={`${id}-time`} type="time" value={time} onChange={(e) => pickTime(e.target.value)} className="w-32" />
          <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => { const d = new Date(); onChange(`${today()}T${pad(d.getHours())}:${pad(d.getMinutes())}`); }}>Now</Button>
          {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}><X /> Clear</Button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
