import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Who may do anything in the admin: a signed-in user, who passed MFA (aal2), and is on the `admins` list.
 *  Call it at the top of every admin page and every Server Action; the proxy is only a first gate. */
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/admin/login");
  if (claims.aal !== "aal2") redirect("/admin/mfa");
  const { data: ok } = await supabase.rpc("is_admin");
  if (ok !== true) redirect("/admin/forbidden"); // clears the session, then lands on the sign-in page
  const meta = (claims.user_metadata ?? {}) as { full_name?: unknown; avatar_url?: unknown };
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    name: typeof meta.full_name === "string" ? meta.full_name : "",
    avatar: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
});
