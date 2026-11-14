import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

const rand = () => Math.random().toString(36).slice(2, 7);

test.describe("charts and insights", () => {
  test("the overview says how many admins and users there are", async ({ page }) => {
    await page.goto("/admin");
    const people = page.getByRole("region", { name: "People" });
    await expect(people).toBeVisible();
    for (const label of ["Accounts", "Admins", "Users", "Blocked"]) await expect(people.getByText(label, { exact: true })).toBeVisible();
    await expect(people.locator("[data-slot=chart]")).toBeVisible(); // the roles ring
    const { data } = await service().from("admins").select("user_id");
    const admins = people.locator("dt", { hasText: "Admins" }).locator("xpath=following-sibling::dd[1]");
    await expect(admins).toHaveText(String(data!.length));
  });

  test("the users page shows sign-ups and the admin/user split, and Add user opens a side sheet", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("region", { name: "New accounts" }).locator("[data-slot=chart]")).toBeVisible();
    await expect(page.getByRole("region", { name: "Admins and users" }).locator("[data-slot=chart]")).toBeVisible();
    await page.getByRole("button", { name: "Add user" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toHaveAttribute("data-slot", "sheet-content");
    await sheet.getByRole("button", { name: "Cancel" }).click();
    await expect(sheet).toBeHidden();
  });

  test("the activity page has charts, filters and three views", async ({ page }) => {
    const name = `E2E Insight ${rand()}`;
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "Add category" }).first().click();
    await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill(name);
    await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    await page.goto("/admin/activity");
    for (const t of ["Activity over time", "What kind", "Busiest areas", "Most active people"]) await expect(page.getByRole("region", { name: t })).toBeVisible();
    await expect(page.getByRole("region", { name: "Timeline" })).toContainText(name);

    // text search narrows the log and lives in the address
    await page.getByRole("searchbox", { name: "Search activity" }).fill(name);
    await expect(page).toHaveURL(/q=E2E/);
    await expect(page.getByRole("status").filter({ hasText: "matching" })).toContainText("1 matching");

    // a filter that matches nothing, then clear
    await page.getByRole("combobox", { name: "Filter by action" }).click();
    await page.getByRole("option", { name: "Deleted" }).click();
    await expect(page.getByText("Nothing matches those filters.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).not.toHaveURL(/q=|action=/);

    // the table and by-day views
    await page.getByRole("link", { name: "Table", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: /When/ })).toHaveAttribute("aria-sort", "descending");
    await expect(page.getByRole("row").filter({ hasText: name })).toContainText("created");
    await page.getByRole("link", { name: "By day" }).click();
    await expect(page.getByRole("link", { name: "By day" })).toHaveAttribute("aria-current", "page");

    // a date range in the future shows nothing
    await page.getByLabel("From date").fill("2999-01-01");
    await expect(page.getByText("Nothing matches those filters.")).toBeVisible();
    await service().from("post_categories").delete().like("name", "E2E Insight%");
  });

  test("the posts page shows analytics; a title opens that post's analytics and Edit has a preview", async ({ page }) => {
    const slug = `e2e-insight-${rand()}`;
    const db = service();
    const author = (await db.from("authors").select("id").limit(1).single()).data!.id;
    const cat = (await db.from("post_categories").select("slug").limit(1).single()).data!.slug;
    const { data: post, error } = await db.from("posts").insert({
      slug, title: `E2E Insight Post ${slug}`, excerpt: "A short summary for the preview.", author_id: author, category: cat, status: "published",
      published_at: new Date(Date.now() - 864e5).toISOString(),
      body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Body text for the preview." }] }] },
    }).select("id").single();
    if (error) throw error;
    await db.from("page_views").insert([1, 2, 3].map((n) => ({ path: `/blog/${slug}`, visitor: `e2e-v${n}`, referrer: "https://example.org/" })));

    await page.goto("/admin/posts");
    await expect(page.getByRole("region", { name: "Post views" }).locator("[data-slot=chart]")).toBeVisible();
    await expect(page.getByRole("region", { name: "Live posts by category" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Most read" })).toContainText(slug); // the chart names a post by its address

    // clicking the title goes to this post's analytics
    await page.getByRole("searchbox", { name: "Search posts" }).fill(slug);
    await page.getByRole("link", { name: `E2E Insight Post ${slug}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/posts/${post!.id}/stats$`));
    const dt = page.locator("dt", { hasText: "Views, 30 days" });
    await expect(dt.locator("xpath=following-sibling::dd[1]").first()).toHaveText("3");
    await expect(page.getByRole("region", { name: "Views" }).locator("[data-slot=chart]")).toBeVisible();
    await expect(page.getByRole("region", { name: "Where readers come from" })).toContainText("example.org");

    // Edit goes to the editor, whose Preview tab shows what visitors will see, including unsaved changes
    await page.getByRole("link", { name: "Edit and preview" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/posts/${post!.id}$`));
    await page.getByLabel("Title").fill("Changed but not saved");
    await page.getByRole("tab", { name: "preview" }).click();
    const preview = page.getByRole("region", { name: "Preview of the post" });
    await expect(preview.getByRole("heading", { name: "Changed but not saved" })).toBeVisible();
    await expect(preview).toContainText("A short summary for the preview.");
    await expect(preview).toContainText("Body text for the preview.");
    await page.getByRole("tab", { name: "edit" }).click();
    await expect(page.getByLabel("Title")).toHaveValue("Changed but not saved");

    await db.from("posts").delete().eq("slug", slug);
    await db.from("page_views").delete().like("visitor", "e2e-v%");
  });
});
