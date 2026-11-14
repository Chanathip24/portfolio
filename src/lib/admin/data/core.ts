import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { authAdmin, usersConfigured } from "@/lib/admin/users";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TZ, isTimeZone } from "@/lib/tz";
import { requireAdmin } from "../auth";

/** One checked client per request: every helper on a page shares it instead of building its own. */
export const db = cache(async () => {
  await requireAdmin();
  return createClient();
});

/** Reads a database function for an admin through a cache, for summaries that are costly to add up and fine to be a minute old (page
 *  views, load times, errors). The admin check runs first, on every call. The cached read uses the service key, because a cache cannot
 *  see the visitor's cookies. Set ADMIN_CACHE=off to skip it (the tests do, since they write rows and read the numbers straight away). */
export async function cachedRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  await requireAdmin();
  if (!usersConfigured || process.env.ADMIN_CACHE === "off") return ((await (await createClient()).rpc(fn, args)).data ?? null) as T | null;
  return readCached<T>(fn, args);
}

async function readCached<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("admin-reports");
  return ((await authAdmin().rpc(fn, args)).data ?? null) as T | null;
}

/** The time zone the admin counts days in: the one chosen in Settings, else the site's own (owner.timeZone). Cached; saving the setting clears it. */
export const getTimeZone = cache(async (): Promise<string> => {
  const sb = await db();
  const stored = usersConfigured && process.env.ADMIN_CACHE !== "off" ? await readStoredTimeZone() : (await sb.from("app_settings").select("timezone").limit(1).maybeSingle()).data?.timezone;
  return isTimeZone(stored) ? stored : DEFAULT_TZ;
});

async function readStoredTimeZone(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("app-settings");
  return (await authAdmin().from("app_settings").select("timezone").limit(1).maybeSingle()).data?.timezone ?? null;
}

/** published, scheduled (published but its time is still ahead), draft or archived: what the admin sees at a glance. */
export type Visibility = "live" | "scheduled" | "draft" | "archived";
export const visibilityOf = (status: string, publishedAt: string, now = Date.now()): Visibility =>
  status === "published" ? (new Date(publishedAt).getTime() > now ? "scheduled" : "live") : status === "archived" ? "archived" : "draft";
