"use client";

import { Check, Copy, ExternalLink, Loader2, Mail, Plug, Unplug } from "lucide-react";
import { useState, useTransition } from "react";
import { disconnectGmail, saveMailClient } from "@/app/admin/inbox-actions";
import { DashCard } from "@/components/admin/dash-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MailStatus } from "@/lib/admin/mail-connection";

const FLASH: Record<string, { ok: boolean; text: string }> = {
  failed: { ok: false, text: "Google did not finish connecting. Check the redirect address and that you are a test user, then try again." },
  setup: { ok: false, text: "Save the client ID and secret first, then press Connect Gmail." },
};

/** Connecting the inbox to Gmail. Create an OAuth client once in Google Cloud, paste its ID and secret here, then press Connect Gmail:
 *  Google asks for read-only access and the site keeps the (encrypted) refresh token. Nothing goes in the server's environment. */
export function MailSettings({ status, redirectUri, flash }: { status: MailStatus; redirectUri: string; flash?: string }) {
  const [clientId, setClientId] = useState(status.clientId);
  const [secret, setSecret] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(flash ? FLASH[flash] ?? null : null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const ready = Boolean(status.clientId && status.hasSecret);

  const copy = async () => { try { await navigator.clipboard.writeText(redirectUri); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the address is selectable text too */ } };
  const save = (e: React.FormEvent) => {
    e.preventDefault(); setNote(null);
    start(async () => { const r = await saveMailClient({ clientId, clientSecret: secret }); if (r.ok) setSecret(""); setNote(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error }); });
  };

  return (
    <DashCard icon={Mail} title="Gmail" description="Read your Gmail in the Inbox. The site can only read: it never sends, changes or deletes mail."
      action={status.connected ? <Badge variant="secondary">Connected</Badge> : status.expired ? <Badge variant="destructive">Needs reconnecting</Badge> : undefined}>
      <div id="gmail" className="flex flex-col gap-6">
        {!status.available && <p className="rounded-xl bg-muted px-4 py-2.5 text-sm">This needs the project&apos;s service key on the server, which stores the encrypted connection.</p>}
        {status.connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">Connected as <span className="font-medium">{status.email || "your Gmail account"}</span>.</p>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => { setNote(null); start(async () => { const r = await disconnectGmail(); setNote(r.ok ? { ok: true, text: r.message ?? "Disconnected." } : { ok: false, text: r.error }); }); }}><Unplug /> Disconnect</Button>
          </div>
        ) : (
          <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
            <li><span className="font-medium text-foreground">1.</span> In <a className="underline underline-offset-4" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud <ExternalLink aria-hidden className="inline size-3" /></a>, turn on the Gmail API, make an <em>OAuth client ID</em> of type <em>Web application</em>, and add yourself as a test user on the consent screen.</li>
            <li className="flex flex-wrap items-center gap-2"><span><span className="font-medium text-foreground">2.</span> Add this as its authorised redirect address:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{redirectUri}</code>
              <Button type="button" variant="ghost" size="sm" onClick={copy}>{copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}</Button></li>
            <li><span className="font-medium text-foreground">3.</span> Paste the client ID and secret below, save, then press Connect Gmail.</li>
          </ol>
        )}

        <form onSubmit={save} className="grid max-w-xl gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-id">Client ID</Label>
            <Input id="g-id" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="123456-abc.apps.googleusercontent.com" autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-secret">Client secret</Label>
            <Input id="g-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={status.hasSecret ? "Saved. Type a new one to replace it" : "GOCSPX-…"} autoComplete="off" />
            <p className="text-xs text-muted-foreground">Stored encrypted. It is never shown again or sent to the browser.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Save</Button>
            {ready && !status.connected && <Button render={<a href="/api/gmail/connect" />} nativeButton={false} role="link"><Plug /> {status.expired ? "Reconnect Gmail" : "Connect Gmail"}</Button>}
          </div>
        </form>
        {note && <p role={note.ok ? "status" : "alert"} className={note.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{note.text}</p>}
        {status.expired && <p className="text-sm text-muted-foreground">Google ended the connection. While the Google app is in Testing mode it does that after a week; press Reconnect Gmail.</p>}
      </div>
    </DashCard>
  );
}
