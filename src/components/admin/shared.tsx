import { Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

/** The search box every list uses: a magnifier inside a search input. Controlled; wrap `onChange` if it needs debouncing. */
export function SearchInput({ label, placeholder, value, onChange, className }: {
  label: string; placeholder?: string; value: string; onChange: (value: string) => void; className?: string;
}) {
  return (
    <div className={cn("relative min-w-52 flex-1 sm:max-w-xs", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" aria-label={label} placeholder={placeholder ?? label} className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** A dashed box for "nothing here": one sentence and, when there is something to do about it, a button. */
export function EmptyState({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center", className)}>
      <p className="text-sm text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}

/** A small group of links where one is current (a period, a view). Server-friendly: plain links with aria-current. */
export function SegmentedNav({ label, items, className }: { label: string; items: { href: string; label: string; active: boolean }[]; className?: string }) {
  return (
    <nav aria-label={label} className={cn("flex w-fit gap-0.5 rounded-lg bg-muted p-0.5 text-sm", className)}>
      {items.map((i) => (
        <Link key={i.label} href={i.href} aria-current={i.active ? "page" : undefined}
          className={cn("rounded-md px-3 py-1", i.active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{i.label}</Link>
      ))}
    </nav>
  );
}

/** A short ranked list: the number sits beside the name and a thin bar shows the share of the leader. A row with `href` is a link. */
export function RankList({ title, rows, empty }: { title?: string; rows: { key: string; name: string; value: number; href?: string }[]; empty: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      {title && <h3 className="mb-3 text-sm font-medium">{title}</h3>}
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ol className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                {r.href ? <Link href={r.href} className="truncate hover:underline">{r.name}</Link> : <span className="truncate">{r.name}</span>}
                <span className="tabular-nums text-muted-foreground">{r.value}</span>
              </div>
              <div aria-hidden className="mt-1 h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-brand-ink" style={{ width: `${(r.value / max) * 100}%` }} /></div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
