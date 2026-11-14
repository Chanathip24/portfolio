import { expect, test } from "@playwright/experimental-ct-react";
import { SelectHarness } from "./harness";

test.describe("OptionSelect (shadcn Select)", () => {
  test("shows the label of the current value, not the raw value", async ({ mount }) => {
    const c = await mount(<SelectHarness initial="design" />);
    await expect(c.getByRole("combobox", { name: "Category" })).toContainText("Design");
    await expect(c.getByTestId("value")).toHaveText("design");
  });

  test("opens a list of every option and chooses with the mouse", async ({ mount, page }) => {
    const c = await mount(<SelectHarness />);
    await c.getByRole("combobox").click();
    await expect(page.getByRole("option")).toHaveCount(3);
    await page.getByRole("option", { name: "Data", exact: true }).click();
    await expect(c.getByRole("combobox")).toContainText("Data");
    await expect(c.getByTestId("value")).toHaveText("data");
    await expect(page.getByRole("option")).toHaveCount(0); // closed again
  });

  test("works from the keyboard: arrows move, Enter chooses, Escape closes without changing", async ({ mount, page }) => {
    const c = await mount(<SelectHarness />);
    const box = c.getByRole("combobox");
    await box.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(c.getByTestId("value")).not.toHaveText("engineering");
    const chosen = await c.getByTestId("value").textContent();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(c.getByTestId("value")).toHaveText(chosen!);
  });

  test("is 40px tall and marks itself invalid when asked", async ({ mount }) => {
    const c = await mount(<SelectHarness invalid />);
    const box = c.getByRole("combobox");
    expect((await box.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    await expect(box).toHaveAttribute("aria-invalid", "true");
  });

  test("the chosen option is marked in the open list", async ({ mount, page }) => {
    const c = await mount(<SelectHarness initial="design" />);
    await c.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Design", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("option", { name: "Data", exact: true })).toHaveAttribute("aria-selected", "false");
  });
});
