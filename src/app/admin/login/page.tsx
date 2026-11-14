import { Suspense } from "react";
import { LoginForm } from "@/components/admin/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const instant = false;

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl"><h1>Admin sign in</h1></CardTitle>
          <CardDescription>Step 1 of 2. You&apos;ll confirm with your authenticator app next.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}><Form searchParams={searchParams} /></Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm notice={error === "forbidden" ? "That account doesn't have admin access." : undefined} />;
}
