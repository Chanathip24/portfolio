import { trackingAllowed } from "@/lib/consent";

const sent = new Set<string>();

/** Sends an error from the browser to /api/errors (once per distinct error per page load), unless the visitor opted out. */
export function reportError(error: unknown, digest?: string) {
  const e = error as { message?: string; stack?: string; digest?: string } | null;
  const message = String(e?.message ?? error ?? "Unknown error");
  const key = `${location.pathname}|${message}`;
  if (sent.has(key) || sent.size > 20 || !trackingAllowed()) return;
  sent.add(key);
  const body = JSON.stringify({ message: message.slice(0, 500), stack: e?.stack?.slice(0, 4000), path: location.pathname, digest: digest ?? e?.digest });
  navigator.sendBeacon("/api/errors", new Blob([body], { type: "application/json" }));
}
