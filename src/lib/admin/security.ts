import "server-only";
import { headers } from "next/headers";
import { authAdmin, usersConfigured } from "@/lib/admin/users";
import { trustedClientIp } from "@/lib/request-security";

const WINDOW_MS = 10 * 60_000;

type Notice = { subject: string; email?: string; detail: string; severity?: "info" | "warning" | "critical"; escalateAt?: number };

/** The address a request came from, as reported by the proxy in front of the app ("" when unknown). */
export const clientIp = async () => trustedClientIp(await headers());

/** Writes a security notice into the admin inbox. The same subject inside ten minutes is one message whose attempt count goes up, so a
 *  burst of guesses is one line, not a flood; it turns critical at `escalateAt` attempts. Never throws: a notice must not break a sign-in.
 *  Uses the service key (the only way to write a system message), only ever on the server. */
export async function notifySecurity({ subject, email = "", detail, severity = "warning", escalateAt = 5 }: Notice) {
  if (!usersConfigured) return;
  try {
    const sb = authAdmin();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data: found } = await sb.from("messages").select("id,body").eq("kind", "security").eq("subject", subject).gte("received_at", since).limit(1);
    const text = (n: number) => `${detail}\n\nAttempts in the last 10 minutes: ${n}`;
    if (found?.length) {
      const n = (Number(/Attempts in the last 10 minutes: (\d+)/.exec(found[0].body as string)?.[1]) || 1) + 1;
      await sb.from("messages").update({ body: text(n), is_read: false, severity: n >= escalateAt ? "critical" : severity }).eq("id", found[0].id);
    } else {
      await sb.from("messages").insert({ source: "system", kind: "security", severity, from_name: "Site security", from_email: email, subject, body: text(1) });
    }
  } catch { /* never block the request */ }
}
