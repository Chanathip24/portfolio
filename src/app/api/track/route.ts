import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BOT, KNOWN_PATH, cleanPath } from "@/lib/analytics";
import { supabaseConfigured } from "@/lib/supabase/env";
import { publicClient } from "@/lib/supabase/public";

const body = z.object({ path: z.string().max(300), referrer: z.string().max(500).optional() });

/** Records a page view. The visitor id is a hash of IP + browser + the date + a secret salt, so it counts
 *  unique visitors for one day and can't be reversed or followed across days. Nothing identifying is stored. */
export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (!supabaseConfigured) return done;
  const ua = req.headers.get("user-agent") ?? "";
  const origin = req.headers.get("origin");
  if (BOT.test(ua) || !ua || (origin && new URL(origin).host !== req.headers.get("host"))) return done;
  // The admin browsing their own site shouldn't count.
  if (req.cookies.getAll().some((c) => /^sb-.*-auth-token/.test(c.name))) return done;

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return done;
  const path = cleanPath(parsed.data.path);
  if (!KNOWN_PATH.test(path)) return done;

  let referrer: string | null = null;
  try {
    const r = new URL(parsed.data.referrer || "");
    if (r.host !== req.headers.get("host") && /^https?:$/.test(r.protocol)) referrer = r.hostname.replace(/^www\./, "");
  } catch {}

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHash("sha256").update(`${process.env.ANALYTICS_SALT ?? "dev-salt"}:${day}:${ip}:${ua}`).digest("hex").slice(0, 32);
  await publicClient().from("page_views").insert({ path, referrer, visitor });
  return done;
}
