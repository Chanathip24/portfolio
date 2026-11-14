import { expect, test } from "@playwright/test";
import { service } from "../support/db";

// Playwright's own Chrome calls itself "HeadlessChrome", which the error endpoint (rightly) treats as a bot.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

test.describe("errors thrown in a visitor's browser", () => {
  const tag = `E2E browser error ${Date.now().toString(36)}`;
  const stored = async (message: string) => (await service().from("error_events").select("source,path,message").eq("message", message)).data ?? [];
  test.afterAll(async () => {
    await service().from("error_events").delete().like("message", `${tag}%`);
    await service().from("messages").delete().like("subject", `%${tag}%`);
  });

  const throwLater = (page: import("@playwright/test").Page, message: string) =>
    page.evaluate((m) => { setTimeout(() => { throw new Error(m); }, 0); }, message); // nothing catches it, like a real bug in a click handler

  test("an uncaught error reaches the Errors table with its page", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: UA });
    const page = await context.newPage();
    await page.goto("/about");
    await expect(page.getByRole("region", { name: "Privacy notice" })).toBeVisible(); // the page's scripts have started: the error listener is attached
    await throwLater(page, `${tag} counted`);
    await expect.poll(async () => (await stored(`${tag} counted`)).length, { timeout: 15_000 }).toBe(1);
    expect((await stored(`${tag} counted`))[0]).toMatchObject({ source: "client", path: "/about" });
    await context.close();
  });

  test("a visitor who opted out is not reported", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: UA });
    await context.addInitScript(() => localStorage.setItem("analytics-consent", "declined"));
    const page = await context.newPage();
    await page.goto("/about");
    await page.waitForLoadState("networkidle"); // same readiness as above, without the notice (an opted-out visitor does not get one)
    await throwLater(page, `${tag} private`);
    await page.waitForTimeout(2500);
    expect(await stored(`${tag} private`)).toHaveLength(0);
    await context.close();
  });
});
