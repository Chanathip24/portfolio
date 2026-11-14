import { test, expect } from "../support/fixtures";

test("public pages hydrate under CSP and reject an untrusted inline script", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { violations: string[] }).violations.push(`${e.effectiveDirective}:${e.blockedURI}`);
    });
  });
  let previous = "";
  for (const path of ["/", "/blog", "/about", "/blog/sync-without-fear", "/work/tidewater"]) {
    const response = await page.goto(path);
    const csp = response!.headers()["content-security-policy"];
    expect(csp).toContain("frame-ancestors 'self'");
    const nonce = /'nonce-([^']+)'/.exec(csp)![1];
    expect(nonce).not.toBe(previous);
    previous = nonce;
    await expect(page.locator("body")).toBeVisible();
    // Framework and beforeInteractive scripts must carry the exact response nonce.
    expect(await page.locator("script:not([src]):not([type])").evaluateAll((scripts, expected) => scripts.every((s) => (s as HTMLScriptElement).nonce === expected), nonce)).toBe(true);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
  }
  // Inject into the parsed HTML, not via evaluate(): strict-dynamic trusts code created by already-trusted scripts.
  await page.route("**/about", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace("</head>", "<script>window.untrustedScriptRan = true</script></head>") });
  });
  await page.goto("/about");
  expect(await page.evaluate(() => (window as unknown as { untrustedScriptRan?: boolean }).untrustedScriptRan)).toBeUndefined();
  await expect.poll(() => page.evaluate(() => (window as unknown as { violations: string[] }).violations.some((v) => v === "script-src-elem:inline"))).toBe(true);
  await context.close();
});

test("every admin section works under the nonce policy", async ({ page }) => {
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
