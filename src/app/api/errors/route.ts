import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BOT } from "@/lib/analytics";
import { recordError } from "@/lib/errors";
import { withinLimit } from "@/lib/request-policy";
import { sameOrigin, trustedClientIp } from "@/lib/request-security";

const body = z.object({
  message: z.string().max(500),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300),
  digest: z.string().max(64).optional(),
});

/** Records an error thrown in a visitor's browser. Same-site requests only, no bots, and one address may send 20 a minute so a
 *  broken page in a loop cannot fill the table. Nothing identifying is stored. */
export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT.test(ua) || !ua || !sameOrigin(req)) return done;
  const ip = trustedClientIp(req.headers);
  if (!withinLimit(`errors:${ip || "unknown"}`, ip ? 20 : 200)) return done;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return done;
  await recordError({ source: "client", ...parsed.data });
  return done;
}
