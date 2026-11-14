import { expect, test } from "@playwright/test";
import { service } from "../support/db";

const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// POST /api/track: what gets counted and what is ignored.
test.describe("page-view tracking endpoint", () => {
  let baseline = 0;
  const lastId = async () => (await service().from("page_views").select("id").order("id", { ascending: false }).limit(1)).data?.[0]?.id ?? 0;
  const since = async () => (await service().from("page_views").select("path,referrer,visitor").gt("id", baseline).order("id")).data ?? [];

  test.beforeAll(async () => { baseline = await lastId(); });
  test.afterAll(async () => { await service().from("page_views").delete().gt("id", baseline); });

  test("a real browser's view of a public page is recorded without anything identifying", async ({ request, baseURL }) => {
    const res = await request.post("/api/track", { headers: { "user-agent": BROWSER, origin: baseURL!, "x-forwarded-for": "203.0.113.7" }, data: { path: "/blog/sync-without-fear?utm=x#top", referrer: "https://www.example.org/some/page" } });
    expect(res.status()).toBe(204);
    const rows = await since();
    const row = rows.at(-1)!;
    expect(row.path).toBe("/blog/sync-without-fear"); // query and fragment dropped
    expect(row.referrer).toBe("example.org"); // only the host, without www
    expect(row.visitor).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(row)).not.toContain("203.0.113.7"); // the address itself is never stored
  });

  test("the same visitor hashes to the same id on the same day, a different one to another", async ({ request, baseURL }) => {
    const hit = async (ip: string) => {
      await request.post("/api/track", { headers: { "user-agent": BROWSER, origin: baseURL!, "x-forwarded-for": ip }, data: { path: "/about" } });
      return (await since()).at(-1)!.visitor;
    };
    const a1 = await hit("198.51.100.1");
    const a2 = await hit("198.51.100.1");
    const b = await hit("198.51.100.2");
    expect(a2).toBe(a1);
    expect(b).not.toBe(a1);
  });

  test("ignores bots, other origins, unknown paths, admin paths and bad bodies (always 204, nothing stored)", async ({ request, baseURL }) => {
    const before = (await since()).length;
    const send = (headers: Record<string, string>, data: unknown) => request.post("/api/track", { headers: { "user-agent": BROWSER, origin: baseURL!, ...headers }, data });
    const results = await Promise.all([
      send({ "user-agent": "Googlebot/2.1" }, { path: "/" }),
      send({ "user-agent": "HeadlessChrome/130" }, { path: "/" }),
      send({ origin: "https://evil.example" }, { path: "/" }),
      send({}, { path: "/admin" }),
      send({}, { path: "/not-a-page" }),
      send({}, { path: "/blog/has space" }),
      send({}, { path: "x".repeat(400) }),
      send({}, { nope: true }),
      send({ cookie: "sb-127-auth-token=abc" }, { path: "/" }), // a signed-in admin's own visit
    ]);
    for (const r of results) expect(r.status()).toBe(204);
    expect((await since()).length).toBe(before);
  });

  test("counts each public route once per request", async ({ request, baseURL }) => {
    const before = (await since()).length;
    for (const path of ["/", "/blog", "/about", "/work", "/work/tidewater"]) {
      await request.post("/api/track", { headers: { "user-agent": BROWSER, origin: baseURL! }, data: { path } });
    }
    expect((await since()).length).toBe(before + 5);
  });
});
