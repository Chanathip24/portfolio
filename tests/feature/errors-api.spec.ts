import { expect, test } from "@playwright/test";
import { service } from "../support/db";

const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const address = (net: string) => `${net}.${1 + Math.floor(Math.random() * 250)}`; // documentation-only ranges; the limit lives in the database, so each run needs its own

// POST /api/errors: what is recorded, what is ignored, and the notice in the Inbox the first time a bug appears.
test.describe("browser error reports", () => {
  const tag = `E2E error ${Date.now().toString(36)}`;
  const rows = async (like = `${tag}%`) => (await service().from("error_events").select("fingerprint,message,path,source,stack").like("message", like).order("id")).data ?? [];
  const notices = async () => (await service().from("messages").select("subject,body,severity,is_read").like("subject", `%${tag}%`)).data ?? [];

  test.afterAll(async () => {
    await service().from("error_events").delete().like("message", `${tag}%`);
    await service().from("messages").delete().like("subject", `%${tag}%`);
  });

  const report = (request: import("@playwright/test").APIRequestContext, baseURL: string, data: unknown, ip = address("203.0.113"), headers: Record<string, string> = {}) =>
    request.post("/api/errors", { data, headers: { "user-agent": BROWSER, origin: baseURL, "x-test-ip": ip, ...headers } });

  test("a report is stored with no identifying details, and the same bug gets the same fingerprint", async ({ request, baseURL }) => {
    const stack = "Error: boom\n    at render (app.js:10:5)";
    expect((await report(request, baseURL!, { message: `${tag} one 123`, stack, path: "/blog/hello?utm=x#top" })).status()).toBe(204);
    expect((await report(request, baseURL!, { message: `${tag} one 456`, stack, path: "/blog/hello" })).status()).toBe(204);
    const stored = await rows();
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({ source: "client", path: "/blog/hello", message: `${tag} one 123` }); // query and fragment dropped
    expect(stored[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(stored[1].fingerprint).toBe(stored[0].fingerprint); // only the number in the message differs
  });

  test("a different bug gets a different fingerprint", async ({ request, baseURL }) => {
    // Two bugs of its own, so it does not depend on what an earlier test stored.
    await report(request, baseURL!, { message: `${tag} apart one`, stack: "Error: first\n    at here (a.js:1:1)", path: "/about" });
    await report(request, baseURL!, { message: `${tag} apart two`, stack: "Error: other\n    at somewhere (other.js:1:1)", path: "/about" });
    const mine = await rows(`${tag} apart%`);
    expect(mine).toHaveLength(2);
    expect(new Set(mine.map((r) => r.fingerprint)).size).toBe(2);
  });

  test("the Inbox is told once, the first time a new bug appears", async ({ request, baseURL }) => {
    const message = `${tag} alert`;
    for (let i = 0; i < 3; i++) await report(request, baseURL!, { message, path: "/work/tidewater" });
    await expect.poll(async () => (await notices()).filter((n) => n.subject.includes("alert")).length).toBe(1);
    const [notice] = (await notices()).filter((n) => n.subject.includes("alert"));
    expect(notice.subject).toContain("New browser error");
    expect(notice.body).toContain(message);
    expect(notice.body).toContain("/work/tidewater");
    expect(notice.is_read).toBe(false);
    expect((await rows(`${message}%`)).length).toBe(3); // every occurrence is still counted
  });

  test("bots, other sites and malformed reports are ignored without an error", async ({ request, baseURL }) => {
    const before = (await rows()).length;
    const message = `${tag} ignored`;
    expect((await report(request, baseURL!, { message, path: "/" }, undefined, { "user-agent": "Googlebot/2.1" })).status()).toBe(204);
    expect((await report(request, baseURL!, { message, path: "/" }, undefined, { "user-agent": "HeadlessChrome/130" })).status()).toBe(204);
    expect((await report(request, baseURL!, { message, path: "/" }, undefined, { origin: "https://evil.example" })).status()).toBe(204);
    expect((await report(request, baseURL!, { message: "x".repeat(501), path: "/" })).status()).toBe(204); // too long
    expect((await report(request, baseURL!, { path: "/" })).status()).toBe(204); // no message
    expect((await report(request, baseURL!, "not json")).status()).toBe(204);
    expect((await rows()).length).toBe(before);
  });

  test("a flood spread over many addresses is capped overall", async ({ request, baseURL }) => {
    // The ceiling for everyone together is 300 a minute; start the counter one short of it.
    await service().from("rate_limits").upsert({ key: "errors:all", window_start: new Date().toISOString(), hits: 299 });
    try {
      const message = `${tag} wide`;
      for (const net of ["203.0.113", "198.51.100", "192.0.2", "198.18.0"]) expect((await report(request, baseURL!, { message, path: "/" }, address(net))).status()).toBe(204);
      expect((await rows(`${message}%`)).length).toBe(1); // the 300th got in; the rest were turned away, each from an address of its own
    } finally {
      await service().from("rate_limits").delete().eq("key", "errors:all");
    }
  });

  test("one address can report 20 a minute; another address is unaffected", async ({ request, baseURL }) => {
    const [one, other] = [address("198.51.100"), address("192.0.2")];
    const message = `${tag} flood`;
    for (let i = 0; i < 25; i++) expect((await report(request, baseURL!, { message, path: "/" }, one)).status()).toBe(204); // the answer never changes
    expect((await rows(`${message}%`)).length).toBe(20);
    await report(request, baseURL!, { message, path: "/" }, other);
    expect((await rows(`${message}%`)).length).toBe(21);
  });
});
