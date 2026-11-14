import { choose, expect, test } from "../support/fixtures";
import { service } from "../support/db";

// A post is created once and then edited, hidden, broken on purpose and deleted, so these tests run in order.
test.describe.serial("blog posts in the admin", () => {
  const title = `E2E Post ${Math.random().toString(36).slice(2, 7)}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const marker = `zebra-${Math.random().toString(36).slice(2, 8)}`;
  let editUrl = "";

  test.afterAll(async () => { await service().from("posts").delete().like("slug", "e2e%"); });

  test("the list shows the posts and can be searched and filtered", async ({ page }) => {
    await page.goto("/admin/posts");
    expect(await page.locator("tbody tr").count()).toBeGreaterThanOrEqual(10);
    const search = page.getByRole("searchbox", { name: "Search posts" });
    await search.fill("empty states");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await search.fill("zzzz-no-match");
    await expect(page.getByText("No posts match that.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await choose(page, "Filter by visibility", "Draft");
    await expect(page.locator("tbody")).toContainText("Draft");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await choose(page, "Filter by visibility", "Everything");
  });

  test("a post is created with a cover image, a heading, bold text and a link", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await page.getByLabel("Title").fill(title);
    await choose(page, "Status", "Published");
    await page.getByLabel("Excerpt").fill("Written by the end-to-end tests.");

    await page.getByRole("region", { name: "Cover image" }).locator("input[type=file]").setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
    });
    await expect(page.getByPlaceholder("Paste an image address, or upload")).toHaveValue(/\/storage\/v1\/object\/public\/media\//);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.getByRole("button", { name: "Heading", exact: true }).click();
    await page.keyboard.type("A heading from the editor");
    await page.keyboard.press("Enter");
    await page.keyboard.type(`Body text with a marker ${marker}.`);
    await page.getByRole("button", { name: "Bold" }).click();
    await page.keyboard.type(" Bold bit.");

    // links go through an inline bar and only safe addresses are accepted
    await page.keyboard.press("Control+A");
    await page.getByRole("button", { name: "Link", exact: true }).click();
    await page.getByRole("textbox", { name: "Link address" }).fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Apply link" }).click();
    await expect(page.getByText("Links must start with")).toBeVisible();
    await page.getByRole("textbox", { name: "Link address" }).fill("https://example.com/");
    await page.getByRole("button", { name: "Apply link" }).click();
    await expect(page.locator(".ProseMirror a[href='https://example.com/']").first()).toBeVisible();

    await page.getByRole("button", { name: "Create post" }).click();
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
    editUrl = page.url();
  });

  test("the new post is live, with a working contents list", async ({ page }) => {
    const response = await page.goto(`/blog/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator(".rich h2", { hasText: "A heading from the editor" })).toHaveCount(1);
    await expect(page.locator(".rich strong").first()).toBeVisible();
    await expect(page.getByText(marker).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "A heading from the editor" }).first()).toBeVisible(); // "On this page"
    await page.goto("/blog");
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test("editing saves, shows on the site, and keeps the headings' levels", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByLabel("Title").fill(`${title} edited`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Saved\.$/ })).toBeVisible();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByText(`${title} edited`).first()).toBeVisible();
    await expect(page.locator(".rich h2")).toHaveCount(1); // still an h2: attrs survived the round trip through the editor
  });

  test("a draft is taken off the site", async ({ page }) => {
    await page.goto(editUrl);
    await choose(page, "Status", "Draft");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Saved\.$/ })).toBeVisible();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByText(marker)).toHaveCount(0);
  });

  test("a bad or duplicate slug is refused with a message on the field", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByLabel("URL slug").fill("Bad Slug!");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Lower-case words separated by dashes")).toBeVisible();
    await page.getByLabel("URL slug").fill("sync-without-fear");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Another item already uses this slug")).toBeVisible();
  });

  test("deleting asks first, then removes the post", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole("button", { name: /^Delete / }).first().click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("can't be undone");
    await dialog.getByRole("button", { name: "Keep it" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: /^Delete / }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForURL("**/admin/posts");
    await expect(page.getByRole("cell", { name: `${title} edited` })).toHaveCount(0);
  });
});
