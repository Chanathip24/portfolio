import { expect, test } from "@playwright/test";
import { createUser, deleteUser, service, type TestUser } from "../support/db";
import { signInWithMfa } from "../support/fixtures";
import { totp } from "../support/totp";

// Each test makes its own user: signing out revokes every session of a user, so they must not share one.
test.describe("admin sign-in", () => {
  let user: TestUser;
  test.beforeEach(async () => { user = await createUser(); });
  test.afterEach(async () => { await deleteUser(user.id); });

  test("anyone not signed in is sent to the sign-in page", async ({ page }) => {
    for (const path of ["/admin", "/admin/posts", "/admin/projects/new", "/admin/profile"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
  });

  test("a wrong password gives one generic message and keeps the email", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("not-the-password-123");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Wrong email or password.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(user.email);
  });

  test("a password alone does not open the admin: it stops at the second step", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/admin/mfa");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/mfa$/);
    await page.goto("/admin/posts");
    await expect(page).toHaveURL(/\/admin\/mfa$/);
  });

  test("first sign-in sets up the authenticator; a wrong code is refused and the box is cleared", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/admin/mfa");

    await page.getByRole("button", { name: "Set up authenticator" }).click();
    await expect(page.getByAltText(/QR code/)).toBeVisible();
    const secret = (await page.locator("code.select-all").textContent())!.trim();
    expect(secret.length).toBeGreaterThanOrEqual(16);

    await page.getByLabel(/6-digit code/).fill("000000");
    await page.getByRole("button", { name: /Verify/ }).click();
    await expect(page.getByText(/not right/)).toBeVisible();
    await expect(page.locator("input[name=code]")).toHaveValue(""); // cleared for the next try

    await page.getByLabel(/6-digit code/).fill(totp(secret));
    await page.getByRole("button", { name: /Verify/ }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test("later sign-ins ask for a code from the existing authenticator", async ({ page, browser }) => {
    const secret = await signInWithMfa(page, user);
    const other = await browser.newContext({ baseURL: page.url().replace(/\/admin.*/, "") });
    const second = await other.newPage();
    await second.goto("/admin/login");
    await second.getByLabel("Email").fill(user.email);
    await second.getByLabel("Password").fill(user.password);
    await second.getByRole("button", { name: "Continue" }).click();
    await expect(second.getByRole("heading", { name: "Confirm it's you" })).toBeVisible();
    await second.getByLabel(/Code from/).fill(totp(secret));
    await second.getByRole("button", { name: /Verify/ }).click();
    await expect(second).toHaveURL(/\/admin$/);
    await other.close();
  });

  test("signing out locks the admin again", async ({ page }) => {
    await signInWithMfa(page, user);
    await page.getByRole("button", { name: "Account menu" }).first().click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("a signed-in user who is not on the admin list is refused and signed out, with no redirect loop", async ({ page }) => {
    await signInWithMfa(page, user);
    await service().from("admins").delete().eq("user_id", user.id); // removed from the list while signed in
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?error=forbidden$/);
    await expect(page.getByText("doesn't have admin access")).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/); // the session was cleared: now just signed out
  });

  test("a session whose user was deleted recovers the same way", async ({ page }) => {
    await signInWithMfa(page, user);
    await deleteUser(user.id);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?error=forbidden$/);
  });
});
