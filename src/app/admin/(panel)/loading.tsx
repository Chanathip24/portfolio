import { Skeleton } from "@/components/ui/skeleton";

/** Shown inside the admin frame while a page's data loads, so moving between sections is instant. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="mt-6 h-10 w-full max-w-md" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
