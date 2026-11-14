import { choose, expect, test } from "../support/fixtures";
import { service } from "../support/db";

const clean = async () => {
  const sb = service();
  await sb.from("posts").delete().like("slug", "e2e%");
  await sb.from("projects").delete().like("slug", "e2e%");
  await sb.from("skills").delete().like("name", "E2E%");
  await sb.from("post_categories").delete().like("slug", "e2e%");
  await sb.from("project_categories").delete().like("slug", "e2e%");
  await sb.from("skill_groups").delete().like("slug", "e2e%");
};

test.describe.serial("categories, work categories and skill groups", () => {
  test.beforeAll(clean);
  test.afterAll(clean);

  const open = async (page: import("@playwright/test").Page, tab: RegExp) => {
    await page.goto("/admin/categories");
    await page.getByRole("tab", { name: tab }).click();
  };
  const add = async (page: import("@playwright/test").Page, button: string, name: string) => {
    await page.getByRole("button", { name: button }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Name", { exact: true }).fill(name);
    await sheet.getByRole("button", { name: button }).click();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  };

  test("a blog category is added with a slug made from its name, and the slug is fixed afterwards", async ({ page }) => {
    await open(page, /Blog categories/);
    await add(page, "Add category", "E2E Notes");
    await expect(page.getByText("/blog?category=e2e-notes")).toBeVisible();
    await expect(page.getByText("0 posts").first()).toBeVisible();

    await page.getByRole("button", { name: "Edit E2E Notes" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByLabel("URL name")).toBeDisabled(); // locked on edit
    await sheet.getByLabel("Name", { exact: true }).fill("E2E Notes Renamed");
    await sheet.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("E2E Notes Renamed", { exact: true })).toBeVisible();
    await expect(page.getByText("/blog?category=e2e-notes")).toBeVisible(); // the slug did not move
  });

  test("a duplicate slug is refused", async ({ page }) => {
    await open(page, /Blog categories/);
    await page.getByRole("button", { name: "Add category" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Name", { exact: true }).fill("Another");
    await sheet.getByLabel("URL name").fill("engineering");
    await sheet.getByRole("button", { name: "Add category" }).click();
    await expect(sheet.getByText("Another item already uses this slug")).toBeVisible();
  });

  test("the new category is offered on posts, filters the public blog, and counts its posts", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await page.getByLabel("Title").fill("E2E Categorised Post");
    await choose(page, "Category", "E2E Notes Renamed");
    await choose(page, "Status", "Published");
    await page.getByRole("button", { name: "Create post" }).click();
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}$/);

    await page.goto("/blog");
    await expect(page.getByRole("tab", { name: /E2E Notes Renamed/ })).toBeVisible();
    await page.goto("/blog?category=e2e-notes");
    await expect(page.getByText("E2E Categorised Post").first()).toBeVisible();
    await expect(page.getByText("E2E Notes Renamed").first()).toBeVisible(); // the name, not the slug, is shown on the card

    await open(page, /Blog categories/);
    await expect(page.getByText("1 post", { exact: true })).toBeVisible();
  });

  test("a category in use cannot be deleted, and can once its posts are gone", async ({ page }) => {
    await open(page, /Blog categories/);
    await page.getByRole("button", { name: "Delete E2E Notes Renamed" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText("still used by posts");
    await page.getByRole("alertdialog").getByRole("button", { name: "Keep it" }).click();

    await service().from("posts").delete().like("slug", "e2e%");
    await page.reload();
    await page.getByRole("tab", { name: /Blog categories/ }).click();
    await page.getByRole("button", { name: "Delete E2E Notes Renamed" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("E2E Notes Renamed", { exact: true })).toHaveCount(0);
  });

  test("work categories: offered on projects and shown as a filter on the home page", async ({ page }) => {
    await open(page, /Work categories/);
    await add(page, "Add category", "E2E Work");
    await page.goto("/admin/projects/new");
    await page.getByLabel("Title").fill("E2E Categorised Project");
    await page.getByRole("button", { name: "E2E Work" }).click();
    await choose(page, "Status", "Published");
    await page.getByRole("button", { name: "Create project" }).click();
    await page.waitForURL(/\/admin\/projects\/[0-9a-f-]{36}$/);

    await page.goto("/");
    await expect(page.getByRole("tab", { name: /E2E Work/ })).toBeAttached();
    await page.goto("/work/e2e-categorised-project");
    await expect(page.getByText("E2E Work").first()).toBeVisible();

    await open(page, /Work categories/);
    await page.getByRole("button", { name: "Delete E2E Work" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText("still used by projects");
  });

  test("skill groups: a skill is filed in a new group, and the About page shows the group", async ({ page }) => {
    await open(page, /Skill groups/);
    await add(page, "Add group", "E2E Group");
    await page.goto("/admin/about");
    await page.getByRole("button", { name: "Add skill" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Skill").fill("E2E Grouped Skill");
    await choose(page, "Group", "E2E Group");
    await sheet.getByRole("button", { name: "Add skill" }).click();
    await expect(page.getByRole("heading", { name: /E2E Group/ })).toBeVisible(); // the list is split under its group
    await page.goto("/about");
    await expect(page.getByRole("tab", { name: /E2E Group/ })).toBeVisible();

    await open(page, /Skill groups/);
    await page.getByRole("button", { name: "Delete E2E Group" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText("still used by skills");
  });
});
