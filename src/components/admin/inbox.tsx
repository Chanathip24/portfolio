"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, MailCheck, Mail as MailIcon, RefreshCw, Reply, ShieldAlert, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { deleteMessages, markAllRead, setRead, setStarred, syncGmail } from "@/app/admin/inbox-actions";
import { EmptyState, SearchInput } from "@/components/admin/shared";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { MessageRow } from "@/lib/admin/data";
import type { MailStatus } from "@/lib/admin/mail-connection";
import { useMedia } from "@/lib/admin/use-media";
import { formatDate, formatTime, timeAgo } from "@/lib/format";
import { cn } from "cn";

const FILTERS = [
  { id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "starred", label: "Starred" },
  { id: "contact", label: "Contact form" }, { id: "gmail", label: "Gmail" }, { id: "security", label: "Security" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];
const SOURCE: Record<MessageRow["source"], string> = { contact: "Contact form", gmail: "Gmail", system: "System" };
const who = (m: MessageRow) => m.from_name || m.from_email || (m.source === "system" ? "Site security" : "Unknown sender");

/** The inbox: a long list (windowed, so thousands of messages stay fast), a reading pane beside it on a wide screen and a side
 *  sheet on a phone. Mail is shown as plain text only. */
export function Inbox({ messages, gmail }: { messages: MessageRow[]; gmail: MailStatus }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [patch, setPatch] = useState<Record<string, Partial<MessageRow>>>({});
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<MessageRow | null>(null);
  const [pending, start] = useTransition();
  const wide = useMedia("(min-width: 1024px)");

  const all = useMemo(() => messages.filter((m) => !gone.has(m.id)).map((m) => ({ ...m, ...patch[m.id] })), [messages, patch, gone]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((m) =>
      (filter === "all" || (filter === "unread" ? !m.is_read : filter === "starred" ? m.starred : filter === "security" ? m.kind === "security" : m.source === filter)) &&
      (!needle || `${m.from_name} ${m.from_email} ${m.subject} ${m.body}`.toLowerCase().includes(needle)));
  }, [all, filter, q]);
  const unread = all.filter((m) => !m.is_read).length;
  const open = all.find((m) => m.id === openId) ?? null;

  const frame = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- the virtualizer is only read during render, never memoised
  const v = useVirtualizer({ count: rows.length, getScrollElement: () => frame.current, estimateSize: () => 88, overscan: 8 });

  const change = (id: string, p: Partial<MessageRow>) => setPatch((s) => ({ ...s, [id]: { ...s[id], ...p } }));
  const report = (r: { ok: boolean; message?: string; error?: string }) => setNote(r.ok ? (r.message ? { ok: true, text: r.message } : null) : { ok: false, text: r.error ?? "Something went wrong." });
  const show = (m: MessageRow) => {
    setOpenId(m.id);
    if (!m.is_read) { change(m.id, { is_read: true }); start(async () => report(await setRead([m.id], true))); }
  };

  const reader = open && (
    <Reader m={open} pending={pending}
      onStar={() => { change(open.id, { starred: !open.starred }); start(async () => report(await setStarred(open.id, !open.starred))); }}
      onUnread={() => { change(open.id, { is_read: false }); setOpenId(null); start(async () => report(await setRead([open.id], false))); }}
      onDelete={() => setConfirm(open)} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput label="Search messages" placeholder="Search messages" value={q} onChange={setQ} />
        <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}{f.id === "unread" && unread > 0 && <span className="tabular-nums"> {unread}</span>}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={unread === 0 || pending} onClick={() => { setPatch((s) => ({ ...s, ...Object.fromEntries(all.map((m) => [m.id, { ...s[m.id], is_read: true }])) })); start(async () => report(await markAllRead())); }}><MailCheck /> Mark all read</Button>
          <Button variant="outline" size="sm" disabled={!gmail.connected || pending} title={gmail.connected ? "Fetch the newest mail from Gmail" : "Connect Gmail first"}
            onClick={() => start(async () => report(await syncGmail()))}>{pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync Gmail</Button>
        </div>
      </div>
      {!gmail.connected && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          {gmail.expired ? "The Gmail connection ended." : "Gmail is not connected."} Contact-form messages and security notices arrive here without it.
          <Link href={gmail.clientId && gmail.hasSecret ? "/api/gmail/connect" : "/admin/settings#gmail"} prefetch={false} className="font-medium text-foreground underline underline-offset-4">{gmail.expired ? "Reconnect Gmail" : "Connect Gmail"}</Link>
        </p>
      )}
      {gmail.connected && gmail.email && <p className="text-sm text-muted-foreground">Gmail: {gmail.email}</p>}
      {note && <p role={note.ok ? "status" : "alert"} className={cn("rounded-xl px-4 py-2.5 text-sm", note.ok ? "bg-muted" : "bg-destructive/10 text-destructive")}>{note.text}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          {rows.length === 0 ? <EmptyState>{all.length === 0 ? "No messages yet. Contact-form messages and security notices show up here." : "No messages match that."}</EmptyState> : (
            <div ref={frame} className="h-[70vh] overflow-auto rounded-xl border border-border bg-card" role="list" aria-label="Messages">
              <div className="relative w-full" style={{ height: v.getTotalSize() }}>
                {v.getVirtualItems().map((item) => {
                  const m = rows[item.index];
                  return (
                    <button key={m.id} type="button" role="listitem" data-index={item.index} ref={v.measureElement} onClick={() => show(m)} aria-current={m.id === openId ? "true" : undefined}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
                      className={cn("flex flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60", m.id === openId && "bg-muted")}>
                      <span className="flex items-center gap-2 text-sm">
                        {!m.is_read && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-brand-ink" />}
                        {m.kind === "security" && <ShieldAlert aria-hidden className={cn("size-4 shrink-0", m.severity === "critical" ? "text-destructive" : "text-amber-600")} />}
                        <span className={cn("min-w-0 flex-1 truncate", !m.is_read && "font-semibold")}>{who(m)}</span>
                        {m.starred && <Star aria-label="Starred" className="size-3.5 shrink-0 fill-amber-400 text-amber-500" />}
                        <time dateTime={m.received_at} className="shrink-0 text-xs text-muted-foreground">{timeAgo(m.received_at)}</time>
                      </span>
                      <span className={cn("truncate text-sm", !m.is_read ? "text-foreground" : "text-muted-foreground")}>{m.subject || "(no subject)"}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">{m.body.replace(/\s+/g, " ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {wide ? (
          <div className="min-w-0 rounded-xl border border-border bg-card p-6">
            {reader || <p className="py-24 text-center text-sm text-muted-foreground"><MailIcon aria-hidden className="mx-auto mb-3 size-6" />Select a message to read it.</p>}
          </div>
        ) : (
          <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
            <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-lg">
              <SheetHeader><SheetTitle className="sr-only">Message</SheetTitle><SheetDescription className="sr-only">The selected message</SheetDescription></SheetHeader>
              <div className="px-4 pb-6">{reader}</div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this message?</AlertDialogTitle><AlertDialogDescription>It is removed from the inbox for good. Mail in Gmail itself is not touched.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => { const m = confirm!; setConfirm(null); setGone((s) => new Set(s).add(m.id)); setOpenId(null); start(async () => report(await deleteMessages([m.id]))); }}>Delete message</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Reader({ m, pending, onStar, onUnread, onDelete }: { m: MessageRow; pending: boolean; onStar: () => void; onUnread: () => void; onDelete: () => void }) {
  const canReply = m.source !== "system" && m.from_email;
  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{SOURCE[m.source]}</Badge>
          {m.kind === "security" && <Badge variant={m.severity === "critical" ? "destructive" : "secondary"}>{m.severity}</Badge>}
        </div>
        <h2 className="text-xl font-medium leading-snug">{m.subject || "(no subject)"}</h2>
        <p className="text-sm text-muted-foreground">
          {m.from_name && <>{m.from_name} </>}{m.from_email && <>&lt;{m.from_email}&gt; </>}· <time dateTime={m.received_at}>{formatDate(m.received_at)}, {formatTime(m.received_at)} UTC</time>
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {canReply && <Button size="sm" render={<a href={`mailto:${m.from_email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} />} nativeButton={false} role="link"><Reply /> Reply</Button>}
        <Button size="sm" variant="outline" disabled={pending} onClick={onStar}><Star className={cn(m.starred && "fill-amber-400 text-amber-500")} /> {m.starred ? "Unstar" : "Star"}</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={onUnread}><MailIcon /> Mark unread</Button>
        <Button size="sm" variant="outline" onClick={onDelete}><Trash2 /> Delete</Button>
      </div>
      {/* Plain text on purpose: mail is untrusted, so it is never rendered as HTML. */}
      <div className="max-w-prose whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body || "(empty message)"}</div>
    </article>
  );
}
