import { expect, test } from "../support/fixtures";
import { smallTalk } from "../../src/content/site";

// What a visitor does on the public site. These read the seeded sample content (supabase/seed.sql) and change nothing in the database.
const MONEY = /Money is an integer/;

test.describe("the blog list", () => {
  test("the search narrows the list, lives in the address, survives a reload, and an empty result can be cleared", { tag: "@smoke" }, async ({ visitor: page }) => {
    await page.goto("/blog");
    const search = page.getByRole("searchbox", { name: "Search posts" });
    await search.fill("money");
    await expect(page.getByRole("link", { name: MONEY }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Ship the boring part/ })).toHaveCount(0);
    await expect(page).toHaveURL(/[?&]q=money/);

    await page.reload();
    await expect(search).toHaveValue("money");
    await expect(page.getByRole("link", { name: /Ship the boring part/ })).toHaveCount(0);

    await search.fill("zzzqqq");
    await expect(page.getByText("Nothing matches yet.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByText("Nothing matches yet.")).toHaveCount(0);
    await expect(search).toHaveValue("");
    await expect(page.getByRole("link", { name: /Ship the boring part/ }).first()).toBeVisible();
  });

  test("a category tab filters the list and is kept in the address", async ({ visitor: page }) => {
    await page.goto("/blog");
    await page.getByRole("tab", { name: /^Data/ }).click();
    await expect(page).toHaveURL(/[?&]category=data/);
    await expect(page.getByRole("link", { name: MONEY }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Ship the boring part/ })).toHaveCount(0);
    await page.getByRole("tab", { name: /^All/ }).click();
    await expect(page).not.toHaveURL(/category=/);
    await expect(page.getByRole("link", { name: /Ship the boring part/ }).first()).toBeVisible();
  });

  test("most viewed puts the most read post first; the address records the choice", async ({ visitor: page }) => {
    await page.goto("/blog");
    await page.getByRole("button", { name: "Latest" }).click();
    await page.getByRole("menuitemradio", { name: "Most viewed" }).click();
    await expect(page).toHaveURL(/[?&]sort=views/);
    await expect(page.locator("ul.grid > li").first()).toContainText("Money is an integer");
  });

  test("a long list is paged, and the next page is reached with the keyboard", async ({ visitor: page }) => {
    await page.goto("/blog");
    await expect(page.getByText(/^Showing 1–9 of \d+ posts/)).toBeVisible();
    await page.getByRole("link", { name: "Go to next page" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(page.getByText(/^Showing 10–\d+ of \d+ posts/)).toBeVisible();
  });
});

test.describe("the home page", () => {
  test("a project tag filters the work grid", async ({ visitor: page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tablist", { name: "Filter projects by tag" });
    await tabs.scrollIntoViewIfNeeded();
    await tabs.getByRole("tab", { name: /^api/i }).click();
    await expect(page.getByRole("link", { name: /Relay/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Lumen/ })).toHaveCount(0);
    await tabs.getByRole("tab", { name: /^All/ }).click();
    await expect(page.getByRole("link", { name: /Lumen/ }).first()).toBeVisible();
  });

  test("a short answer opens and closes", async ({ visitor: page }) => {
    await page.goto("/");
    const question = page.getByRole("button", { name: smallTalk.items[0].q });
    await expect(question).toHaveAttribute("aria-expanded", "false");
    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(smallTalk.items[0].a)).toBeVisible();
    await question.click();
    await expect(page.getByText(smallTalk.items[0].a)).toHaveCount(0);
  });

  test("the contact form needs both fields, shows what the server says, and says so when the network fails", { tag: "@smoke" }, async ({ visitor: page }) => {
    await page.goto("/");
    const send = page.getByRole("button", { name: "Send question" });
    await expect(send).toBeDisabled();
    await page.getByLabel("Ask me anything else").fill("A question that never reaches the server");
    await expect(send).toBeDisabled(); // the address is still missing
    await page.getByLabel("Your email, so I can reply").fill("visitor@example.com");
    await expect(send).toBeEnabled();

    await page.route("**/api/contact", (route) => route.fulfill({ status: 400, json: { message: "Enter a valid email address." } }));
    await send.click();
    await expect(page.getByRole("status")).toHaveText("Enter a valid email address.");
    await expect(page.getByLabel("Ask me anything else")).toHaveValue("A question that never reaches the server"); // kept for another try

    await page.unroute("**/api/contact");
    await page.route("**/api/contact", (route) => route.abort());
    await send.click();
    await expect(page.getByRole("status")).toHaveText("Could not send that. Check your connection.");
  });
});

test.describe("light and dark", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } }); // skips the circle animation, which is not what is tested here

  test("the toggle switches the theme, the choice is kept, and it is in place before the page paints", { tag: "@smoke" }, async ({ visitor: page }) => {
    await page.goto("/about");
    const html = page.locator("html");
    const wasDark = await html.evaluate((el) => el.classList.contains("dark"));
    await page.getByRole("button", { name: wasDark ? "Switch to light mode" : "Switch to dark mode" }).click();
    await expect(html).toHaveClass(wasDark ? /^((?!dark).)*$/ : /dark/);

    await page.reload();
    await expect(html).toHaveClass(wasDark ? /^((?!dark).)*$/ : /dark/);
    await expect(page.getByRole("button", { name: wasDark ? "Switch to dark mode" : "Switch to light mode" })).toBeVisible();
  });

  test("a visitor whose system is dark gets dark until they choose otherwise", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, colorScheme: "dark", storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/about");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/); // their own choice beats the system
    await context.close();
  });
});

test.describe("sharing a post", () => {
  test("Copy link puts the address on the clipboard and says so; a refused copy says that too", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, permissions: ["clipboard-read", "clipboard-write"], storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/blog/money-is-an-integer");
    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("menuitem", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible(); // the label goes back by itself

    await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error("denied")); });
    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("menuitem", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Copy failed" })).toBeVisible();
    await context.close();
  });
});

test.describe("an address that does not exist", () => {
  // A missing post is a 404 that Next streams after the page shell; React logs that as error #419 in a production build.
  test.use({ allowConsoleErrors: true });

  test("is a real 404 with a way back, for a page, and a missing post says so and is hidden from search engines", { tag: "@smoke" }, async ({ visitor: page }) => {
    const missing = await page.goto("/no-such-page");
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Blog", exact: true }).last().click();
    await expect(page).toHaveURL(/\/blog$/);

    // A missing post is found out while the page streams, after the status line is sent, so it answers 200: the page says so and is marked noindex.
    await page.goto("/blog/no-such-post");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });
});

test.describe("the main menu", () => {
  test("its links go to their pages and the current page is marked", async ({ visitor: page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: "Blog" }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(nav.getByRole("link", { name: "Blog" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
  });
});
