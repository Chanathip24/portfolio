import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** The placeholder shown inside the admin frame while a page's data loads. */
export function PageLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="mt-6 h-10 w-full max-w-md" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

/** Wraps the part of a page that waits for the session and database, so a click on a link shows the placeholder at once
 *  instead of waiting on the server (a page without a boundary like this must opt out with `instant = false` and then blocks). */
export function Streamed({ children, fallback = <PageLoading /> }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
