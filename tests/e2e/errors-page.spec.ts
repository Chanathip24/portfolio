import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

test.describe("the Errors page", () => {
  const fingerprint = "e2e0000000000a01";
  const message = `E2E boom ${Date.now().toString(36)}`;
  const rowsLeft = async () => (await service().from("error_events").select("id").eq("fingerprint", fingerprint)).data?.length ?? 0;
  test.afterEach(async () => { await service().from("error_events").delete().eq("fingerprint", fingerprint); });

  test("a bug is listed once with its count, shows its stack trace, and Resolve clears it", async ({ page }) => {
    const stack = "Error: boom\n    at renderThing (app.js:10:5)";
    await service().from("error_events").insert([1, 2].map(() => ({ source: "client", fingerprint, message, stack, path: "/blog/hello" })));

    await page.goto("/admin/errors");
    const bug = page.getByRole("listitem").filter({ hasText: message });
    await expect(bug).toHaveCount(1); // two reports of one bug are one line
    await expect(bug).toContainText("2×");
    await expect(bug).toContainText("Browser");
    await expect(bug).toContainText("/blog/hello");

    await bug.getByText(message).click(); // opens the details
    await expect(bug.getByText("at renderThing (app.js:10:5)")).toBeVisible();

    await bug.getByRole("button", { name: "Resolve" }).click();
    await expect(page.getByText(message)).toHaveCount(0);
    expect(await rowsLeft()).toBe(0);
  });

  test("a resolved bug that happens again is listed as new", async ({ page }) => {
    const db = service();
    await db.from("error_events").insert({ source: "server", fingerprint, message, path: "/work/x" });
    await page.goto("/admin/errors");
    await page.getByRole("listitem").filter({ hasText: message }).getByText(message).click();
    await page.getByRole("button", { name: "Resolve" }).click();
    await expect(page.getByText(message)).toHaveCount(0);

    await db.from("error_events").insert({ source: "server", fingerprint, message, path: "/work/x" });
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: message })).toContainText("1×");
  });
});
