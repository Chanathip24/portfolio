import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

test.describe.serial("time zone setting", () => {
  const stored = async () => (await service().from("app_settings").select("timezone").single()).data!.timezone as string | null;
  test.afterAll(async () => { await service().from("app_settings").update({ timezone: null }).eq("id", true); });

  test("the admin picks a time zone in Settings, it is kept, and Site default puts it back", async ({ page }) => {
    await page.goto("/admin/settings");
    const zone = page.getByRole("combobox", { name: "Time zone" });
    await expect(zone).toContainText("Site default");

    await zone.click();
    await page.getByRole("option", { name: /^Asia\/Tokyo/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Time zone saved." })).toBeVisible();
    expect(await stored()).toBe("Asia/Tokyo");

    await page.reload();
    await expect(page.getByRole("combobox", { name: "Time zone" })).toContainText("Asia/Tokyo");

    await page.getByRole("combobox", { name: "Time zone" }).click();
    await page.getByRole("option", { name: /^Site default/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Time zone saved." })).toBeVisible();
    expect(await stored()).toBeNull();
  });

  test("the charts still open with a time zone chosen", async ({ page }) => {
    await service().from("app_settings").update({ timezone: "America/New_York" }).eq("id", true);
    for (const path of ["/admin", "/admin/performance", "/admin/errors", "/admin/activity", "/admin/users"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.getByText(/something went wrong|could not/i)).toHaveCount(0);
    }
  });
});
