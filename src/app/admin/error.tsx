"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** An admin page that threw while rendering. The admin is never indexed or cached, so this only offers a retry and a way back. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-medium">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">This page could not load. Your changes elsewhere are safe. Try again, or go back to the overview.</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" render={<Link href="/admin" />} nativeButton={false} role="link">Overview</Button>
      </div>
      {error.digest && <p className="text-xs text-muted-foreground">Reference {error.digest}</p>}
    </main>
  );
}
