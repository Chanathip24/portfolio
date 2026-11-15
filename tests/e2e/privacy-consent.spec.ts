import { expect, test, type Page } from "@playwright/test";

// What a visitor is told, what is counted by default, and how to stop it. Visitors have no admin session, so these tests use their own
// browser contexts and never the signed-in admin page.
const sentViews = (page: Page) => {
  const urls: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/api/track")) urls.push(r.url()); });
  return urls;
};

test.describe("privacy and consent", () => {
  test("the privacy page says what is measured, and the footer links to it", async ({ page, request }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
    for (const heading of ["Your choice", "What is measured", "What happens even if you opt out", "Who handles the data", "Questions, or deleting your data"]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    await page.goto("/about");
    await expect(page.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/privacy");
  });

  test("a new visitor sees the notice and is counted; Opt out stops the counting and the notice does not come back", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const sent = sentViews(page);
    await page.goto("/blog");
    const notice = page.getByRole("region", { name: "Privacy notice" });
    await expect(notice).toBeVisible();
    await expect.poll(() => sent.length).toBeGreaterThan(0); // on by default: no cookies, nothing identifying

    await notice.getByRole("button", { name: "Opt out" }).click();
    await expect(notice).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("analytics-consent"))).toBe("declined");

    const before = sent.length;
    await page.getByRole("link", { name: "About" }).first().click(); // a page change that would normally be counted
    await expect(page).toHaveURL(/\/about$/);
    await page.waitForTimeout(1500);
    expect(sent.length).toBe(before);

    await page.reload();
    await expect(notice).toHaveCount(0);
    await page.waitForTimeout(1500);
    expect(sent.length).toBe(before);
    await context.close();
  });

  test("OK keeps counting and dismisses the notice", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/blog");
    const notice = page.getByRole("region", { name: "Privacy notice" });
    await notice.getByRole("button", { name: "OK" }).click();
    await expect(notice).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("analytics-consent"))).toBe("accepted");
    await context.close();
  });

  test("Do Not Track is respected: no notice, nothing counted", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => Object.defineProperty(navigator, "doNotTrack", { get: () => "1" }));
    const page = await context.newPage();
    const sent = sentViews(page);
    await page.goto("/blog");
    await page.getByRole("link", { name: "About" }).first().click();
    await expect(page).toHaveURL(/\/about$/);
    await page.waitForTimeout(1500);
    await expect(page.getByRole("region", { name: "Privacy notice" })).toHaveCount(0);
    expect(sent).toHaveLength(0);
    await context.close();
  });

  test("the privacy page can turn counting back on", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => localStorage.setItem("analytics-consent", "declined"));
    const page = await context.newPage();
    const sent = sentViews(page);
    await page.goto("/privacy");
    await expect(page.getByRole("status").filter({ hasText: "Measurement is off." })).toBeVisible();
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Measurement is on." })).toBeVisible();
    await expect.poll(() => sent.length).toBeGreaterThan(0); // turning it on counts the page the visitor is on
    await context.close();
  });
});
