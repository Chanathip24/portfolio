import { type Page, test as base, expect } from "@playwright/test";
import { BASE } from "./env";
import { type TestUser, createUser, deleteUser } from "./db";
import { totp } from "./totp";

export { expect };

/** Signs in through the real pages: password, then (first time) the QR set-up and the 6-digit code. Returns the TOTP secret. */
export async function signInWithMfa(page: Page, user: TestUser, secret?: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/admin/mfa");
  if (!secret) {
    await page.getByRole("button", { name: "Set up authenticator" }).click();
    secret = (await page.locator("code.select-all").textContent())!.trim();
    await page.getByLabel(/6-digit code/).fill(totp(secret));
  } else {
    await page.getByLabel(/Code from/).fill(totp(secret));
  }
  await page.getByRole("button", { name: /Verify/ }).click();
  await page.waitForURL((u) => u.pathname === "/admin");
  return secret;
}

/** Opens a shadcn Select by its label and chooses an option by name. */
export async function choose(page: Page, label: string | RegExp, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Tests that use `page` start already signed in as an admin (one throwaway admin per run, MFA done). Specs that test sign-in
 *  itself import `test` from @playwright/test instead and make their own users. */
export const test = base.extend<{ admin: TestUser }, { session: { user: TestUser; state: Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>> } }>({
  session: [
    async ({ browser }, give) => {
      const user = await createUser();
      const context = await browser.newContext({ baseURL: BASE });
      const page = await context.newPage();
      await signInWithMfa(page, user);
      const state = await context.storageState();
      await context.close();
      await give({ user, state });
      await deleteUser(user.id);
    },
    { scope: "worker" },
  ],
  admin: async ({ session }, give) => give(session.user),
  storageState: async ({ session }, give) => give(session.state),
});
