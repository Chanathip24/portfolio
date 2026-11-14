"use client";

import { Loader2, LogOut, Plus, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import {
  addMyFactor, changeMyPassword, confirmMyFactor, removeMyFactor, signOutOtherDevices, updateMyProfile, type Enrollment, type Result,
} from "@/app/admin/account-actions";
import { DashCard } from "@/components/admin/dash-card";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/admin/upload";
import { formatDate } from "@/lib/format";
import { UserRound, KeyRound } from "lucide-react";

const Feedback = ({ r }: { r: Result | null }) =>
  r ? <p role={r.ok ? "status" : "alert"} className={r.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{r.ok ? (r.message ?? "Done.") : r.error}</p> : null;

/** The profile component: picture and name. Shown in the account menu, the activity feed and the users list. */
export function ProfilePanel({ name, email, avatar }: { name: string; email: string; avatar: string | null }) {
  const [n, setN] = useState(name);
  const [a, setA] = useState(avatar ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const upload = async (f: File) => {
    setBusy(true);
    try { setA(await uploadImage(f)); setResult(null); } catch (e) { setResult({ ok: false, error: e instanceof Error ? e.message : "Upload failed." }); }
    setBusy(false);
  };
  return (
    <DashCard icon={UserRound} title="Your profile" description="Your name and picture, shown to the other admins.">
      <form noValidate className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); start(async () => setResult(await updateMyProfile({ name: n, avatar: a }))); }}>
        <div className="flex items-center gap-4">
          <UserAvatar name={n} email={email} src={a || null} className="size-16 text-lg" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => file.current?.click()}>{busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload picture</Button>
            {a && <Button type="button" variant="ghost" size="sm" onClick={() => setA("")}>Remove</Button>}
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5"><Label htmlFor="acc-name">Name</Label><Input id="acc-name" value={n} onChange={(e) => setN(e.target.value)} placeholder="Your name" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="acc-email">Email</Label><Input id="acc-email" value={email} readOnly disabled /></div>
        </div>
        <div className="flex items-center gap-3"><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Save profile</Button><Feedback r={result} /></div>
      </form>
    </DashCard>
  );
}

export function PasswordPanel() {
  const [pw, setPw] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  return (
    <DashCard icon={KeyRound} title="Password" description="At least 12 characters with upper and lower case, a digit and a symbol.">
      <form noValidate className="flex flex-col gap-4 sm:max-w-sm" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await changeMyPassword(pw); setResult(r); if (r.ok) setPw(""); }); }}>
        <div className="flex flex-col gap-1.5"><Label htmlFor="acc-pw">New password</Label><Input id="acc-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="A new password" /></div>
        <div className="flex items-center gap-3"><Button type="submit" disabled={pending || !pw}>{pending && <Loader2 className="animate-spin" />} Change password</Button><Feedback r={result} /></div>
      </form>
    </DashCard>
  );
}

export function SecurityPanel({ factors }: { factors: { id: string; name: string; created_at: string }[] }) {
  const [result, setResult] = useState<Result | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  return (
    <DashCard icon={ShieldCheck} title="Two-step sign-in" description="The authenticator apps that can approve your sign-in. Keep at least one, ideally two on different devices.">
      <ul className="flex flex-col divide-y divide-border">
        {factors.map((f) => (
          <li key={f.id} className="flex items-center gap-3 py-3 first:pt-0">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{f.name}</p><p className="text-xs text-muted-foreground">Added {formatDate(f.created_at)}</p></div>
            <Button variant="ghost" size="sm" aria-label={`Remove ${f.name}`} disabled={pending} onClick={() => start(async () => setResult(await removeMyFactor(f.id)))}><Trash2 /> Remove</Button>
          </li>
        ))}
      </ul>

      {enrollment && "factorId" in enrollment ? (
        <form noValidate className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:max-w-sm" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await confirmMyFactor(enrollment.factorId, code); setResult(r); if (r.ok) { setEnrollment(null); setCode(""); } }); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qr} alt="QR code to add this account to another authenticator app" className="size-40 self-center bg-white p-2" />
          <code className="select-all break-all rounded bg-muted px-2 py-1 text-center text-xs">{enrollment.secret}</code>
          <Label htmlFor="acc-code">6-digit code</Label>
          <Input id="acc-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
          <div className="flex gap-2"><Button type="submit" disabled={pending || code.length !== 6}>{pending && <Loader2 className="animate-spin" />} Verify and add</Button><Button type="button" variant="ghost" onClick={() => setEnrollment(null)}>Cancel</Button></div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending} onClick={() => start(async () => { const e = await addMyFactor(); if ("error" in e) setResult({ ok: false, error: e.error }); else { setEnrollment(e); setResult(null); } })}><Plus /> Add another authenticator</Button>
          <Button variant="outline" disabled={pending} onClick={() => start(async () => setResult(await signOutOtherDevices()))}><LogOut /> Sign out other devices</Button>
        </div>
      )}
      <Feedback r={result} />
    </DashCard>
  );
}
