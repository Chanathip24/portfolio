import { expect, test } from "../support/fixtures";

test("a click on an admin link shows the loading bar until the page has opened", async ({ page }) => {
  // Hold the next page back, the way a slow database would, so the bar is on screen long enough to see. This is set up before the
  // first load so the browser's own prefetch of that page is held back too: on a warm server the prefetch would otherwise finish
  // before the click, the page would open at once, and the bar would flash for a few milliseconds.
  await page.route(/\/admin\/posts(\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto("/admin");
  const bar = page.getByRole("progressbar", { name: "Loading page" });
  await expect(bar).toHaveCount(0);

  await page.locator('aside a[href="/admin/posts"]').click();
  await expect(bar).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await expect(bar).toHaveCount(0);
});
