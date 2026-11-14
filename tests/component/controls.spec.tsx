import { expect, test } from "@playwright/experimental-ct-react";
import { ControlsHarness } from "./harness";

test.describe("form controls (Input, Textarea, Tip)", () => {
  test("an Input is 40px tall and shows its placeholder", async ({ mount }) => {
    const c = await mount(<ControlsHarness />);
    const input = c.getByRole("textbox", { name: "Name" });
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    await expect(input).toHaveAttribute("placeholder", "Your name");
  });

  test("a Textarea cannot be dragged to resize, but grows with its text", async ({ mount }) => {
    const c = await mount(<ControlsHarness />);
    const area = c.getByRole("textbox", { name: "About" });
    expect(await area.evaluate((el) => getComputedStyle(el).resize)).toBe("none");
    const before = (await area.boundingBox())!.height;
    await area.fill(Array.from({ length: 12 }, (_, i) => `line ${i}`).join("\n"));
    expect((await area.boundingBox())!.height).toBeGreaterThan(before);
  });

  test("a Tip shows its label on hover and on keyboard focus", async ({ mount, page }) => {
    const c = await mount(<ControlsHarness />);
    await c.getByRole("button", { name: "Hello" }).hover();
    await expect(page.getByText("Say hello")).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.getByText("Say hello")).toBeHidden();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByText("Say hello")).toBeVisible();
  });
});
