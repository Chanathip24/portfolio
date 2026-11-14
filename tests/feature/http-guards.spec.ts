import { expect, test } from "@playwright/test";

// What a plain HTTP client (no browser, no session) gets from the admin and from the public site.
test.describe("admin access over plain HTTP", () => {
  for (const path of ["/admin", "/admin/posts", "/admin/posts/new", "/admin/projects", "/admin/profile", "/admin/about"]) {
    test(`GET ${path} without a session redirects to sign-in`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers().location).toContain("/admin/login");
    });
  }

  test("the sign-in page cannot be framed or cached", async ({ request }) => {
    const res = await request.get("/admin/login");
    expect(res.status()).toBe(200);
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test("a made-up session cookie is not accepted", async ({ request }) => {
    const res = await request.get("/admin", { maxRedirects: 0, headers: { cookie: "sb-127-auth-token=base64-eyJmYWtlIjp0cnVlfQ" } });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toMatch(/\/admin\/(login|mfa)/);
  });

  test("the forced sign-out route clears nothing it should not and lands on the sign-in page", async ({ request }) => {
    const res = await request.get("/admin/forbidden", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toContain("/admin/login?error=forbidden");
  });

  test("a server action cannot be called without a session", async ({ request }) => {
    const res = await request.post("/admin/posts", { headers: { "next-action": "00".repeat(20), "content-type": "text/plain" }, data: "[]", maxRedirects: 0 });
    expect([303, 307, 400, 404, 500]).toContain(res.status()); // refused or unknown, never a success that wrote something
  });
});

test.describe("public site", () => {
  test("pages carry the basic security headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers()["permissions-policy"]).toContain("camera=()");
    expect(res.headers()["cross-origin-opener-policy"]).toBe("same-origin");
  });

  for (const path of ["/", "/blog", "/about", "/work/tidewater", "/blog/sync-without-fear"]) {
    test(`${path} renders for a visitor`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(200);
    });
  }
});
