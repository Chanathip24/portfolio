"use client";

import Link from "next/link";

/** A page that threw while rendering. `reset` tries the same page again. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-x flex min-h-svh flex-1 flex-col justify-center py-24">
      <p className="text-sm text-muted-foreground">Something went wrong</p>
      <h1 className="mt-2 text-[clamp(2.25rem,5vw,3.75rem)] font-medium leading-[0.95] tracking-[-0.03em]">This page did not load</h1>
      <p className="mt-4 max-w-[40ch] text-lg text-muted-foreground">It is not you. Try again, and if it keeps happening, come back in a little while.</p>
      <p className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        <button type="button" onClick={reset} className="rounded-full bg-foreground px-5 py-2.5 text-sm text-background">Try again</button>
        <Link href="/" className="underline underline-offset-4">Home</Link>
      </p>
      {error.digest && <p className="mt-10 text-xs text-muted-foreground">Reference {error.digest}</p>}
    </main>
  );
}
