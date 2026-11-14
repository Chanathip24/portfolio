import { test, expect } from "../support/fixtures";

test("public pages hydrate under CSP and the policy limits where scripts and data can go", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { violations: string[] }).violations.push(`${e.effectiveDirective}:${e.blockedURI}`);
    });
  });
  for (const path of ["/", "/blog", "/about", "/blog/sync-without-fear", "/work/tidewater", "/privacy"]) {
    const response = await page.goto(path);
    const csp = response!.headers()["content-security-policy"];
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    // Scripts may come from this site only (plus inline ones, which Next needs so pages can be pre-rendered).
    expect(/script-src ([^;]+)/.exec(csp)![1]).not.toMatch(/https?:\/\/(?!va\.vercel-scripts\.com)/);
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
  }
  await context.close();
});

test("every admin section works under the policy", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => { if (/Content Security Policy|violates.*directive/i.test(message.text())) violations.push(message.text()); });
  for (const path of ["", "/posts", "/posts/new", "/projects", "/projects/new", "/profile", "/about", "/categories", "/users", "/account", "/activity", "/settings", "/inbox", "/history", "/performance", "/data", "/media"]) {
    const response = await page.goto(`/admin${path}`);
    expect(response!.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    await expect(page.getByRole("button", { name: "Account menu" }).first()).toBeVisible();
  }
  expect(violations).toEqual([]);
});

test("an authenticated admin can explicitly re-check their authenticator", async ({ page }) => {
  await page.goto("/admin/mfa?reauth=1");
  await expect(page.getByRole("heading", { name: "Confirm it's you" })).toBeVisible();
  await expect(page.getByLabel(/Code from/)).toBeVisible();
});
