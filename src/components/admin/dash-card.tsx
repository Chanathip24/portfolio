import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

/** A dashboard panel: an icon chip, a title and a line under it, then the content. A single level of container: panels sit on the page,
 *  never inside each other.
 *  `action` is a small control that stays in the top-right corner (a link, an icon button). `controls` is a wider one (a period switch):
 *  beside the title when there is room, on a row of its own under it on a phone, so it never squeezes the title into a sliver. */
export function DashCard({ icon: Icon, title, description, action, controls, className, children }: {
  icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; controls?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className={cn("flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:gap-5 sm:p-5", className)}>
      <header className="flex flex-wrap items-start gap-x-3 gap-y-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-4" /></span>
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="text-sm font-medium leading-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {controls && <div className="order-last basis-full sm:order-none sm:basis-auto">{controls}</div>}
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}
