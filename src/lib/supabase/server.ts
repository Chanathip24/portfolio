import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseKey, supabaseUrl } from "./env";

/** The signed-in admin's client: it carries their session cookies, so every query runs as them and RLS applies.
 *  Never use a service-role key here; nothing in this app needs one. */
export async function createClient() {
  // The auth client reads the clock while it loads the session. Next forbids that during a prefetch render, where
  // cookies() is already readable, unless the render is first marked as request-time.
  await connection();
  const store = await cookies();
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // Server Components can't set cookies; the proxy refreshes the session, so ignoring this there is fine.
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });
}
