"use client";

import { Check, Copy, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteMedia } from "@/app/admin/system-actions";
import { Tip } from "@/components/admin/tip";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/admin/upload";
import type { MediaFile } from "@/lib/admin/data";
import { formatDate } from "@/lib/format";

const size = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Everything uploaded to the public media bucket: upload, copy the address, delete. */
export function MediaLibrary({ files }: { files: MediaFile[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const [removing, setRemoving] = useState<MediaFile | null>(null);
  const [pending, start] = useTransition();

  const upload = async (list: File[]) => {
    setBusy(true); setMessage("");
    try { for (const f of list) await uploadImage(f); router.refresh(); setMessage(`Uploaded ${list.length} ${list.length === 1 ? "image" : "images"}.`); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed."); }
    setBusy(false);
  };
  const remove = () => start(async () => {
    if (!removing) return;
    const r = await deleteMedia(removing.path);
    setMessage(r.ok ? "Deleted." : r.error);
    if (r.ok) { setRemoving(null); router.refresh(); }
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy} onClick={() => input.current?.click()}>{busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} Upload images</Button>
        <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} aria-hidden aria-label="Choose images"
          onChange={(e) => { const list = Array.from(e.target.files ?? []); e.target.value = ""; if (list.length) void upload(list); }} />
        <p role="status" className="text-sm text-muted-foreground">{message || `${files.length} ${files.length === 1 ? "file" : "files"}. PNG, JPG, WebP, GIF or AVIF, up to 5 MB each.`}</p>
      </div>

      {files.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No uploads yet. Images you add to posts, projects, tools and your profile show up here.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {files.map((f) => (
            <li key={f.path} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-square bg-muted">
                {/* A plain img: these are already-uploaded files shown as thumbnails. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" loading="lazy" className="size-full object-cover" />
              </div>
              <div className="flex items-center gap-1 p-2 pl-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" title={f.path}>{f.path.split("/").pop()}</p>
                  <p className="text-xs text-muted-foreground">{size(f.size)}{f.created_at ? ` · ${formatDate(f.created_at)}` : ""}</p>
                </div>
                <Tip label={copied === f.path ? "Copied" : "Copy address"}>
                  <Button variant="ghost" size="icon-sm" aria-label={`Copy address of ${f.path.split("/").pop()}`} onClick={() => { void navigator.clipboard?.writeText(f.url); setCopied(f.path); setTimeout(() => setCopied(""), 1500); }}>{copied === f.path ? <Check /> : <Copy />}</Button>
                </Tip>
                <Tip label="Delete"><Button variant="ghost" size="icon-sm" aria-label={`Delete ${f.path.split("/").pop()}`} onClick={() => setRemoving(f)}><Trash2 /></Button></Tip>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this image?</AlertDialogTitle><AlertDialogDescription>Anything still using it will show a gap. This can&apos;t be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <Button variant="destructive" disabled={pending} onClick={remove}>{pending && <Loader2 className="animate-spin" />} Delete</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
