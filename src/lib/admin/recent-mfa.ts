import "server-only";
import { redirect } from "next/navigation";
import { requireAdmin } from "./auth";
import { createClient } from "@/lib/supabase/server";
import { hasRecentMfa } from "@/lib/request-policy";

/** Use the signed authentication-method timestamp, never token iat (refreshing a token is not MFA). */
export async function requireRecentAdmin() {
  const me = await requireAdmin();
  const { data } = await (await createClient()).auth.getClaims();
  const methods = data?.claims?.amr as { method: string; timestamp: number }[] | undefined;
  if (!hasRecentMfa(methods)) redirect("/admin/mfa?reauth=1");
  return me;
}
