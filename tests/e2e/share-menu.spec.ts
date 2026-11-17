import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../support/fixtures";

// The Share menu's list loads on first hover, focus or click (see share-menu.tsx); it must behave like a normal menu. Desktop project only.
test.describe("the Share menu on a post", () => {
  for (const how of ["keyboard", "click"] as const) {
    test(`opens by ${how}, holds focus, and Escape closes it and returns focus`, async ({ visitor: page }) => {
      await page.goto("/blog/sync-without-fear");
      const share = page.getByRole("button", { name: "Share" });
      await expect(share).toHaveAttribute("aria-haspopup", "menu");
      await expect(share).toHaveAttribute("aria-expanded", "false");

      if (how === "keyboard") {
        await share.focus();
        await page.keyboard.press("Enter");
      } else {
        await share.click();
      }
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await expect(share).toHaveAttribute("aria-expanded", "true");
      await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="menu"]'))).toBe(true);

      const { violations } = await new AxeBuilder({ page }).include('[role="menu"]').withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await expect(share).toBeFocused();
      await expect(share).toHaveAttribute("aria-expanded", "false");
    });
  }
});
