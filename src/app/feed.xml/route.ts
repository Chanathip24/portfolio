import { owner } from "@/content/site";
import { getPosts } from "@/lib/api/posts";
import { absolute, xml } from "@/lib/site";

/** An RSS 2.0 feed of the newest published posts, for feed readers. */
export async function GET() {
  const posts = (await getPosts()).slice(0, 30);
  const items = posts.map((p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(absolute(`/blog/${p.slug}`))}</link>
      <guid isPermaLink="true">${xml(absolute(`/blog/${p.slug}`))}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <category>${xml(p.categoryName)}</category>
      <description>${xml(p.excerpt)}</description>
    </item>`).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${owner.name}, blog`)}</title>
    <link>${xml(absolute("/blog"))}</link>
    <description>${xml(`Notes from ${owner.name}.`)}</description>
    <language>en</language>
    <atom:link href="${xml(absolute("/feed.xml"))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
