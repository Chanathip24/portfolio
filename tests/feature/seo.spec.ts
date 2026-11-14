import { expect, test } from "@playwright/test";

// What search engines, feed readers and chat apps see: robots, sitemap, feed, per-page metadata, share images and the 404 page.
test.describe("search and sharing", () => {
  test("robots.txt keeps crawlers out of the admin and the API, and points at the sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("Disallow: /admin");
    expect(text).toContain("Disallow: /api/");
    expect(text).toMatch(/Sitemap: http.*\/sitemap\.xml/);
  });

  test("the sitemap lists the public pages and published posts, never the admin", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const path of ["/about", "/blog", "/blog/sync-without-fear", "/work/tidewater"]) expect(xml).toContain(`${path}</loc>`);
    expect(xml).not.toContain("/admin");
  });

  test("the RSS feed is well formed and lists a post with its address and date", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/rss+xml");
    const xml = await res.text();
    expect(xml).toMatch(/^<\?xml/);
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toMatch(/<link>http[^<]*\/blog\/sync-without-fear<\/link>/);
    expect(xml).toMatch(/<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/);
    expect((xml.match(/<item>/g) ?? []).length).toBe((xml.match(/<\/item>/g) ?? []).length);
  });

  test("a post has its own title, description, canonical address and share preview", async ({ request }) => {
    const html = await (await request.get("/blog/sync-without-fear")).text();
    expect(html).toMatch(/<title>[^<]*Sync[^<]*<\/title>/i);
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
    expect(html).toMatch(/<link rel="canonical" href="http[^"]*\/blog\/sync-without-fear"/);
    expect(html).toMatch(/<meta property="og:type" content="article"/);
    expect(html).toMatch(/<meta property="og:image" content="http[^"]*opengraph-image[^"]*"/);
    expect(html).toMatch(/<meta property="og:image:alt" content="[^"]*Sync[^"]*"/i); // described by the post's own title
    expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image"/);
    expect(html).toMatch(/<link rel="alternate" type="application\/rss\+xml"/);
  });

  test("a project has its own title and canonical address", async ({ request }) => {
    const html = await (await request.get("/work/tidewater")).text();
    expect(html).toMatch(/<title>[^<]*<\/title>/);
    expect(html).toMatch(/<link rel="canonical" href="http[^"]*\/work\/tidewater"/);
    expect(html).toMatch(/<meta property="og:image"/);
  });

  test("the share images are PNGs", async ({ request }) => {
    const html = await (await request.get("/blog/sync-without-fear")).text();
    const src = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
    expect(src).toBeTruthy();
    const img = await request.get(new URL(src!).pathname + new URL(src!).search);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toBe("image/png");
    expect((await img.body()).length).toBeGreaterThan(2000);
    expect((await request.get("/opengraph-image")).headers()["content-type"]).toBe("image/png");
  });

  test("a missing page answers 404 with the site's own page, and a missing post or project shows it too, marked noindex", async ({ request }) => {
    const gone = await request.get("/nowhere-at-all");
    expect(gone.status()).toBe(404);
    expect(await gone.text()).toContain("Page not found");
    // A post or project that does not exist is found out while the page streams, after the status line is sent (Next adds noindex instead),
    // so these answer 200: the page says so and tells search engines to skip it.
    for (const path of ["/blog/this-post-does-not-exist", "/work/nope"]) {
      const html = await (await request.get(path)).text();
      expect(html, path).toContain("Page not found");
      expect(html, path).toMatch(/<meta name="robots" content="noindex/);
    }
  });

  test("the admin is kept out of search engines", async ({ request }) => {
    const res = await request.get("/admin/login");
    expect(await res.text()).toMatch(/<meta name="robots" content="noindex/);
  });
});
