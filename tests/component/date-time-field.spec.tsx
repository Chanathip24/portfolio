import { expect, test } from "@playwright/experimental-ct-react";
import { DateHarness } from "./harness";

test.describe("DateTimeField (shadcn Calendar in a Popover)", () => {
  test("starts empty with a prompt on the button", async ({ mount }) => {
    const c = await mount(<DateHarness />);
    await expect(c.getByRole("button", { name: "Publish date" })).toContainText("Pick a date and time");
    await expect(c.getByTestId("value")).toHaveText("");
  });

  test("choosing a day changes the day, keeps the time, and shows it on the button", async ({ mount, page }) => {
    const c = await mount(<DateHarness initial="2026-11-02T08:15" />);
    await c.getByRole("button", { name: "Publish date" }).click();
    await page.locator("[role=gridcell]", { hasText: /^20$/ }).click();
    await expect(c.getByTestId("value")).toHaveText("2026-11-20T08:15"); // the day changes, the time stays
    await expect(c.getByRole("button", { name: "Publish date" })).toContainText("20 Nov 2026, 08:15");
  });

  test("the time field changes the hour and minute only", async ({ mount, page }) => {
    const c = await mount(<DateHarness initial="2026-11-02T08:15" />);
    await c.getByRole("button", { name: "Publish date" }).click();
    await page.getByLabel("Time").fill("18:30");
    await expect(c.getByTestId("value")).toHaveText("2026-11-02T18:30");
  });

  test("a time with no date picks today's date", async ({ mount, page }) => {
    const c = await mount(<DateHarness />);
    await c.getByRole("button", { name: "Publish date" }).click();
    await page.getByLabel("Time").fill("07:05");
    const value = (await c.getByTestId("value").textContent())!;
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T07:05$/);
  });

  test("Clear empties it again", async ({ mount, page }) => {
    const c = await mount(<DateHarness initial="2026-11-02T08:15" />);
    await c.getByRole("button", { name: "Publish date" }).click();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(c.getByTestId("value")).toHaveText("");
    await expect(c.getByRole("button", { name: "Publish date" })).toContainText("Pick a date and time");
  });

  test("opens on the month of the current value", async ({ mount, page }) => {
    const c = await mount(<DateHarness initial="2025-03-10T09:00" />);
    await c.getByRole("button", { name: "Publish date" }).click();
    await expect(page.getByText("March 2025")).toBeVisible();
  });
});
