import { expect, test } from "../support/fixtures";
import { settled } from "../support/settled";

// The public site on a phone-sized touch screen (see the e2e-phone project in playwright.config.ts).
test.describe("the public site on a phone", () => {
  for (const path of ["/", "/blog", "/about", "/privacy", "/blog/money-is-an-integer", "/work/tidewater"]) {
    test(`${path} does not scroll sideways`, async ({ visitor: page }) => {
      await page.goto(path);
      await settled(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });
  }

  test("the blog tabs and search work with a touch", async ({ visitor: page }) => {
    await page.goto("/blog");
    await page.getByRole("tab", { name: /^Data/ }).tap();
    await expect(page).toHaveURL(/[?&]category=data/);
    await expect(page.getByRole("link", { name: /Money is an integer/ }).first()).toBeVisible();
    await page.getByRole("tab", { name: /^All/ }).tap();
    await page.getByRole("searchbox", { name: "Search posts" }).fill("money");
    await expect(page).toHaveURL(/[?&]q=money/);
    await expect(page.getByRole("link", { name: /Money is an integer/ }).first()).toBeVisible();
  });

  test("a project row unfolds on a tap, one at a time", async ({ visitor: page }) => {
    await page.goto("/");
    const rows = page.getByRole("button", { expanded: false }).filter({ hasText: /·/ }); // each row shows "client · year"
    const first = rows.first();
    await first.scrollIntoViewIfNeeded();
    await first.tap();
    await expect(page.getByRole("button", { expanded: true }).filter({ hasText: /·/ })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Details" }).first()).toBeVisible();
    await rows.first().tap(); // another row: the first one closes
    await expect(page.getByRole("button", { expanded: true }).filter({ hasText: /·/ })).toHaveCount(1);
  });

  test("a long post shows a floating contents button once you scroll; it opens the sections and jumps to one", async ({ visitor: page }) => {
    await page.goto("/blog/money-is-an-integer");
    await page.getByRole("button", { name: "OK", exact: true }).tap(); // the privacy notice sits at the bottom, where the button appears
    const open = page.getByRole("button", { name: /^On this page:/ });
    await expect(open).toHaveAttribute("tabindex", "-1"); // not reachable until it has appeared
    await page.evaluate(() => window.scrollTo(0, 900)); // a touch screen has no wheel
    await expect(open).toHaveAttribute("tabindex", "0");
    await open.tap();
    const sheet = page.getByRole("dialog", { name: "On this page" });
    await expect(sheet).toBeVisible();
    const last = sheet.getByRole("list").getByRole("button").last();
    const heading = (await last.innerText()).trim();
    await last.tap();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeInViewport();
  });

  test("the contact form fits and sends with the on-screen keyboard's Enter", async ({ visitor: page }) => {
    await page.goto("/");
    await page.getByLabel("Ask me anything else").fill("Phone question");
    await page.getByLabel("Your email, so I can reply").fill("phone@example.com");
    await page.route("**/api/contact", (route) => route.fulfill({ status: 200, json: { message: "Sent." } }));
    await page.getByLabel("Your email, so I can reply").press("Enter");
    await expect(page.getByRole("status")).toHaveText("Sent.");
  });
});
