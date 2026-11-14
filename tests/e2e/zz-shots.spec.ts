import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

const OUT = "C:/Users/chana/AppData/Local/Temp/claude/f7d8e4258d552e64/40ec3097-5900-40de-a9d2-9b67dd543e0b/scratchpad/pw/";

test("screenshots of the new admin", async ({ page }) => {
  test.setTimeout(180_000);
  // make a bit of activity first
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "Add category" }).first().click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("E2E Notes");
  await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
  await expect(page.getByText("E2E Notes").first()).toBeVisible();
  await service().from("app_settings").update({ data_tools_enabled: true }).eq("id", true);

  const shot = async (name: string, path: string, full = true) => {
    await page.goto(path);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}n-${name}.png`, fullPage: full });
  };
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const [n, p] of [["overview", "/admin"], ["posts", "/admin/posts"], ["post-edit", "/admin/posts/new"], ["categories", "/admin/categories"], ["about", "/admin/about"], ["users", "/admin/users"], ["account", "/admin/account"], ["settings", "/admin/settings"], ["data", "/admin/data"], ["media", "/admin/media"], ["activity", "/admin/activity"], ["inbox", "/admin/inbox"], ["performance", "/admin/performance"]] as const) await shot(n, p);
  await page.goto("/admin/about"); await page.getByRole("tab", { name: /Tools/ }).click(); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}n-about-tools.png`, fullPage: true });
  await page.getByRole("tab", { name: /Career/ }).click(); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}n-about-career.png`, fullPage: true });
  await page.getByRole("tab", { name: /Testimonials/ }).click(); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}n-about-quotes.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [n, p] of [["m-overview", "/admin"], ["m-posts", "/admin/posts"], ["m-users", "/admin/users"], ["m-post-edit", "/admin/posts/new"]] as const) await shot(n, p);
  await service().from("app_settings").update({ data_tools_enabled: false }).eq("id", true);
  await service().from("post_categories").delete().like("slug", "e2e%");
});
