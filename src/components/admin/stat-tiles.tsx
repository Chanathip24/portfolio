import { cn } from "cn";

/** A row of headline numbers: a label, the number, and one line of context under it. */
export function StatTiles({ items, className }: { items: { label: string; value: string | number; note?: string; warn?: boolean }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {items.map((t) => (
        <div key={t.label} className="rounded-xl border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">{t.label}</dt>
          <dd className="mt-1 text-3xl font-medium tracking-tight tabular-nums">{t.value}</dd>
          {t.note && <p className={cn("mt-1 text-xs", t.warn ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>{t.note}</p>}
        </div>
      ))}
    </dl>
  );
}
