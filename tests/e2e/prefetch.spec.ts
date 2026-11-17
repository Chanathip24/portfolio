import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../support/fixtures";

// Post links prefetch the whole page, so opening one is instant: no loading skeleton and no new RSC request after the click.
// Runs in the desktop and the phone project (the phone project lists this file in playwright.config.ts).

/** Records every request that carries the `rsc` header. */
function recordRsc(page: Page) {
  const seen: string[] = [];
  page.on("request", (r) => {
    if (r.headers()["rsc"]) seen.push(r.url());
  });
  return seen;
}

/** Clicks the link, then checks the page opened without a skeleton or a fresh RSC fetch. */
async function expectInstantOpen(page: Page, link: Locator, seen: string[]) {
  const before = seen.length;
  await link.click();
  await expect(page).toHaveURL(/\/blog\/[^/]+$/);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(seen.slice(before)).toEqual([]);
}

test("a blog card opens its post without a skeleton or a new request", async ({ page }) => {
  const seen = recordRsc(page);
  await page.goto("/blog");
  const cards = page.locator('main a[href^="/blog/"]');
  await expect(cards.nth(1)).toBeVisible();
  for (const c of await cards.all()) await c.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");

  await expectInstantOpen(page, cards.nth(1), seen);
});

test("a related link opens its post without a skeleton or a new request", async ({ page }) => {
  const seen = recordRsc(page);
  await page.goto("/blog");
  await page.locator('main a[href^="/blog/"]').first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const related = page.locator('section[aria-labelledby="related-title"] a');
  await related.first().scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");

  await expectInstantOpen(page, related.first(), seen);
});
