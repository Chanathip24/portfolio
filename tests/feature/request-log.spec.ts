import { spawn, type ChildProcess } from "node:child_process";
import Module from "node:module";
import { expect, test } from "@playwright/test";
import { service } from "../support/db";

// The one JSON line per request that withRequestLog (src/lib/request-log.ts) writes to the server's stdout. A server of its own is started
// here, as in missing-service-key.spec.ts, because the shared one's output is not visible to the tests.
const PORT = "3112";
const origin = `http://localhost:${PORT}`;
const rand = () => Math.random().toString(36).slice(2, 8);
const FIELDS = ["durationMs", "method", "route", "status", "type"];

test.describe("request log", () => {
  let server: ChildProcess;
  let out = "";
  const email = `e2e-tq-log-${rand()}@example.com`;
  const secret = `e2e secret message ${rand()}`;
  const ip = `198.51.100.${1 + Math.floor(Math.random() * 250)}`;
  const lines = () => out.split("\n").filter((l) => l.startsWith("{") && l.includes('"type":"request"')).map((l) => JSON.parse(l));

  test.beforeAll(async ({ request }) => {
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", PORT], {
      env: { ...process.env, TRUSTED_PROXY_IP_HEADER: "x-test-ip" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });
    server.stdout!.on("data", (d) => { out += d; });
    await expect.poll(async () => {
      try { return (await request.get(`${origin}/admin/login`)).status(); } catch { return 0; }
    }, { timeout: 30_000 }).toBe(200);
  });
  test.afterAll(async () => {
    server?.kill();
    await service().from("messages").delete().eq("from_email", email);
  });

  test("one line per request, with only route, method, status, duration and source; nothing the visitor sent", async ({ request }) => {
    const headers = { origin, "x-test-ip": ip };
    const calls: [string, number, () => Promise<{ status(): number }>][] = [
      ["/api/public/work", 200, () => request.get(`${origin}/api/public/work?email=${email}`, { headers })],
      ["/api/public/nope", 404, () => request.get(`${origin}/api/public/nope`, { headers })],
      ["/api/public/posts", 403, () => request.get(`${origin}/api/public/posts`, { headers: { ...headers, origin: "https://evil.example" } })],
      ["/api/contact", 400, () => request.post(`${origin}/api/contact`, { headers, data: { email: "nope", message: secret } })],
      ["/api/contact", 204, () => request.post(`${origin}/api/contact`, { headers, data: { email, message: secret, website: "http://spam" } })],
      ...[1, 2, 3].map((): [string, number, () => Promise<{ status(): number }>] => ["/api/contact", 201, () => request.post(`${origin}/api/contact`, { headers, data: { email, message: secret } })]),
      ["/api/contact", 429, () => request.post(`${origin}/api/contact`, { headers, data: { email, message: secret } })],
    ];
    for (const [, status, call] of calls) expect((await call()).status()).toBe(status);

    await expect.poll(() => lines().length).toBe(calls.length);
    const logged = lines();
    expect(logged.map((l) => [l.route, l.status])).toEqual(calls.map(([route, status]) => [route, status]));
    for (const l of logged) {
      const isPublic = l.route.startsWith("/api/public/");
      expect(Object.keys(l).sort()).toEqual(isPublic ? [...FIELDS, "source"].sort() : FIELDS);
      expect(l).toMatchObject({ type: "request", method: isPublic ? "GET" : "POST", durationMs: expect.any(Number) });
      if (isPublic) expect(["api", "supabase", "mock"]).toContain(l.source);
    }
    // Not in any line the server wrote, request log or not.
    for (const leak of [email, secret, ip, "evil.example"]) expect(out).not.toContain(leak);
  });
});

test("a handler that throws is logged as 500 and the error still reaches the caller", async () => {
  // request-log.ts starts with import "server-only", which Next resolves to its empty module on the server; do the same here.
  const M = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
  const resolve = M._resolveFilename;
  M._resolveFilename = function (request, ...rest) { return resolve.call(this, request === "server-only" ? "next/dist/compiled/server-only/empty.js" : request, ...rest); };
  const { withRequestLog } = await import("../../src/lib/request-log").finally(() => { M._resolveFilename = resolve; });
  const logged: string[] = [];
  const log = console.log;
  console.log = (line: string) => logged.push(line);
  try {
    const handler = withRequestLog(async () => { throw new Error("boom"); }, { source: "mock" });
    await expect(handler(new Request("http://x.test/api/thing?secret=1", { method: "POST" }), {})).rejects.toThrow("boom");
    const ok = withRequestLog(async () => new Response(null, { status: 204 }));
    expect((await ok(new Request("http://x.test/api/other"), {})).status).toBe(204);
  } finally {
    console.log = log;
  }
  const [thrown, fine] = logged.map((l) => JSON.parse(l));
  expect(thrown).toEqual({ type: "request", route: "/api/thing", method: "POST", status: 500, durationMs: expect.any(Number), source: "mock" });
  expect(fine).toEqual({ type: "request", route: "/api/other", method: "GET", status: 204, durationMs: expect.any(Number) });
  expect(logged).toHaveLength(2);
});
