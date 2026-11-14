import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

// Phone-sized screen (see the e2e-phone project in playwright.config.ts).
test.describe("admin on a phone", () => {
  const noSideways = async (page: import("@playwright/test").Page) =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

  for (const path of ["/admin", "/admin/posts", "/admin/projects", "/admin/profile", "/admin/about", "/admin/posts/new", "/admin/projects/new", "/admin/categories", "/admin/users", "/admin/account", "/admin/activity", "/admin/activity?view=table", "/admin/settings", "/admin/inbox", "/admin/history", "/admin/performance"]) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await noSideways(page);
    });
  }

  test("the pages of one post and one project do not scroll sideways either", async ({ page }) => {
    const db = service();
    const post = (await db.from("posts").select("id").limit(1).single()).data!.id;
    const project = (await db.from("projects").select("id").limit(1).single()).data!.id;
    for (const path of [`/admin/posts/${post}`, `/admin/posts/${post}/stats`, `/admin/projects/${project}`, `/admin/projects/${project}/stats`]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await noSideways(page);
    }
  });

  test("a chart card keeps its title readable next to its period switch, and its chart fits the card", async ({ page }) => {
    await page.goto("/admin");
    const card = page.getByRole("region", { name: "Page views" });
    await expect(card.locator("[data-slot=chart]")).toBeVisible();
    expect((await card.getByRole("heading", { name: "Page views" }).boundingBox())!.width).toBeGreaterThan(80); // not squeezed into a sliver
    const cardBox = (await card.boundingBox())!;
    const chart = (await card.locator("[data-slot=chart]").boundingBox())!;
    expect(chart.x).toBeGreaterThanOrEqual(cardBox.x);
    expect(chart.x + chart.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
    // the period switch sits under the title, still inside the card
    const nav = (await card.getByRole("navigation", { name: "Time range" }).boundingBox())!;
    expect(nav.x + nav.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
  });

  test("on a phone the list comes before the charts on posts, projects and users", async ({ page }) => {
    for (const [path, chart] of [["/admin/posts", "Post views"], ["/admin/projects", "Project views"], ["/admin/users", "New accounts"]] as const) {
      await page.goto(path);
      const list = (await page.locator("main div[class*=\"md:hidden\"] > ul").first().boundingBox())!;
      const charts = (await page.getByRole("region", { name: chart }).boundingBox())!;
      expect(list.y, path).toBeLessThan(charts.y);
    }
  });

  test("the post and project lists become cards: no table to scroll sideways", async ({ page }) => {
    for (const path of ["/admin/posts", "/admin/projects"]) {
      await page.goto(path);
      await expect(page.locator("table")).toBeHidden();
      const cards = page.locator('main div[class*="md:hidden"] > ul > li');
      await expect(cards.first()).toBeVisible();
      expect(await cards.count()).toBeGreaterThanOrEqual(5);
      const card = cards.first();
      await expect(card.getByRole("link").first()).toBeVisible(); // the title opens the editor
      const tap = await card.getByRole("button", { name: /^Delete / }).boundingBox();
      expect(Math.min(tap!.width, tap!.height)).toBeGreaterThanOrEqual(28); // a finger can hit the actions
      await noSideways(page);
    }
  });

  test("the post form stacks: content first, then the publish box, organise and cover", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByRole("region", { name: "Publish" })).toBeVisible();
    const content = await page.getByLabel("Title").boundingBox();
    const publish = await page.getByRole("region", { name: "Publish" }).boundingBox();
    expect(publish!.y).toBeGreaterThan(content!.y);
    expect(publish!.x).toBeLessThan(40); // full width, not a narrow column beside the content
    await expect(page.getByRole("region", { name: "Organise" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Cover image" })).toBeVisible();
  });

  test("the users list is readable without sideways scrolling", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("button", { name: /^Actions for / }).first()).toBeVisible();
    await noSideways(page);
  });

  test("the About admin tabs wrap and the tool tiles fit", async ({ page }) => {
    await page.goto("/admin/about");
    await page.getByRole("tab", { name: /Tools/ }).click();
    await expect(page.locator("main ul li").first()).toBeVisible();
    await noSideways(page);
  });

  test("the menu button opens the section list in a side panel and navigates", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("navigation", { name: "Admin" })).toBeHidden(); // the sidebar is hidden on a phone
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/admin\/projects$/);
    await expect(page.getByRole("dialog")).toBeHidden(); // closes itself after choosing
  });

  test("the account menu holds sign out", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Account menu" }).first().click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("the editor toolbar wraps instead of overflowing", async ({ page }) => {
    await page.goto("/admin/posts/new");
    const toolbar = page.getByRole("toolbar", { name: "Formatting" });
    await expect(toolbar).toBeVisible();
    const box = await toolbar.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(390);
    await noSideways(page);
  });
});
