import { expect, test } from "@playwright/test";
import { anon, service } from "../support/db";

const SECRET = "test-cron-secret"; // CRON_SECRET for the test server (playwright.config.ts)
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

// The daily cleanup: old measurements go, everything else stays, and only the cron caller can run it.
test.describe("retention", () => {
  const call = (request: import("@playwright/test").APIRequestContext, authorization?: string) =>
    request.get("/api/cron/cleanup", { headers: authorization ? { authorization } : {} });

  test.afterAll(async () => {
    const db = service();
    await db.from("page_views").delete().like("visitor", "e2e-ret-%");
    await db.from("web_vitals").delete().like("path", "/e2e-ret-%");
    await db.from("error_events").delete().like("message", "E2E retention %");
    await db.from("auth_attempts").delete().eq("kind", "e2e-ret");
    await db.from("rate_limits").delete().like("key", "e2e-ret-%");
    await db.from("messages").delete().like("subject", "E2E retention %");
  });

  test("the route is closed to anyone without the secret", async ({ request }) => {
    expect((await call(request)).status()).toBe(401);
    expect((await call(request, "Bearer wrong")).status()).toBe(401);
    expect((await call(request, SECRET)).status()).toBe(401); // the scheme is part of the header
  });

  test("old page views, load times, errors, attempts and limits are deleted; recent ones, and messages, are kept", async ({ request }) => {
    const db = service();
    await db.from("page_views").insert([{ path: "/blog", visitor: "e2e-ret-old", created_at: daysAgo(200) }, { path: "/blog", visitor: "e2e-ret-new", created_at: daysAgo(10) }]);
    await db.from("web_vitals").insert(["old", "new"].map((w) => ({ metric: "LCP", value: 1000, rating: "good", path: `/e2e-ret-${w}`, device: "desktop", created_at: daysAgo(w === "old" ? 200 : 10) })));
    await db.from("error_events").insert([{ source: "client", fingerprint: "e2e0000000000001", message: "E2E retention old", path: "/", created_at: daysAgo(100) }, { source: "client", fingerprint: "e2e0000000000002", message: "E2E retention new", path: "/", created_at: daysAgo(10) }]);
    await db.from("auth_attempts").insert([{ kind: "e2e-ret", key: "old", at: daysAgo(10) }, { kind: "e2e-ret", key: "new", at: daysAgo(1) }]);
    await db.from("rate_limits").insert([{ key: "e2e-ret-old", window_start: daysAgo(3), hits: 1 }, { key: "e2e-ret-new", window_start: new Date().toISOString(), hits: 1 }]);
    await db.from("messages").insert({ source: "system", kind: "message", subject: "E2E retention old message", body: "kept", received_at: daysAgo(400) });

    const res = await call(request, `Bearer ${SECRET}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    for (const table of ["page_views", "web_vitals", "error_events", "auth_attempts", "rate_limits"]) expect(body.deleted[table]).toBeGreaterThanOrEqual(1);

    const has = async (table: string, column: string, value: string) => ((await db.from(table).select("*", { count: "exact", head: true }).eq(column, value)).count ?? 0) > 0;
    expect(await has("page_views", "visitor", "e2e-ret-old")).toBe(false);
    expect(await has("page_views", "visitor", "e2e-ret-new")).toBe(true);
    expect(await has("web_vitals", "path", "/e2e-ret-old")).toBe(false);
    expect(await has("web_vitals", "path", "/e2e-ret-new")).toBe(true);
    expect(await has("error_events", "message", "E2E retention old")).toBe(false);
    expect(await has("error_events", "message", "E2E retention new")).toBe(true);
    expect(await has("auth_attempts", "key", "old")).toBe(false);
    expect(await has("auth_attempts", "key", "new")).toBe(true);
    expect(await has("rate_limits", "key", "e2e-ret-old")).toBe(false);
    expect(await has("rate_limits", "key", "e2e-ret-new")).toBe(true);
    expect(await has("messages", "subject", "E2E retention old message")).toBe(true); // an old message is still a message
  });

  test("a signed-out visitor cannot run the cleanup function", async () => {
    const { error } = await anon().rpc("cleanup_old_data");
    expect(error).not.toBeNull();
  });
});
