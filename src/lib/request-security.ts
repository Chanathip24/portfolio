import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { readTrustedIp } from "./request-policy";

const processSecret = randomBytes(32).toString("hex");

/** Only use headers overwritten by the deployment's trusted ingress. Never trust arbitrary X-Forwarded-For. */
export function trustedClientIp(headers: Pick<Headers, "get">): string {
  const header = process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : process.env.TRUSTED_PROXY_IP_HEADER;
  return readTrustedIp(headers, header);
}

export function privateKey(value: string): string {
  const secret = process.env.ANALYTICS_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || processSecret;
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
