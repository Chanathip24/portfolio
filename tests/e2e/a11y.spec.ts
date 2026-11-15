import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "../support/fixtures";
import { settled } from "../support/settled";

// Automated accessibility checks (axe, WCAG 2 A and AA). They find the mechanical problems (contrast, names, roles, labels); they do not
// replace using the site with a keyboard and a screen reader. Only "serious" and "critical" problems fail a test.
const check = async (page: Page) => {
  // Anything marked aria-hidden is decoration hidden from assistive technology (for example the faded year behind each career entry),
  // and WCAG does not ask decoration to meet the contrast ratio.
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude('[aria-hidden="true"]').analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id} [${v.impact}] x${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
};

test.describe("public pages (as a visitor)", () => {
  for (const path of ["/", "/blog", "/about", "/privacy", "/blog/sync-without-fear", "/work/tidewater"]) {
    test(`${path} has no serious or critical accessibility problems`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      await page.goto(path);
      await settled(page); // the home page's intro has to finish drawing: axe reads colours as they are on screen
      await check(page);
      await context.close();
    });
  }
});

test.describe("the admin (signed in)", () => {
  for (const path of ["/admin", "/admin/posts", "/admin/activity", "/admin/errors", "/admin/settings", "/admin/users"]) {
    test(`${path} has no serious or critical accessibility problems`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("[aria-busy=true]")).toHaveCount(0); // the loading skeleton is gone
      await settled(page); // charts have finished drawing
      await check(page);
    });
  }
});
