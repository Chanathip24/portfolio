import { expect, test } from "../support/fixtures";
import { BASE } from "../support/env";
import { service } from "../support/db";

const REAL_BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

test.describe.serial("analytics", () => {
  let before = 0;
  const count = async () => (await service().from("page_views").select("id", { count: "exact", head: true })).count ?? 0;
  const lastId = async () => (await service().from("page_views").select("id").order("id", { ascending: false }).limit(1)).data?.[0]?.id ?? 0;
  let baselineId = 0;

  test.beforeAll(async () => { before = await count(); baselineId = await lastId(); });
  test.afterAll(async () => { await service().from("page_views").delete().gt("id", baselineId); });

  test("visits to public pages are recorded; the admin's own browsing is not", async ({ browser, page }) => {
    // browser.newContext() inherits the admin session from the fixtures, so say explicitly that this visitor is signed out
    const visitor = await browser.newContext({ baseURL: BASE, userAgent: REAL_BROWSER, storageState: { cookies: [], origins: [] } });
    const tab = await visitor.newPage();
    for (const path of ["/", "/blog", "/blog/sync-without-fear", "/about"]) {
      // wait for the page's own beacon rather than a fixed pause: leaving early would cancel it
      await Promise.all([tab.waitForResponse((r) => r.url().includes("/api/track")), tab.goto(path)]);
    }
    await visitor.close();
    await expect.poll(count, { timeout: 10_000 }).toBeGreaterThanOrEqual(before + 4);

    const afterVisitors = await count();
    await page.goto("/blog"); // the signed-in admin: the page sends nothing
    await page.waitForTimeout(1500);
    expect(await count()).toBe(afterVisitors);
  });

  test("the overview reports them in a sentence, a chart, rankings and a table", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/^page views?$/)).toBeVisible();
    await expect(page.getByText(/visitors?$/).first()).toBeVisible();
    await expect(page.getByText("/blog/sync-without-fear").first()).toBeVisible();
    await expect(page.locator("[data-slot=chart]").first()).toBeVisible();
    await page.getByText("View as a table").click();
    await expect(page.getByRole("columnheader", { name: "Views" })).toBeVisible();
  });

  test("the range switch changes the period", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: "7 days" }).click();
    await expect(page).toHaveURL(/range=7/);
    await expect(page.getByText(/The last 7 days/)).toBeVisible();
    await expect(page.getByRole("link", { name: "7 days" })).toHaveAttribute("aria-current", "page");
  });

  test("the numbers add up: the sentence matches the database", async ({ page }) => {
    const { data } = await service().rpc("analytics_summary", { days: 30 });
    await page.goto("/admin");
    await expect(page.getByText(/^page views?$/)).toBeVisible();
    const text = await page.locator("main").innerText();
    const views = Number(text.match(/([\d.,]+K?)\s+page views?/)?.[1].replace(/[,K]/g, "") ?? NaN);
    expect(views).toBe(data.views);
  });
});
