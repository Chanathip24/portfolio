import { createServerClient } from "@supabase/ssr";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

const PUBLIC_ADMIN = ["/admin/login", "/admin/mfa"];

/** Guards /admin. This is the fast first gate (a signed-JWT check, no database); the real authorization is
 *  requireAdmin() in the pages and actions, and Row Level Security under that. It also refreshes the session cookie. */
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!supabaseConfigured) return new NextResponse("Admin is not configured.", { status: 404 });
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims verifies the token's signature; getSession would trust whatever the cookie says.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const to = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  // The forced sign-out route must run for any session, however stale.
  if (pathname === "/admin/forbidden") return response;
  const open = PUBLIC_ADMIN.includes(pathname);
  if (!claims && !open) {
    // A bare /admin is usually the owner about to sign in; deeper addresses with no session are worth a note (one per ten minutes per address).
    if (pathname !== "/admin" && pathname !== "/admin/") {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
      event.waitUntil(import("@/lib/admin/security").then((m) => m.notifySecurity({ subject: `Admin address opened without signing in${ip ? ` from ${ip}` : ""}`, detail: `Someone with no session tried to open ${pathname}. They were sent to the sign-in page.`, severity: "info" }, ip)));
    }
    return to("/admin/login");
  }
  if (claims && claims.aal !== "aal2" && pathname !== "/admin/mfa" && pathname !== "/admin/login") return to("/admin/mfa");
  if (claims?.aal === "aal2" && open) return to("/admin");

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
