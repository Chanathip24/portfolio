import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test.describe.serial("tools and their logos", () => {
  test.afterAll(async () => { await service().from("tools").delete().like("name", "E2E%"); });

  test("tools are shown as tiles with a preview of their mark", async ({ page }) => {
    await page.goto("/admin/about");
    await page.getByRole("tab", { name: /Tools/ }).click();
    const tiles = page.locator("main ul li").filter({ has: page.getByRole("button", { name: /^Edit / }) });
    expect(await tiles.count()).toBeGreaterThanOrEqual(10);
    await expect(page.getByText("Built-in icon").first()).toBeVisible();
    await expect(tiles.first().locator("svg").first()).toBeVisible(); // the built-in icon is drawn
  });

  test("a tool is added with an uploaded logo, which previews in the form and in the tile", async ({ page }) => {
    await page.goto("/admin/about");
    await page.getByRole("tab", { name: /Tools/ }).click();
    await page.getByRole("button", { name: "Add tool" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Name", { exact: true }).fill("E2E Logo Tool");
    await sheet.locator("input[type=file]").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await expect(sheet.getByPlaceholder("Paste an image address, or upload")).toHaveValue(/\/storage\/v1\/object\/public\/media\//);
    await expect(sheet.locator("img").first()).toBeVisible(); // preview
    await sheet.getByRole("button", { name: "Add tool" }).click();

    const tile = page.locator("li").filter({ hasText: "E2E Logo Tool" });
    await expect(tile).toContainText("Custom logo");
    await expect(tile.locator("img")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/media\//);
  });

  test("the About page shows the logo", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("img[src*='/storage/v1/object/public/media/']").first()).toBeAttached();
    await expect(page.getByText("E2E Logo Tool").first()).toBeAttached();
  });

  test("a tool with neither logo nor icon shows its initials, and an unsafe logo address is refused", async ({ page }) => {
    await page.goto("/admin/about");
    await page.getByRole("tab", { name: /Tools/ }).click();
    await page.getByRole("button", { name: "Add tool" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Name", { exact: true }).fill("E2E Plain");
    await sheet.getByPlaceholder("Paste an image address, or upload").fill("javascript:alert(1)");
    await sheet.getByRole("button", { name: "Add tool" }).click();
    await expect(sheet.getByText("Use https://… or a /path")).toBeVisible();
    await sheet.getByPlaceholder("Paste an image address, or upload").fill("");
    await sheet.getByRole("button", { name: "Add tool" }).click();
    const tile = page.locator("li").filter({ hasText: "E2E Plain" });
    await expect(tile).toContainText("Initials");
    await expect(tile).toContainText("E2"); // the first two letters
  });

  test("removing the logo falls back; deleting removes the tool", async ({ page }) => {
    await page.goto("/admin/about");
    await page.getByRole("tab", { name: /Tools/ }).click();
    await page.getByRole("button", { name: "Edit E2E Logo Tool" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "Remove" }).click();
    await sheet.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("li").filter({ hasText: "E2E Logo Tool" })).toContainText("Initials");

    for (const name of ["E2E Logo Tool", "E2E Plain"]) {
      await page.getByRole("button", { name: `Delete ${name}` }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    }
  });
});
