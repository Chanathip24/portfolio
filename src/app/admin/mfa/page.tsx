import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/admin/auth-actions";
import { EnrollForm, VerifyForm } from "@/components/admin/auth-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default function MfaPage({ searchParams }: PageProps<"/admin/mfa">) {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Suspense fallback={null}><Step searchParams={searchParams} /></Suspense>
    </main>
  );
}

async function Step({ searchParams }: Pick<PageProps<"/admin/mfa">, "searchParams">) {
  const reauth = (await searchParams).reauth === "1";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/admin/login");
  if (data.claims.aal === "aal2" && !reauth) redirect("/admin");
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0]; // listFactors' `totp` holds verified factors only
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl"><h1>{factor ? "Confirm it's you" : "Set up two-step sign-in"}</h1></CardTitle>
        <CardDescription>{reauth ? "Enter a fresh code before changing security settings. Then repeat the action." : "Step 2 of 2."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {factor ? <VerifyForm factorId={factor.id} /> : <EnrollForm />}
        <form action={signOut} className="text-center"><Button type="submit" variant="link" size="sm">Use a different account</Button></form>
      </CardContent>
    </Card>
  );
}
