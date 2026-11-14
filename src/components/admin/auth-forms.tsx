"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { type Enrollment, type FormState, enrollTotp, signIn, verifyTotp } from "@/app/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { REGEXP_ONLY_DIGITS } from "input-otp";

const idle: FormState = {};

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signIn, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      {notice && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{notice}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" defaultValue={state.email} required autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <p role="alert" className="min-h-5 text-sm text-destructive">{state.error}</p>
      <Button type="submit" size="lg" disabled={pending}>{pending && <Loader2 className="animate-spin" />}Continue</Button>
    </form>
  );
}

/** The 6-digit code field, shared by sign-in and the end of setup. */
function CodeForm({ factorId, label }: { factorId: string; label: string }) {
  // A wrong code is cleared (the field remounts) so the next one starts from an empty box.
  const [attempt, setAttempt] = useState(0);
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => { const r = await verifyTotp(prev, fd); setAttempt((n) => n + 1); return r; }, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="factorId" value={factorId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">{label}</Label>
        <InputOTP key={attempt} id="code" name="code" maxLength={6} pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" autoComplete="one-time-code" autoFocus required containerClassName="justify-center">
          <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="size-11 text-lg" />)}</InputOTPGroup>
        </InputOTP>
      </div>
      <p role="alert" className="min-h-5 text-sm text-destructive">{state.error}</p>
      <Button type="submit" size="lg" disabled={pending}>{pending && <Loader2 className="animate-spin" />}Verify and sign in</Button>
    </form>
  );
}

export const VerifyForm = ({ factorId }: { factorId: string }) => <CodeForm factorId={factorId} label="Code from your authenticator app" />;

/** First sign-in only: show the QR code, then ask for the first code to prove it was scanned. */
export function EnrollForm() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [pending, start] = useTransition();
  if (enrollment && "factorId" in enrollment) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qr} alt="QR code to add this account to your authenticator app" className="size-44 bg-white p-2" />
          <p className="text-center text-xs text-muted-foreground">Can&apos;t scan? Enter this key instead:</p>
          <code className="select-all break-all rounded bg-muted px-2 py-1 text-center text-xs">{enrollment.secret}</code>
        </div>
        <CodeForm factorId={enrollment.factorId} label="Enter the 6-digit code it shows" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Admin access needs a second step. Add this site to an authenticator app (1Password, Authy, Google Authenticator, …); you&apos;ll enter a code from it each time you sign in.</p>
      {enrollment && "error" in enrollment && <p role="alert" className="text-sm text-destructive">{enrollment.error}</p>}
      <Button size="lg" disabled={pending} onClick={() => start(async () => setEnrollment(await enrollTotp()))}>{pending && <Loader2 className="animate-spin" />}Set up authenticator</Button>
    </div>
  );
}
