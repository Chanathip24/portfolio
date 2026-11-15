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
/** Browser console messages that are not bugs in the page: a failed request (a 404 image, a refused sign-in, a rate limit) is logged
 *  as an error by the browser, and several tests cause those on purpose. Anything else the page logs as an error is a real problem. */
const EXPECTED_CONSOLE = [/Failed to load resource/, /Refused to execute script from .*\/_vercel\/(speed-insights|insights)\/script\.js/]; // the second only happens locally, where Vercel serves no analytics script

/** Collects what a page reports as errors; the list is checked when the test ends. */
function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !EXPECTED_CONSOLE.some((rx) => rx.test(m.text()))) problems.push(`console.error: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`uncaught: ${e.message}`));
  return () => expect(problems, ["The page reported errors:", ...problems].join("\n")).toEqual([]);
}

export const test = base.extend<{ admin: TestUser; visitor: Page; allowConsoleErrors: boolean; consoleGuard: void }, { session: { user: TestUser; state: Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>> } }>({
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
  // `test.use({ allowConsoleErrors: true })` turns the guard off for a file or group that breaks the page on purpose.
  allowConsoleErrors: [false, { option: true }],
  // Fails a test whose page logs an unexpected console error or throws an uncaught exception, so a hydration mismatch or a broken
  // handler cannot pass unnoticed behind assertions that only look at what is on screen.
  consoleGuard: [
    async ({ page, allowConsoleErrors }, give) => {
      const problems: string[] = [];
      page.on("console", (m) => { if (m.type() === "error" && !EXPECTED_CONSOLE.some((rx) => rx.test(m.text()))) problems.push(`console.error: ${m.text()}`); });
      page.on("pageerror", (e) => problems.push(`uncaught: ${e.message}`));
      await give();
      if (!allowConsoleErrors) expect(problems, ["The page reported errors:", ...problems].join("\n")).toEqual([]);
    },
    { auto: true },
  ],
  // A signed-out visitor on the same device settings as the project (desktop or phone), watched by the same guard.
  visitor: async ({ browser, contextOptions, viewport, isMobile, hasTouch, deviceScaleFactor, allowConsoleErrors }, give) => {
    const context = await browser.newContext({ ...contextOptions, baseURL: BASE, viewport, isMobile, hasTouch, deviceScaleFactor, storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    const check = watchConsole(page);
    await give(page);
    await context.close();
    if (!allowConsoleErrors) check();
  },
  storageState: async ({ session }, give) => give(session.state),
});
