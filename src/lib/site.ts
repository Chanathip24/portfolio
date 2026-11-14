/** Where the site lives, for addresses that must be absolute (share previews, the sitemap, the feed). Set NEXT_PUBLIC_SITE_URL in production. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** The feed link feed readers discover. A page that sets its own `alternates` replaces the layout's, so each repeats this. */
export const feedAlternate = { "application/rss+xml": [{ url: "/feed.xml", title: "Blog" }] };

/** An absolute address for a site path. */
export const absolute = (path: string) => `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

/** Text safe to put inside an XML element or attribute. */
export const xml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
