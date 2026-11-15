import { timingSafeEqual } from "node:crypto";
import { connection, NextResponse, type NextRequest } from "next/server";
import { authAdmin, usersConfigured } from "@/lib/admin/users";

/** Deletes old measurements (the cleanup_old_data function: page views and load times after 180 days, errors after 90, sign-in attempts
 *  after 7). Vercel Cron calls it daily with `Authorization: Bearer $CRON_SECRET` (see vercel.json). Without CRON_SECRET set the route
 *  does not exist (404), and a wrong secret gets 401, so nobody else can trigger it. Content, messages and history are never touched. */
export async function GET(req: NextRequest) {
  await connection(); // always run per request: without this the 404 for "no secret at build time" would be baked into the build
  const secret = process.env.CRON_SECRET;
  if (!secret || !usersConfigured) return new NextResponse(null, { status: 404 });
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new NextResponse(null, { status: 401 });
  const { data, error } = await authAdmin().rpc("cleanup_old_data");
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: data });
}
