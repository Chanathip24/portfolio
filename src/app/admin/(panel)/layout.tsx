import { Suspense } from "react";
import { ChartPrefsHydrator } from "@/components/admin/chart-card";
import { NavProgress } from "@/components/admin/nav-progress";
import { AdminNav, MobileNav, UserMenu } from "@/components/admin/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings, unreadCount } from "@/lib/admin/data";

export const instant = false;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}><NavProgress /></Suspense>
      <Suspense fallback={<Loading />}>
        <Shell>{children}</Shell>
      </Suspense>
    </>
  );
}

/** Same frame as the real page, so nothing jumps when the session check finishes. */
function Loading() {
  return (
    <div className="min-h-svh md:grid md:grid-cols-[16rem_minmax(0,1fr)]" aria-busy="true">
      <div className="hidden border-r border-border p-4 md:flex md:flex-col md:gap-3">
        <Skeleton className="h-5 w-16" />
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-8"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-80" /><Skeleton className="mt-6 h-64 w-full" /></div>
    </div>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const [admin, settings, unread] = await Promise.all([requireAdmin(), getSettings(), unreadCount()]);
  const me = { name: admin.name, email: admin.email, avatar: admin.avatar };
  return (
    <TooltipProvider>
      <ChartPrefsHydrator />
      <div className="min-h-svh md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden flex-col gap-6 overflow-y-auto border-r border-border p-4 md:sticky md:top-0 md:flex md:h-svh">
          <p className="px-3 font-medium">Admin</p>
          <AdminNav dataTools={settings.dataToolsEnabled} unread={unread} />
          <div className="mt-auto flex items-center gap-1 border-t border-border pt-4">
            <UserMenu me={me} />
            <ThemeToggle />
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-border bg-background p-2 md:hidden">
            <MobileNav dataTools={settings.dataToolsEnabled} unread={unread} />
            <p className="flex-1 font-medium">Admin</p>
            <ThemeToggle />
            <UserMenu me={me} compact />
          </header>
          <main className="p-4 sm:px-8 sm:py-8 xl:px-12">
            <div className="mx-auto max-w-[100rem]">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
