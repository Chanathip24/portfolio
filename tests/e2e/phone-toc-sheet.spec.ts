import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../support/fixtures";

// The contents sheet loads on first hover, focus or tap (see mobile-toc.tsx); it must behave like a normal dialog. Phone project.
test.describe("the contents sheet on a phone", () => {
  for (const how of ["keyboard", "tap"] as const) {
    test(`opens by ${how}, holds focus, and Escape closes it and returns focus`, async ({ visitor: page }) => {
      await page.goto("/blog/money-is-an-integer");
      await page.getByRole("button", { name: "OK", exact: true }).tap(); // the privacy notice sits where the button appears
      await page.evaluate(() => window.scrollTo(0, 900));
      const toc = page.locator("button[aria-haspopup=dialog]"); // by attribute: while the sheet is open the page behind it is hidden from role queries
      await expect(toc).toHaveAttribute("tabindex", "0");
      await expect(toc).toHaveAttribute("aria-haspopup", "dialog");
      await expect(toc).toHaveAttribute("aria-expanded", "false");

      if (how === "keyboard") {
        await toc.focus();
        await page.keyboard.press("Enter");
      } else {
        await toc.tap();
      }
      const sheet = page.getByRole("dialog", { name: "On this page" });
      await expect(sheet).toBeVisible();
      await expect(toc).toHaveAttribute("aria-expanded", "true");
      await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);

      const { violations } = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await expect(toc).toBeFocused();
      await expect(toc).toHaveAttribute("aria-expanded", "false");
    });
  }
});
