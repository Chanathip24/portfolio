"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Option } from "@/lib/admin/fields";

/** shadcn Select over a list of {value, label}. `items` lets the trigger show the label of the chosen value. */
export function OptionSelect({ id, value, onChange, options, invalid, describedBy, size, className, label }: {
  id?: string; value: string; onChange: (v: string) => void; options: Option[]; invalid?: boolean; describedBy?: string;
  size?: "sm" | "default"; className?: string; label?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)} items={options}>
      <SelectTrigger id={id} size={size} aria-invalid={invalid} aria-describedby={describedBy} aria-label={label} className={className ?? "w-full"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
