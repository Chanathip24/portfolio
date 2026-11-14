import { expect, test } from "@playwright/test";
import { withinLimit } from "../../src/lib/request-policy";
import { service } from "../support/db";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

test.describe("withinLimit", () => {
  test("lets `max` calls through in a window, then refuses until the window ends", () => {
    const t = 1_000_000;
    const results = Array.from({ length: 5 }, () => withinLimit("unit-a", 3, 60_000, t));
    expect(results).toEqual([true, true, true, false, false]);
    expect(withinLimit("unit-a", 3, 60_000, t + 59_999)).toBe(false);
    expect(withinLimit("unit-a", 3, 60_000, t + 60_000)).toBe(true); // a new window
  });

  test("counts each key on its own", () => {
    expect(withinLimit("unit-b", 1, 60_000, 5)).toBe(true);
    expect(withinLimit("unit-b", 1, 60_000, 5)).toBe(false);
    expect(withinLimit("unit-c", 1, 60_000, 5)).toBe(true);
  });
});

// The test server trusts the x-test-ip header as the visitor's address (TRUSTED_PROXY_IP_HEADER in playwright.config.ts),
// the way the app trusts Vercel's header in production.
test.describe("page-view and vitals beacons are limited per address", () => {
  const start = new Date(Date.now() - 1000).toISOString();
  const count = async (table: string) => (await service().from(table).select("id", { count: "exact", head: true }).gte("created_at", start)).count ?? 0;
  test.afterAll(async () => { for (const t of ["page_views", "web_vitals"]) await service().from(t).delete().gte("created_at", start); });

  test("one address can log 60 page views a minute; another address is unaffected", async ({ request }) => {
    const post = (ip: string) => request.post("/api/track", { data: { path: "/about" }, headers: { "user-agent": UA, "x-test-ip": ip } });
    const before = await count("page_views");
    for (let i = 0; i < 70; i++) expect((await post("203.0.113.10")).status()).toBe(204); // the answer never changes, so a script learns nothing
    expect((await count("page_views")) - before).toBe(60);
    await post("203.0.113.11");
    expect((await count("page_views")) - before).toBe(61);
  });

  test("one address can send 120 vitals a minute; another address is unaffected", async ({ request }) => {
    const post = (ip: string) => request.post("/api/vitals", { data: { metric: "LCP", value: 1200, rating: "good", path: "/about", device: "desktop" }, headers: { "user-agent": UA, "x-test-ip": ip } });
    const before = await count("web_vitals");
    for (let i = 0; i < 130; i++) expect((await post("203.0.113.20")).status()).toBe(204);
    expect((await count("web_vitals")) - before).toBe(120);
    await post("203.0.113.21");
    expect((await count("web_vitals")) - before).toBe(121);
  });
});
