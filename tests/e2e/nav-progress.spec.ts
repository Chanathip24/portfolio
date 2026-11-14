import { expect, test } from "../support/fixtures";

test("a click on an admin link shows the loading bar until the page has opened", async ({ page }) => {
  await page.goto("/admin");
  const bar = page.getByRole("progressbar", { name: "Loading page" });
  await expect(bar).toHaveCount(0);

  // Hold the next page back, the way a slow database would, so the bar is on screen long enough to see.
  await page.route(/\/admin\/posts(\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.locator('aside a[href="/admin/posts"]').click();
  await expect(bar).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await expect(bar).toHaveCount(0);
});
