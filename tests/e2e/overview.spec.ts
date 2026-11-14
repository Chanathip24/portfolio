import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

test.describe.serial("overview and activity", () => {
  test.afterAll(async () => { await service().from("post_categories").delete().like("slug", "e2e%"); });

  test("the dashboard shows page views, content, activity, admins and traffic", async ({ page }) => {
    await page.goto("/admin");
    for (const name of ["Page views", "Content", "Recent activity", "Admins", "Where the traffic goes"]) await expect(page.getByRole("region", { name })).toBeVisible();
    await expect(page.getByRole("region", { name: "Page views" }).getByRole("link", { name: "30 days" })).toHaveAttribute("aria-current", "page");
  });

  test("the content card matches what visitors can see, scheduled items included", async ({ page }) => {
    const now = Date.now();
    const rows = (await service().from("posts").select("status,published_at")).data!;
    const live = rows.filter((r) => r.status === "published" && new Date(r.published_at).getTime() <= now).length;
    const drafts = rows.filter((r) => r.status === "draft").length;
    await page.goto("/admin");
    const posts = page.getByRole("region", { name: "Content" });
    await expect(posts).toContainText(`Blog posts · ${rows.length}`);
    await expect(posts.getByText(`${live} live`).first()).toBeVisible();
    await expect(posts.getByText(`${drafts} draft`).first()).toBeVisible();
  });

  test("the admins card lists the admins, marks you, and shows whether two-step is on", async ({ page, admin }) => {
    await page.goto("/admin");
    const card = page.getByRole("region", { name: "Admins" });
    const mine = card.getByRole("listitem").filter({ hasText: admin.email });
    await expect(mine).toContainText("You");
    await expect(mine).toContainText("2-step on");
    await expect(mine).toContainText(/Active (just now|\d+ min ago)/);
    await expect(card.getByRole("link", { name: "Manage" })).toHaveAttribute("href", "/admin/users");
  });

  test("a change shows up in recent activity with who made it, and on the full Activity page", async ({ page, admin }) => {
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "Add category" }).first().click();
    await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("E2E Activity");
    await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText("E2E Activity", { exact: true })).toBeVisible();

    await page.goto("/admin");
    const feed = page.getByRole("region", { name: "Recent activity" });
    const entry = feed.getByRole("listitem").first();
    await expect(entry).toContainText(admin.email);
    await expect(entry).toContainText("created the blog category");
    await expect(entry).toContainText("E2E Activity");
    await expect(entry).toContainText("just now");

    await feed.getByRole("link", { name: "View all" }).click();
    await expect(page).toHaveURL(/\/admin\/activity$/);
    await expect(page.getByRole("heading", { name: "Activity", exact: true })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "E2E Activity" }).first()).toBeVisible();
  });

  test("editing and deleting are logged too", async ({ page }) => {
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "Edit E2E Activity" }).click();
    await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("E2E Activity Two");
    await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("E2E Activity Two", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Delete E2E Activity Two" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();

    await page.goto("/admin/activity");
    const items = page.getByRole("listitem");
    await expect(items.filter({ hasText: "deleted the blog category" }).first()).toContainText("E2E Activity Two");
    await expect(items.filter({ hasText: "updated the blog category" }).first()).toContainText("E2E Activity Two");
  });

  test("the activity page pages through a long log", async ({ page }) => {
    const { count } = await service().from("audit_log").select("id", { count: "exact", head: true });
    test.skip((count ?? 0) <= 25, "the log is shorter than one page");
    await page.goto("/admin/activity");
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    await page.getByRole("link", { name: "Older" }).click();
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
  });
});
