/** Static policy (no per-request nonce) so Cache Components can pre-render pages. Inline scripts are allowed because
 *  Next and the theme script are inline; every other directive still limits where scripts, frames and data can go. */
export function contentSecurityPolicy(admin: boolean) {
  const development = process.env.NODE_ENV === "development";
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const backend = supabase ? new URL(supabase).origin : "";
  const websocket = backend.replace(/^http/, "ws");
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' https: data: blob: ${backend}`,
    "font-src 'self' data: https://db.onlinewebfonts.com",
    `connect-src 'self' ${backend} ${websocket} https://vitals.vercel-insights.com https://va.vercel-scripts.com${development ? " ws: http://localhost:*" : ""}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'",
    `frame-ancestors ${admin ? "'none'" : "'self'"}`,
  ].join("; ");
}
