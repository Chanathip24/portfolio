import { choose, expect, test } from "../support/fixtures";
import { service } from "../support/db";

// How the form controls look and behave, checked on the real pages.
test.describe("admin form controls", () => {
  for (const path of ["/admin/posts/new", "/admin/projects/new", "/admin/profile"]) {
    test(`${path}: controls are comfortably tall, labelled and use shadcn parts`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("form")).toBeVisible();

      // text inputs and selects are at least 40px tall
      const heights = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("[data-slot=input]:not([type=file]):not([type=hidden]):not([type=checkbox]), [data-slot=select-trigger]")]
          .filter((el) => el.getBoundingClientRect().height > 1 && !el.closest("[aria-hidden=true]"))
          .map((el) => Math.round(el.getBoundingClientRect().height)));
      expect(heights.length).toBeGreaterThan(3);
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(40);

      // no browser-native dropdowns, and every visible control has a label
      expect(await page.locator("select").count()).toBe(0);
      const unlabelled = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLInputElement>("form input:not([type=file]):not([type=hidden]), form textarea, form [role=combobox]")]
          .filter((el) => el.getBoundingClientRect().height > 1 && el.getAttribute("aria-hidden") !== "true" && !el.closest("[aria-hidden=true]"))
          .filter((el) => !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"))
          .map((el) => el.id || el.tagName));
      expect(unlabelled).toEqual([]);
    });

    test(`${path}: text fields have placeholders`, async ({ page }) => {
      await page.goto(path);
      const empty = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("form [data-slot=input][type=text], form [data-slot=textarea]")]
          .filter((el) => el.getBoundingClientRect().height > 1 && !el.closest("[aria-hidden=true]") && !el.closest("[data-slot=input-otp]"))
          .filter((el) => !el.placeholder)
          .map((el) => el.id));
      expect(empty).toEqual([]);
    });
  }

  test("textareas cannot be dragged to resize", async ({ page }) => {
    await page.goto("/admin/posts/new");
    const resize = await page.getByLabel("Excerpt").evaluate((el) => getComputedStyle(el).resize);
    expect(resize).toBe("none");
  });

  test("the Select opens a list, chooses with the keyboard and shows the label", async ({ page }) => {
    await page.goto("/admin/posts/new");
    const category = page.getByRole("combobox", { name: "Category" });
    await expect(category).toContainText("Engineering");
    await category.click();
    expect(await page.getByRole("option").count()).toBeGreaterThanOrEqual(4);
    await page.getByRole("option", { name: "Design", exact: true }).click();
    await expect(category).toContainText("Design");
    await category.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(category).not.toContainText("Design");
  });

  test.describe("publish date", () => {
    test.use({ timezoneId: "Asia/Bangkok" });
    test.afterEach(async () => { await service().from("posts").delete().like("slug", "e2e%"); });

    test("a calendar and a time field set the date; it is saved as the right instant and survives a reload", async ({ page }) => {
      await page.goto("/admin/posts/new");
      const title = `E2E date ${Date.now()}`;
      await page.getByLabel("Title").fill(title);
      const date = page.getByRole("button", { name: "Publish date" });
      await expect(date).toContainText("Pick a date and time");
      await date.click();
      await page.locator("[role=gridcell]", { hasText: /^15$/ }).click();
      await page.getByLabel("Time", { exact: true }).fill("18:30");
      await page.keyboard.press("Escape");
      await expect(date).toContainText(/15 \w{3,4} \d{4}, 18:30/);
      await choose(page, "Status", "Draft");
      await page.getByRole("button", { name: "Create post" }).click();
      await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}$/);

      const { data } = await service().from("posts").select("published_at").eq("title", title).single();
      expect(new Date(data!.published_at).getUTCHours()).toBe(11); // 18:30 in Bangkok (UTC+7) is 11:30 UTC
      await page.reload();
      await expect(page.getByRole("button", { name: "Publish date" })).toContainText("18:30");
    });
  });

  test("the unsaved-changes hint appears after an edit and the save bar stays in view", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await page.getByLabel("Title").fill("E2E hint");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    const bar = page.getByRole("button", { name: "Create post" });
    await expect(bar).toBeInViewport(); // sticky at the bottom of the viewport even though the page is long
  });
});
