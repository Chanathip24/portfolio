import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/admin/auth-actions";
import { EnrollForm, VerifyForm } from "@/components/admin/auth-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default function MfaPage() {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Suspense fallback={null}><Step /></Suspense>
    </main>
  );
}

async function Step() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/admin/login");
  if (data.claims.aal === "aal2") redirect("/admin");
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0]; // listFactors' `totp` holds verified factors only
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl"><h1>{factor ? "Confirm it's you" : "Set up two-step sign-in"}</h1></CardTitle>
        <CardDescription>Step 2 of 2.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {factor ? <VerifyForm factorId={factor.id} /> : <EnrollForm />}
        <form action={signOut} className="text-center"><Button type="submit" variant="link" size="sm">Use a different account</Button></form>
      </CardContent>
    </Card>
  );
}
