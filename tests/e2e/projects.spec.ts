import { choose, expect, test } from "../support/fixtures";
import { service } from "../support/db";

test.describe.serial("projects in the admin", () => {
  const title = `E2E Project ${Math.random().toString(36).slice(2, 7)}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const marker = `lynx-${Math.random().toString(36).slice(2, 8)}`;
  let editUrl = "";

  test.afterAll(async () => { await service().from("projects").delete().like("slug", "e2e%"); });

  test("the list shows every project with its layout and can be filtered", async ({ page }) => {
    await page.goto("/admin/projects");
    expect(await page.locator("tbody tr").count()).toBeGreaterThanOrEqual(10);
    await expect(page.locator("tbody").getByText("Signature").first()).toBeVisible();
    await page.getByRole("searchbox", { name: "Search projects" }).fill("tidewater");
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("a project is created with categories and a page body, and goes live", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Client").fill("Test Co");
    await choose(page, "Status", "Published");
    await page.getByRole("button", { name: "Payments" }).click();
    await expect(page.getByRole("button", { name: "Payments" })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Summary").fill("A project made by the tests.");
    await page.locator(".ProseMirror").click();
    await page.keyboard.type(`Project body ${marker}.`);
    await page.getByRole("button", { name: "Create project" }).click();
    await page.waitForURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
    editUrl = page.url();

    const response = await page.goto(`/work/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText(marker).first()).toBeVisible();
  });

  test("making it a signature project puts it on the home page", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole("switch", { name: "Signature project" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Saved\.$/ })).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(title).first()).toBeAttached();
  });

  test("a link that is not http(s) is refused", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByLabel("Live site").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Use https://… or a /path")).toBeVisible();
    await page.getByLabel("Live site").fill("");
  });

  test("deleting removes it from the site", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole("button", { name: /^Delete / }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForURL("**/admin/projects");
    await page.goto(`/work/${slug}`);
    await expect(page.getByText(marker)).toHaveCount(0);
  });
});
