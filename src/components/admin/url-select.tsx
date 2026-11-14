"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OptionSelect } from "@/components/admin/option-select";
import type { Option } from "@/lib/admin/fields";

/** A select whose value lives in the address bar (`?size=50`), for the pages that are rendered on the server. Changing it goes
 *  back to the first page and keeps the other parameters (which table, which sort). */
export function UrlSelect({ param, value, options, label, className }: { param: string; value: string; options: Option[]; label: string; className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <OptionSelect label={label} value={value} options={options} size="sm" className={className ?? "w-28"}
      onChange={(v) => {
        const next = new URLSearchParams(params.toString());
        if (v === "all") next.delete(param); else next.set(param, v);
        next.delete("page");
        router.push(`${path}?${next.toString()}`);
      }} />
  );
}

export const PAGE_SIZE_OPTIONS: Option[] = [10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} rows` }));
