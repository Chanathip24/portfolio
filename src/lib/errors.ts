import "server-only";
import { createHash } from "node:crypto";
import { notifySecurity } from "@/lib/admin/security";
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

/** Stores one error, and tells the admin's Inbox the first time a new bug shows up (a bug already on the Errors page is not announced
 *  again; resolve it there and a return counts as new). It must never throw: a failure in the reporter cannot become another error. */
export async function recordError(report: ErrorReport) {
  if (!supabaseConfigured || !usersConfigured) return;
  try {
    const sb = authAdmin();
    const print = fingerprint(report);
    const path = cleanPath(report.path || "/");
    const message = report.message.slice(0, 500) || "Unknown error";
    const { data: seen } = await sb.from("error_events").select("id").eq("fingerprint", print).limit(1);
    const { error } = await sb.from("error_events").insert({
      source: report.source,
      fingerprint: print,
      message,
      stack: report.stack?.slice(0, 4000) ?? null,
      path: path.startsWith("/") ? path.slice(0, 300) : "/",
      digest: report.digest?.slice(0, 64) ?? null,
    });
    if (!error && !seen?.length) {
      await notifySecurity({
        subject: `New ${report.source === "server" ? "server" : "browser"} error: ${message.slice(0, 80)}`,
        detail: `${message}\n\nFirst seen on ${path}. Open Errors in the admin for the stack trace; resolve it there once it is fixed.`,
        severity: report.source === "server" ? "critical" : "warning",
        escalateAt: 25,
        unit: "Occurrences",
      });
    }
  } catch {}
}
