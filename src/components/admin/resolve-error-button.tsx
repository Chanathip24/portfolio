"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { resolveError } from "@/app/admin/error-actions";
import { Button } from "@/components/ui/button";

/** Clears one bug's records. If the same bug comes back it is listed again as new, with a new notice in the Inbox. */
export function ResolveErrorButton({ fingerprint }: { fingerprint: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" size="sm" variant="outline" disabled={pending}
        onClick={() => { setError(""); start(async () => { const r = await resolveError(fingerprint); if (!r.ok) setError(r.error); }); }}>
        <Check /> Resolve
      </Button>
      <span className="text-xs">{error ? <span role="alert" className="text-destructive">{error}</span> : "Clears its records. If it happens again it comes back as a new bug."}</span>
    </div>
  );
}
