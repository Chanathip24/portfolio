import { Database } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Shown instead of the data tools while the setting is off. */
export function DataToolsOff() {
  return (
    <div className="flex max-w-xl flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8">
      <Database aria-hidden className="size-5 text-muted-foreground" />
      <h2 className="font-medium">Data tools are switched off</h2>
      <p className="text-sm text-muted-foreground">Turn them on in Settings to browse the site&apos;s tables and manage uploaded images from here.</p>
      <Button variant="outline" render={<Link href="/admin/settings" />} nativeButton={false} role="link">Open settings</Button>
    </div>
  );
}
