import { choose, expect, test } from "../support/fixtures";
import { service } from "../support/db";

test.describe.serial("profile and About page lists", () => {
  let originalHeadline = "";

  test.beforeAll(async () => {
    const { data } = await service().from("profile").select("headline").limit(1).single();
    originalHeadline = data?.headline ?? "";
  });
  test.afterAll(async () => {
    await service().from("profile").update({ headline: originalHeadline }).neq("display_name", "");
    await service().from("socials").delete().like("label", "E2E%");
    await service().from("skills").delete().like("name", "E2E%");
    await service().from("career").delete().like("role", "E2E%");
  });

  test("the profile headline is saved and appears on the About page", async ({ page }) => {
    await page.goto("/admin/profile");
    const headline = `Edited by the tests ${Date.now()}`;
    await page.getByLabel("Headline").fill(headline);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Saved\.$/ })).toBeVisible();
    await page.goto("/about");
    await expect(page.getByText(headline).first()).toBeVisible();
  });

  test("a social link: unsafe addresses are refused, a good one is added and removed", async ({ page }) => {
    await page.goto("/admin/profile");
    await page.getByRole("button", { name: "Add link" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Label").fill("E2E link");
    await sheet.getByLabel("Handle").fill("@e2e");
    await sheet.getByLabel("Link").fill("javascript:alert(1)");
    await sheet.getByRole("button", { name: "Add link" }).click();
    await expect(sheet.getByText(/Use https/)).toBeVisible();
    await sheet.getByLabel("Link").fill("https://example.com/e2e");
    await sheet.getByRole("button", { name: "Add link" }).click();
    await expect(page.getByText("E2E link", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete E2E link" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("E2E link", { exact: true })).toHaveCount(0);
  });

  test("a skill is added with a Select for its years and shows on the About page", async ({ page }) => {
    await page.goto("/admin/about");
    await page.getByRole("button", { name: "Add skill" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Skill").fill("E2E Skill");
    await choose(page, "Experience", "3 years");
    await sheet.getByRole("button", { name: "Add skill" }).click();
    await expect(page.getByText("E2E Skill", { exact: true })).toBeVisible();
    await page.goto("/about");
    await expect(page.getByText("E2E Skill").first()).toBeAttached();
  });

  test("a career entry can be marked as current with the Present option", async ({ page }) => {
    await page.goto("/admin/about");
    await page.getByRole("tab", { name: /Career/ }).click();
    await page.getByRole("button", { name: "Add role" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Role or degree").fill("E2E Role");
    await sheet.getByLabel("Organisation").fill("E2E Org");
    await choose(page, "Start year", "2021");
    await choose(page, "End year", "Present (still there)");
    await sheet.getByRole("button", { name: "Add role" }).click();
    await expect(page.getByText("E2E Role, E2E Org")).toBeVisible();
    await expect(page.getByText(/2021–now/)).toBeVisible();
    const { data } = await service().from("career").select("end_year").eq("role", "E2E Role").single();
    expect(data?.end_year).toBeNull();
  });

  test("the four About tabs switch", async ({ page }) => {
    await page.goto("/admin/about");
    for (const tab of [/Tools/, /Career/, /Testimonials/, /Skills/]) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    }
  });
});
