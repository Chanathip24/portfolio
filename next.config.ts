import type { NextConfig } from "next";

// Images uploaded in the admin live in the Supabase project's public Storage bucket.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const localSupabase = supabaseUrl !== null && ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname);

const nextConfig: NextConfig = {
  images: supabaseUrl
    ? {
        remotePatterns: [{ protocol: supabaseUrl.protocol === "http:" ? "http" : "https", hostname: supabaseUrl.hostname, port: supabaseUrl.port, pathname: "/storage/v1/object/public/media/**" }],
        // The optimiser refuses private addresses by default; only the local Supabase stack needs this.
        dangerouslyAllowLocalIP: localSupabase,
      }
    : undefined,
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // The site never needs these browser features, so no page (or script that slips in) can ask for them.
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }, // only acted on over HTTPS
    ];
    return [
      { source: "/:path*", headers: common },
      // The admin must never be framed (clickjacking) or cached.
      { source: "/admin/:path*", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: "frame-ancestors 'none'" }, { key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
