import { type NextRequest, NextResponse } from "next/server";
import { notifySecurity } from "@/lib/admin/security";
import { createClient } from "@/lib/supabase/server";

/** Where requireAdmin sends a session that is signed in but not allowed (or whose user no longer exists). It has to be a
 *  route, not a page: only a route can clear the session cookies, and a leftover cookie would bounce the browser
 *  between /admin and /admin/login forever. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const email = (await supabase.auth.getUser()).data.user?.email;
  if (email) await notifySecurity({ subject: `${email} tried to open the admin`, email, detail: `${email} is signed in but is not an admin, and tried to open the admin. They were signed out.`, severity: "critical", escalateAt: 1 });
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/admin/login?error=forbidden", req.url));
}
