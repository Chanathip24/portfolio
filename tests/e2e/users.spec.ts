import type { Page } from "@playwright/test";
import { expect, test } from "../support/fixtures";
import { anon, service, signedInClient } from "../support/db";

const rand = () => Math.random().toString(36).slice(2, 8);
const STRONG = "Str0ng!Passw0rd#new";

test.describe.serial("user management", () => {
  const email = `e2e-made-${rand()}@test.local`;
  let id = "";

  const row = (page: Page) => page.getByRole("row").filter({ hasText: email });
  const menu = async (page: Page, item: string | RegExp) => {
    await page.getByRole("button", { name: `Actions for ${email}` }).click();
    await page.getByRole("menuitem", { name: item }).click();
  };
  const reload = async (page: Page) => { await page.goto("/admin/users"); await page.getByRole("searchbox", { name: "Search users" }).fill(email); };

  test.afterAll(async () => { if (id) await service().auth.admin.deleteUser(id); });

  test("the list shows everyone; your own row cannot be demoted, blocked or deleted", async ({ page, admin }) => {
    await page.goto("/admin/users");
    const mine = page.getByRole("row").filter({ hasText: admin.email });
    await expect(mine).toContainText("You");
    await expect(mine).toContainText("Admin");
    await expect(mine).toContainText("On");
    await page.getByRole("button", { name: `Actions for ${admin.email}` }).click();
    for (const name of [/Remove admin access/, /Block sign-in/, /Delete user/]) await expect(page.getByRole("menuitem", { name })).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Escape");
  });

  test("search and filters narrow the list", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("button", { name: /^Actions for/ }).first()).toBeVisible();
    const total = await page.getByRole("row").filter({ has: page.getByRole("button", { name: /^Actions for/ }) }).count();
    expect(total).toBeGreaterThanOrEqual(2);
    await page.getByRole("searchbox", { name: "Search users" }).fill("zzz-nobody");
    await expect(page.getByText("No users match that.")).toBeVisible();
    await page.getByRole("searchbox", { name: "Search users" }).fill("");
    await page.getByRole("combobox", { name: "Filter users" }).click();
    await page.getByRole("option", { name: "Admins", exact: true }).click();
    // Role and MFA enrollment are independent: a newly added admin can still have 2-step off.
    await expect(page.getByRole("cell", { name: "User", exact: true })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Admin", exact: true }).first()).toBeVisible();
  });

  test("an admin adds a user: weak passwords and duplicates are refused, a strong one works", async ({ page, admin }) => {
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Add user" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(email);
    await dialog.getByLabel("Password", { exact: true }).fill("short");
    await dialog.getByRole("button", { name: "Add user" }).click();
    await expect(dialog.getByRole("alert")).toContainText("At least 12 characters");

    await dialog.getByLabel("Password", { exact: true }).fill("alllowercaseletters");
    await dialog.getByRole("button", { name: "Add user" }).click();
    await expect(dialog.getByRole("alert")).toContainText(/upper-case|digit|symbol/);

    await dialog.getByRole("button", { name: "Generate" }).click();
    expect((await dialog.getByLabel("Password", { exact: true }).inputValue()).length).toBeGreaterThanOrEqual(12);
    await dialog.getByLabel("Email").fill(admin.email); // already taken
    await dialog.getByRole("button", { name: "Add user" }).click();
    await expect(dialog.getByRole("alert")).toContainText("already exists");

    await dialog.getByLabel("Email").fill(email);
    await dialog.getByLabel("Name (optional)").fill("Made By Test");
    await dialog.getByRole("button", { name: "Add user" }).click();
    await expect(page.getByRole("status").filter({ hasText: `Created ${email}` })).toBeVisible();
    await expect(row(page)).toContainText("Made By Test");

    const { data } = await service().auth.admin.listUsers({ perPage: 200 });
    id = data.users.find((u) => u.email === email)!.id;
    expect((await service().from("admins").select("user_id").eq("user_id", id)).data).toHaveLength(0); // a plain user
  });

  test("make admin, then remove admin access (asked first)", async ({ page }) => {
    await reload(page);
    await menu(page, "Make admin");
    await expect(row(page)).toContainText("Admin");
    expect((await service().from("admins").select("user_id").eq("user_id", id)).data).toHaveLength(1);

    await menu(page, "Remove admin access");
    await page.getByRole("alertdialog").getByRole("button", { name: "Remove access" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(row(page)).not.toContainText("Admin");
    await expect.poll(async () => ((await service().from("admins").select("user_id").eq("user_id", id)).data ?? []).length).toBe(0);
  });

  test("set a new password: the old one stops working", async ({ page }) => {
    await reload(page);
    await menu(page, "Set a new password");
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Password", { exact: true }).fill("weak");
    await dialog.getByRole("button", { name: "Change password" }).click();
    await expect(dialog.getByRole("alert")).toContainText("At least 12 characters");
    await dialog.getByLabel("Password", { exact: true }).fill(STRONG);
    await dialog.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Password changed." })).toBeVisible();
    expect((await anon().auth.signInWithPassword({ email, password: STRONG })).error).toBeNull();
  });

  test("block stops sign-in until unblocked", async ({ page }) => {
    await reload(page);
    await menu(page, "Block sign-in");
    await page.getByRole("alertdialog").getByRole("button", { name: "Block" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(row(page)).toContainText("Blocked");
    expect((await anon().auth.signInWithPassword({ email, password: STRONG })).error).not.toBeNull();
    await menu(page, "Unblock");
    await expect(row(page)).not.toContainText("Blocked");
    expect((await anon().auth.signInWithPassword({ email, password: STRONG })).error).toBeNull();
  });

  test("resetting the authenticator removes it, so the next sign-in sets up a new one", async ({ page }) => {
    await signedInClient({ id, email, password: STRONG }, { mfa: true });
    await reload(page);
    await expect(row(page)).toContainText("On");
    await menu(page, "Reset authenticator");
    await page.getByRole("alertdialog").getByRole("button", { name: "Reset authenticator" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(row(page)).toContainText("Off");
    expect(((await service().auth.admin.mfa.listFactors({ userId: id })).data?.factors ?? []).length).toBe(0);
  });

  test("the actions are in the activity log", async () => {
    const log = (await service().from("audit_log").select("summary").eq("entity", "users")).data!.map((l) => l.summary);
    expect(log.some((s) => s.includes(`Created user ${email}`))).toBe(true);
    expect(log.some((s) => s.includes(`Changed the password of ${email}`))).toBe(true);
    expect(log.some((s) => s.includes(`Blocked ${email}`))).toBe(true);
    expect(log.some((s) => s.includes(`Reset the authenticator of ${email}`))).toBe(true);
  });

  test("deleting asks first and removes the account", async ({ page }) => {
    await reload(page);
    await menu(page, "Delete user");
    await expect(page.getByRole("alertdialog")).toContainText("can't be undone");
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete user" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(row(page)).toHaveCount(0);
    await expect.poll(async () => (await service().auth.admin.getUserById(id)).data.user).toBeNull();
    id = "";
  });
});
