import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const setting = (on: boolean) => service().from("app_settings").update({ data_tools_enabled: on }).eq("id", true);

test.describe.serial("settings, data and media", () => {
  test.beforeAll(() => setting(false));
  test.afterAll(() => setting(false));

  test("the data tools are off by default: not in the menu, and the pages say so", async ({ page }) => {
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Data" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Media" })).toHaveCount(0);
    for (const path of ["/admin/data", "/admin/media"]) {
      await page.goto(path);
      await expect(page.getByText("Data tools are switched off")).toBeVisible();
      await expect(page.getByRole("link", { name: "Open settings" })).toHaveAttribute("href", "/admin/settings");
    }
  });

  test("turning them on in Settings adds Data and Media to the menu", async ({ page }) => {
    await page.goto("/admin/settings");
    const toggle = page.getByRole("switch", { name: "Show Data and Media in the menu" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(page.getByRole("status").filter({ hasText: "Data and Media are on." })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Show Data and Media in the menu" })).toHaveAttribute("aria-checked", "true");
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Data" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Media" })).toBeVisible();
  });

  test("the setting change is in the activity log", async () => {
    const { data } = await service().from("audit_log").select("entity,action").eq("entity", "app_settings").order("id", { ascending: false }).limit(1);
    expect(data?.[0]).toMatchObject({ entity: "app_settings", action: "updated" });
  });

  test("Data: tables are listed, rows are shown read-only, and only known tables are reachable", async ({ page }) => {
    await page.goto("/admin/data");
    await expect(page.getByRole("navigation", { name: "Tables" }).getByRole("link", { name: "posts", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("status")).toContainText(/\d+ rows? in posts/);
    expect(await page.locator("tbody tr").count()).toBeGreaterThan(5);
    await page.locator("tbody tr").first().getByText("Show JSON").click();
    await expect(page.locator("tbody tr").first().locator("pre")).toContainText('"slug"');

    await page.getByRole("link", { name: "audit_log", exact: true }).click();
    await expect(page).toHaveURL(/table=audit_log/);
    await expect(page.getByRole("columnheader", { name: "actor_email" })).toBeVisible();

    // anything not on the list falls back to posts: the auth tables are never reachable through here
    for (const table of ["users", "auth.users", "admins", "..%2Fauth"]) {
      await page.goto(`/admin/data?table=${table}`);
      await expect(page.getByRole("status")).toContainText("in posts");
    }
    await expect(page.getByRole("button", { name: /edit|delete|save/i })).toHaveCount(0); // nothing here writes
  });

  test("Data pages through a big table", async ({ page }) => {
    const { count } = await service().from("page_views").select("id", { count: "exact", head: true });
    test.skip((count ?? 0) <= 25, "page_views is shorter than a page");
    await page.goto("/admin/data?table=page_views");
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
  });

  test("Media: upload, see it, copy its address, delete it", async ({ page }) => {
    await page.goto("/admin/media");
    await expect(page.getByRole("status")).toContainText(/files?./); // the library has loaded
    await page.waitForLoadState("networkidle");
    const tiles = page.locator("main ul li:has(img)");
    const before = await tiles.count();
    await page.getByLabel("Choose images").setInputFiles({ name: "e2e-media.png", mimeType: "image/png", buffer: PNG });
    await expect.poll(() => tiles.count()).toBe(before + 1);
    const newest = tiles.first();
    await expect(newest.locator("img")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/media\//);
    await newest.getByRole("button", { name: /^Copy address of/ }).click();
    await expect(page.getByText("Copied", { exact: true }).first()).toBeVisible(); // the tooltip confirms it

    await newest.getByRole("button", { name: /^Delete / }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect.poll(() => tiles.count()).toBe(before);
  });

  test("Media refuses what is not an image", async ({ page }) => {
    await page.goto("/admin/media");
    await page.waitForLoadState("networkidle"); // the page is interactive: a file chosen before that is ignored
    await page.getByLabel("Choose images").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByRole("status")).toContainText("Use a PNG, JPG, WebP, GIF or AVIF image.");
  });

  test("turning them off again removes them", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByRole("switch", { name: "Show Data and Media in the menu" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Data and Media are off." })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Data" })).toHaveCount(0);
  });
});
