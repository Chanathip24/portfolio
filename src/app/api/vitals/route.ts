import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BOT, KNOWN_PATH, cleanPath } from "@/lib/analytics";
import { supabaseConfigured } from "@/lib/supabase/env";
import { authAdmin, usersConfigured } from "@/lib/admin/users";
import { withinLimit } from "@/lib/request-policy";
import { sameOrigin, trustedClientIp } from "@/lib/request-security";

const body = z.object({
  metric: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
  value: z.number().finite().min(0).max(600_000),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  path: z.string().max(300),
  device: z.enum(["mobile", "desktop"]),
});

/** Records one Core Web Vital measured in a real visitor's browser: which metric, how long, which page, phone or desktop. Nothing
 *  identifying is stored (no IP, no id). Same rules as page views: public routes only, no bots, same site only, never the admin. */
export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (!supabaseConfigured || !usersConfigured) return done;
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT.test(ua) || !ua || !sameOrigin(req)) return done;
  if (req.cookies.getAll().some((c) => /^sb-.*-auth-token/.test(c.name))) return done;
  // One address may send 120 measurements a minute (a page load reports about six). With no trusted address everyone shares one bucket, so it is ten times larger.
  const ip = trustedClientIp(req.headers);
  if (!withinLimit(`vitals:${ip || "unknown"}`, ip ? 120 : 1200)) return done;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return done;
  const path = cleanPath(parsed.data.path);
  if (!KNOWN_PATH.test(path)) return done;
  await authAdmin().from("web_vitals").insert({ ...parsed.data, path });
  return done;
}
