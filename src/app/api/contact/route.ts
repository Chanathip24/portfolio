import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authAdmin, usersConfigured } from "@/lib/admin/users";
import { supabaseConfigured } from "@/lib/supabase/env";
import { publicClient } from "@/lib/supabase/public";

const body = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.email().max(254),
  message: z.string().trim().min(1).max(4000),
  website: z.string().max(500).optional(), // a field real visitors never see: only bots fill it
});
const json = (status: number, message: string) => NextResponse.json({ message }, { status });

/** The contact form. Stores a plain message in the admin's inbox. Same-site requests only, a hidden field catches simple bots, and one
 *  address can send at most three messages an hour (counted with the service key, which is only ever used here, on the server). */
export async function POST(req: NextRequest) {
  if (!supabaseConfigured) return json(503, "Messages are not switched on here. Write to the address in the footer instead.");
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return json(403, "Not allowed.");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(400, "Check your email address and write a message.");
  if (parsed.data.website) return new NextResponse(null, { status: 204 }); // pretend it worked

  const { name = "", email, message } = parsed.data;
  if (usersConfigured) {
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await authAdmin().from("messages").select("id", { count: "exact", head: true }).eq("source", "contact").eq("from_email", email).gte("received_at", since);
    if ((count ?? 0) >= 3) return json(429, "That is a few messages already. Give it a little while before sending another.");
  }
  const subject = message.replace(/\s+/g, " ").slice(0, 80);
  const { error } = await publicClient().from("messages").insert({ source: "contact", kind: "message", severity: "info", from_name: name, from_email: email, subject, body: message });
  if (error) return json(500, "Could not send that. Try again in a moment.");
  return NextResponse.json({ message: "Sent. Thank you, I will write back." }, { status: 201 });
}
