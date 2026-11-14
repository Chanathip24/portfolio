import { expect, test } from "@playwright/test";
import { anon, createUser, deleteUser, type TestUser } from "../support/db";
import { signInWithMfa } from "../support/fixtures";
import { totp } from "../support/totp";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

// A user of its own: these change the password and the authenticators, which would break a shared admin session.
test.describe.serial("my account", () => {
  let user: TestUser;
  let secret: string;
  test.beforeAll(async () => { user = await createUser(); });
  test.afterAll(async () => { await deleteUser(user.id); });

  test("the profile: a name and a picture show in the account menu", async ({ page }) => {
    secret = await signInWithMfa(page, user);
    await page.goto("/admin/account");
    await expect(page.getByLabel("Email")).toBeDisabled();
    await page.getByLabel("Name").fill("E2E Tester");
    await page.locator("input[type=file]").first().setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
    await expect(page.locator("main img").first()).toHaveAttribute("src", /\/storage\/v1\/object\/public\/media\//);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Account menu" }).first()).toContainText("E2E Tester");
    await expect(page.getByRole("button", { name: "Account menu" }).first().locator("img")).toBeAttached();
  });

  test("the password: weak ones are refused, a strong one changes it", async ({ page }) => {
    await signInWithMfa(page, user, secret);
    await page.goto("/admin/account");
    await page.getByLabel("New password").fill("weak");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "At least 12 characters" })).toBeVisible();
    const next = "An0ther!Passw0rd#e2e";
    await page.getByLabel("New password").fill(next);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Password changed." })).toBeVisible();
    expect((await anon().auth.signInWithPassword({ email: user.email, password: next })).error).toBeNull();
    expect((await anon().auth.signInWithPassword({ email: user.email, password: user.password })).error).not.toBeNull();
    user.password = next; // the later tests sign in with the new one
  });

  test("authenticators: the last one cannot be removed; a second can be added, then the first removed", async ({ page }) => {
    await signInWithMfa(page, user, secret);
    await page.goto("/admin/account");
    const list = page.getByRole("list").filter({ hasText: "Added" });
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await page.getByRole("button", { name: /^Remove / }).click();
    await expect(page.getByRole("status").or(page.getByRole("alert")).filter({ hasText: "at least one authenticator" })).toBeVisible();

    await page.getByRole("button", { name: "Add another authenticator" }).click();
    const second = (await page.locator("code.select-all").textContent())!.trim();
    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Verify and add" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "not right" })).toBeVisible();
    await page.getByLabel("6-digit code").fill(totp(second));
    await page.getByRole("button", { name: "Verify and add" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Authenticator added." })).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveCount(2);

    await list.getByRole("listitem").first().getByRole("button", { name: /^Remove / }).click();
    await expect(list.getByRole("listitem")).toHaveCount(1);
    secret = second; // the first authenticator is gone, so this is the one that signs in from now on
  });

  test("sign out other devices", async ({ page }) => {
    await signInWithMfa(page, user, secret);
    await page.goto("/admin/account");
    await page.getByRole("button", { name: "Sign out other devices" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Signed out everywhere else." })).toBeVisible();
  });
});
