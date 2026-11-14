import "server-only";
import { createHash } from "node:crypto";
import { authAdmin, usersConfigured } from "@/lib/admin/users";
import { cleanPath } from "@/lib/analytics";
import { supabaseConfigured } from "@/lib/supabase/env";

export type ErrorReport = { source: "client" | "server"; message: string; stack?: string | null; path?: string; digest?: string | null };

/** Same bug, same fingerprint: numbers and ids in the message are blanked, and the first stack line is part of it. */
function fingerprint({ source, message, stack }: ErrorReport) {
  const frame = stack?.split("\n").find((l) => /^\s+at /.test(l)) ?? "";
  const text = `${source}|${message.replace(/[0-9a-f]{8,}|\d+/gi, "#")}|${frame.replace(/:\d+:\d+\)?$/, "")}`;
  return createHash("sha1").update(text).digest("hex").slice(0, 16);
}

/** Stores one error. It must never throw: a failure in the reporter cannot become another error. */
export async function recordError(report: ErrorReport) {
  if (!supabaseConfigured || !usersConfigured) return;
  try {
    const path = cleanPath(report.path || "/");
    await authAdmin().from("error_events").insert({
      source: report.source,
      fingerprint: fingerprint(report),
      message: report.message.slice(0, 500) || "Unknown error",
      stack: report.stack?.slice(0, 4000) ?? null,
      path: path.startsWith("/") ? path.slice(0, 300) : "/",
      digest: report.digest?.slice(0, 64) ?? null,
    });
  } catch {}
}
