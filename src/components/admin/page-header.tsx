import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { titleCase } from "@/lib/format";
import { cn } from "cn";

export function PageHeader({ title, description, action, back }: { title: string; description?: string; action?: React.ReactNode; back?: { label: string; href: string } }) {
  return (
    <header className="mb-8 flex flex-col gap-3">
      {back && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink render={<Link href={back.href} />}>{back.label}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage className="max-w-60 truncate">{title}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-balance">{title}</h1>
          {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="max-w-full min-w-0">{action}</div>}
      </div>
    </header>
  );
}

const DOT: Record<string, string> = { live: "bg-emerald-500", published: "bg-emerald-500", scheduled: "bg-amber-500", draft: "bg-muted-foreground/50", archived: "bg-border" };

/** A coloured dot plus the word, so the state never relies on colour alone. */
export const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant="outline" className="gap-1.5 font-normal">
    <span aria-hidden className={cn("size-1.5 rounded-full", DOT[status] ?? "bg-muted-foreground")} />
    {titleCase(status)}
  </Badge>
);
