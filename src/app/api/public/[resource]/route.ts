import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { dataSource } from "@/lib/api/client";
import { publicData } from "@/lib/api/public";
import { publicResources } from "@/lib/api/queries";
import { withRequestLog } from "@/lib/request-log";
import { withinLimit } from "@/lib/request-policy";
import { sameOrigin, trustedClientIp } from "@/lib/request-security";

const resource = z.enum(publicResources);
const json = (status: number, message: string) => NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

/** The public reads TanStack Query refreshes in the browser (see lib/api/queries.ts), from the same cached getters the pages use.
 *  Same-site only, and one address may read 120 times a minute, counted per server instance (a visitor needs a handful; with no trusted
 *  address everyone shares one bucket). A 200 is cached at the CDN for a minute, so repeat reads mostly never reach this code. */
export const GET = withRequestLog(async (req: NextRequest, ctx: RouteContext<"/api/public/[resource]">) => {
  if (!sameOrigin(req)) return json(403, "Not allowed.");
  const parsed = resource.safeParse((await ctx.params).resource);
  if (!parsed.success) return json(404, "Not found.");
  const ip = trustedClientIp(req.headers);
  if (!withinLimit(`public:${ip || "unknown"}`, ip ? 120 : 1200)) return json(429, "Too many requests. Try again in a minute.");
  return NextResponse.json(await publicData[parsed.data](), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}, { source: dataSource });
