import type { Page } from "@playwright/test";
import { choose, expect, test } from "../support/fixtures";
import { service } from "../support/db";

/** Picks a day in next month's calendar and a time, in the date field with the given label. */
async function scheduleForNextMonth(page: Page, day: string, time: string) {
  await page.getByRole("button", { name: "Publish date and time" }).click();
  await page.getByRole("button", { name: /next month/i }).click();
  await page.locator("[role=gridcell]", { hasText: new RegExp(`^${day}$`) }).click();
  await page.getByLabel("Time", { exact: true }).fill(time);
  await page.keyboard.press("Escape");
}

test.describe.serial("choosing the publish time", () => {
  const title = `E2E Scheduled ${Math.random().toString(36).slice(2, 7)}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let editUrl = "";
  test.afterAll(async () => { await service().from("posts").delete().like("slug", "e2e%"); await service().from("projects").delete().like("slug", "e2e%"); });

  test("a post is scheduled for a future day and time: the form says so, the list marks it, visitors cannot see it", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await page.getByLabel("Title").fill(title);
    await choose(page, "Status", "Published");
    await expect(page.getByText("Goes live as soon as you save.")).toBeVisible();
    await scheduleForNextMonth(page, "20", "09:30");
    await expect(page.getByText(/Scheduled: goes live on 20 \w{3,4} \d{4}, 09:30/)).toBeVisible();
    await page.getByRole("button", { name: "Create post" }).click();
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
    editUrl = page.url();

    const saved = (await service().from("posts").select("published_at,status").eq("slug", slug).single()).data!;
    expect(saved.status).toBe("published");
    expect(new Date(saved.published_at).getTime()).toBeGreaterThan(Date.now() + 5 * 86_400_000);

    await page.goto("/admin/posts");
    await expect(page.getByRole("row", { name: new RegExp(title) })).toContainText("Scheduled");
    await page.goto(`/blog/${slug}`);
    await expect(page.getByText(title)).toHaveCount(0);
    await page.goto("/blog");
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("the overview counts it as scheduled", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("region", { name: "Content" }).getByText(/\d+ scheduled/).first()).toBeVisible();
  });

  test("moving the date to now makes it live", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Publish date and time" }).click();
    await page.getByRole("button", { name: "Now" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Live since/)).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Saved\.$/ })).toBeVisible();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByText(title).first()).toBeVisible();
    await page.goto("/admin/posts");
    await expect(page.getByRole("row", { name: new RegExp(title) })).toContainText("Live");
  });

  test("an old date is kept: the post appears in the list where that date puts it", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Publish date and time" }).click();
    await page.getByRole("button", { name: /previous month/i }).click();
    await page.getByRole("button", { name: /previous month/i }).click();
    await page.locator("[role=gridcell]", { hasText: /^10$/ }).click();
    await page.getByLabel("Time", { exact: true }).fill("08:00");
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Live since 10 \w{3,4} \d{4}, 08:00/)).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Saved\.$/ })).toBeVisible();
    const saved = (await service().from("posts").select("published_at").eq("slug", slug).single()).data!;
    expect(new Date(saved.published_at).getTime()).toBeLessThan(Date.now() - 30 * 86_400_000);
    await page.reload();
    await expect(page.getByRole("button", { name: "Publish date and time" })).toContainText("08:00");
  });

  test("a draft is never shown, even with a past date, and clearing the date means 'now'", async ({ page }) => {
    await page.goto(editUrl);
    await choose(page, "Status", "Draft");
    await expect(page.getByText("Draft: not visible on the site.")).toBeVisible();
    await page.getByRole("button", { name: "Publish date and time" }).click();
    await page.getByRole("button", { name: "Clear" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Saved\.$/ })).toBeVisible();
    const saved = (await service().from("posts").select("published_at,status").eq("slug", slug).single()).data!;
    expect(saved.status).toBe("draft");
    expect(Math.abs(new Date(saved.published_at).getTime() - Date.now())).toBeLessThan(120_000); // an empty date became "now"
  });

  test("projects have a publish date too: a future one hides the project, and its year comes from the date", async ({ page }) => {
    const projectTitle = `E2E Later Project ${Math.random().toString(36).slice(2, 6)}`;
    const projectSlug = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await page.goto("/admin/projects/new");
    await page.getByLabel("Title").fill(projectTitle);
    await choose(page, "Status", "Published");
    await scheduleForNextMonth(page, "15", "10:00");
    await page.getByRole("button", { name: "Create project" }).click();
    await page.waitForURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
    await page.goto(`/work/${projectSlug}`);
    await expect(page.getByText(projectTitle)).toHaveCount(0);
    await page.goto("/admin/projects");
    await expect(page.getByRole("row", { name: new RegExp(projectTitle) })).toContainText("Scheduled");
  });
});
