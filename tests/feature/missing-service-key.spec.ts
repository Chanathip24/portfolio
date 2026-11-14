import { spawn, type ChildProcess } from "node:child_process";
import { expect, test } from "@playwright/test";
import { service } from "../support/db";

test.describe("ingestion without a server service key", () => {
  let server: ChildProcess;
  const origin = "http://localhost:3111";
  test.beforeAll(async ({ request }) => {
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3111"], {
      env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: "" }, stdio: "ignore", windowsHide: true,
    });
    await expect.poll(async () => {
      try { return (await request.get(`${origin}/admin/login`)).status(); } catch { return 0; }
    }, { timeout: 30_000 }).toBe(200);
  });
  test.afterAll(() => { server?.kill(); });

  test("contact fails closed and telemetry never inserts using a public key", async ({ request }) => {
    const contact = await request.post(`${origin}/api/contact`, { headers: { origin }, data: { email: "e2e-missing-key@test.local", message: "must not be stored" } });
    expect(contact.status()).toBe(503);
    const before = (await service().from("page_views").select("id", { count: "exact", head: true })).count;
    expect((await request.post(`${origin}/api/track`, { headers: { origin, "user-agent": "Mozilla/5.0 Chrome/130" }, data: { path: "/" } })).status()).toBe(204);
    expect((await service().from("page_views").select("id", { count: "exact", head: true })).count).toBe(before);
  });
});
