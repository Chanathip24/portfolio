import { expect, test } from "../support/fixtures";
import { BASE } from "../support/env";
import { service } from "../support/db";

const rand = () => Math.random().toString(36).slice(2, 7);
const REAL_BROWSER = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const visitorContext = (browser: import("@playwright/test").Browser) => browser.newContext({ baseURL: BASE, userAgent: REAL_BROWSER, storageState: { cookies: [], origins: [] } });

test.describe("hiding charts", () => {
  test("a chart can be hidden, stays hidden after a reload, and comes back from the Charts menu", async ({ page }) => {
    await page.goto("/admin/users");
    const roles = page.getByRole("region", { name: "Admins and users" });
    await expect(roles).toBeVisible();
    await page.getByRole("button", { name: "Hide Admins and users" }).click();
    await expect(roles).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "New accounts" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Admins and users" })).toHaveCount(0);
    await page.getByRole("button", { name: /Charts/ }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: "Admins and users" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("menuitemcheckbox", { name: "Admins and users" }).click();
    await expect(page.getByRole("region", { name: "Admins and users" })).toBeVisible();
  });
});

test.describe.serial("lists: slug search, creator, links from the chart, projects", () => {
  const slug = `e2e-slug-${rand()}`;
  let id = "";
  test.beforeAll(async () => {
    const db = service();
    const author = (await db.from("authors").select("id").limit(1).single()).data!.id;
    const cat = (await db.from("post_categories").select("slug").limit(1).single()).data!.slug;
    const { data, error } = await db.from("posts").insert({ slug, title: "Findable By Address", excerpt: "x", author_id: author, category: cat, status: "published", published_at: new Date(Date.now() - 864e5).toISOString() }).select("id").single();
    if (error) throw error;
    id = data.id;
    await db.from("page_views").insert([1, 2].map((n) => ({ path: `/blog/${slug}`, visitor: `e2e-s${n}` })));
  });
  test.afterAll(async () => {
    await service().from("posts").delete().eq("slug", slug);
    await service().from("page_views").delete().like("visitor", "e2e-s%");
  });

  test("the post list is searched by slug and shows who created it", async ({ page }) => {
    await page.goto("/admin/posts");
    await expect(page.getByRole("columnheader", { name: /Created by/ })).toBeVisible();
    await page.getByRole("searchbox", { name: "Search posts" }).fill(slug);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText(`/${slug}`);
  });

  test("a post's creator is shown on its analytics page (from the activity log)", async ({ page, admin }) => {
    await service().from("audit_log").insert({ actor_email: admin.email, action: "created", entity: "posts", entity_id: id, summary: "Findable By Address" });
    await page.goto(`/admin/posts/${id}/stats`);
    await expect(page.locator("dt", { hasText: "Created by" }).locator("xpath=following-sibling::dd[1]")).toHaveText(admin.email);
    await page.goto(`/admin/posts/${id}`); // the editor shows it under the title too
    await expect(page.getByText(`Created by ${admin.email}`)).toBeVisible();
    await service().from("audit_log").delete().eq("entity_id", id);
  });

  test("a bar in Most read names the post by its address and opens its analytics", async ({ page }) => {
    await page.goto("/admin/posts");
    const link = page.getByRole("region", { name: "Most read" }).getByRole("link", { name: slug });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/admin/posts/${id}/stats$`));
  });

  test("projects have analytics and a per-project page too", async ({ page }) => {
    await page.goto("/admin/projects");
    for (const t of ["Project views", "Live projects by category", "Most read"]) await expect(page.getByRole("region", { name: t })).toBeVisible();
    const first = page.locator("tbody tr").first().getByRole("link").first();
    await first.click();
    await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}\/stats$/);
    await expect(page.getByRole("region", { name: "Views" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit", exact: true })).toBeVisible();
  });
});

test.describe.serial("long lists stay fast", () => {
  const tag = `e2e-big-${rand()}`;
  test.beforeAll(async () => {
    const db = service();
    const author = (await db.from("authors").select("id").limit(1).single()).data!.id;
    const cat = (await db.from("post_categories").select("slug").limit(1).single()).data!.slug;
    const rows = Array.from({ length: 150 }, (_, i) => ({ slug: `${tag}-${i}`, title: `${tag} row ${i}`, excerpt: "x", author_id: author, category: cat, status: "draft" }));
    const { error } = await db.from("posts").insert(rows);
    if (error) throw error;
  });
  test.afterAll(async () => { await service().from("posts").delete().like("slug", `${tag}%`); });

  test("showing all 150 rows draws only the rows in view, and scrolling brings the rest", async ({ page }) => {
    await page.goto("/admin/posts");
    await page.getByRole("searchbox", { name: "Search posts" }).fill(tag);
    await page.getByRole("combobox", { name: "Rows per page" }).click();
    await page.getByRole("option", { name: "All rows" }).click();
    await expect(page.getByRole("status").filter({ hasText: "of 150" })).toBeVisible();
    const rendered = await page.locator("tbody tr[data-index]").count();
    expect(rendered).toBeGreaterThan(5);
    expect(rendered).toBeLessThan(60);
    await page.locator("div.overflow-auto:has(table)").first().evaluate((el) => el.scrollTo(0, el.scrollHeight));
    // the rows are in no fixed order, so check that the last windows of rows (not one named row) came into view
    await page.waitForFunction(() => [...document.querySelectorAll("tbody tr[data-index]")].some((r) => Number(r.getAttribute("data-index")) > 140));
  });
});

test.describe.serial("inbox", () => {
  const who = `e2e-sender-${rand()}@example.com`;

  test("a visitor's message through the contact form lands in the inbox, where it can be read, starred and deleted", async ({ browser, page }) => {
    const visitor = await visitorContext(browser);
    const site = await visitor.newPage();
    await site.goto("/");
    await site.getByLabel("Ask me anything else").fill("Hello from the contact form test");
    await site.getByLabel("Your email, so I can reply").fill(who);
    await site.getByRole("button", { name: "Send question" }).click();
    await expect(site.getByRole("status").filter({ hasText: "Sent." })).toBeVisible();
    await visitor.close();

    await page.goto("/admin/inbox");
    const row = page.getByRole("listitem").filter({ hasText: "Hello from the contact form test" });
    await expect(row).toBeVisible();
    await expect(row.getByLabel("Unread")).toBeVisible();
    await row.click();
    await expect(page.getByRole("article")).toContainText(who);
    await expect(page.getByRole("article")).toContainText("Hello from the contact form test");
    await expect(row.getByLabel("Unread")).toHaveCount(0); // opening it marks it read
    await page.getByRole("button", { name: "Star", exact: true }).click();
    await expect.poll(async () => (await service().from("messages").select("starred").eq("from_email", who).single()).data?.starred).toBe(true);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete message" }).click();
    await expect(row).toHaveCount(0);
    await expect.poll(async () => (await service().from("messages").select("id").eq("from_email", who)).data?.length).toBe(0);
  });

  test("the contact form refuses a bad email and bots, and stops after three messages an hour", async ({ browser }) => {
    const visitor = await visitorContext(browser);
    const api = visitor.request;
    const post = (data: object) => api.post("/api/contact", { data, headers: { origin: BASE } });
    expect((await post({ email: "nope", message: "hi" })).status()).toBe(400);
    expect((await post({ email: who, message: "bot", website: "http://spam" })).status()).toBe(204);
    expect((await service().from("messages").select("id").eq("from_email", who)).data).toHaveLength(0); // the bot stored nothing
    for (let i = 0; i < 3; i++) expect((await post({ email: who, message: `m${i}` })).status()).toBe(201);
    expect((await post({ email: who, message: "one too many" })).status()).toBe(429);
    await visitor.close();
    await service().from("messages").delete().eq("from_email", who);
  });

  test("Gmail says what is missing when it is not connected", async ({ page }) => {
    await page.goto("/admin/inbox");
    await expect(page.getByText(/Gmail is not connected/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sync Gmail" })).toBeDisabled();
  });

  test("a wrong password sign-in leaves a security notice in the inbox, repeats become one message", async ({ browser, page }) => {
    const email = `e2e-nobody-${rand()}@example.com`;
    const visitor = await visitorContext(browser);
    const login = await visitor.newPage();
    for (let i = 0; i < 2; i++) {
      await login.goto("/admin/login");
      await login.getByLabel("Email").fill(email);
      await login.getByLabel("Password").fill("not-the-password-123");
      await login.getByRole("button", { name: "Continue" }).click();
      await expect(login.getByText("Wrong email or password.")).toBeVisible();
    }
    await visitor.close();
    const found = (await service().from("messages").select("body,severity,source").eq("subject", `Failed sign-in for ${email}`)).data!;
    expect(found).toHaveLength(1);
    expect(found[0].source).toBe("system");
    expect(found[0].body).toContain("Attempts in the last 10 minutes: 2");

    await page.goto("/admin/inbox");
    await page.getByRole("button", { name: "Security" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: `Failed sign-in for ${email}` })).toBeVisible();
    await service().from("messages").delete().eq("subject", `Failed sign-in for ${email}`);
  });
});

test.describe("performance", () => {
  test("real-user vitals are recorded for public pages only and shown on the Performance page", async ({ browser, page }) => {
    const visitor = await visitorContext(browser);
    const post = (data: object) => visitor.request.post("/api/vitals", { data, headers: { origin: BASE } });
    await post({ metric: "LCP", value: 5200, rating: "poor", path: "/", device: "mobile" });
    await post({ metric: "LCP", value: 900, rating: "good", path: "/about", device: "desktop" });
    await post({ metric: "CLS", value: 0.4, rating: "poor", path: "/admin/posts", device: "desktop" }); // not a public route: ignored
    await post({ metric: "BOGUS", value: 1, rating: "good", path: "/", device: "desktop" }); // not a metric: ignored
    await visitor.close();
    const { data } = await service().from("web_vitals").select("metric,path").gte("created_at", new Date(Date.now() - 60_000).toISOString());
    expect(data!.filter((r) => r.path === "/admin/posts" || r.metric === "BOGUS")).toHaveLength(0);
    expect(data!.filter((r) => r.metric === "LCP").length).toBeGreaterThanOrEqual(2);

    await page.goto("/admin/performance");
    await expect(page.getByText(/^LCP/).first()).toBeVisible();
    for (const t of ["How visits rate", "Load times over time", "Slowest pages", "Phone and desktop"]) await expect(page.getByRole("region", { name: t })).toBeVisible();
    await service().from("web_vitals").delete().gte("created_at", new Date(Date.now() - 120_000).toISOString());
  });

  test("a real browser visit on the public site records vitals; the same visit signed in to the admin records nothing", async ({ browser, page }) => {
    test.setTimeout(90_000);
    const count = async () => (await service().from("web_vitals").select("id", { count: "exact", head: true })).count ?? 0;
    const visit = async (p: import("@playwright/test").Page) => {
      await p.goto("/blog");
      await p.waitForTimeout(2000);
      await p.mouse.click(200, 300);
      await p.goto("/about"); // leaving a page is when the browser reports its final numbers
      await p.waitForTimeout(2000);
      await p.goto("about:blank");
      await new Promise((r) => setTimeout(r, 1500));
    };
    const start = new Date(Date.now() - 1000).toISOString();

    const before = await count();
    const ctx = await browser.newContext({ baseURL: BASE, userAgent: REAL_BROWSER, storageState: { cookies: [], origins: [] } });
    await visit(await ctx.newPage());
    await ctx.close();
    const visitor = (await count()) - before;
    expect(visitor).toBeGreaterThan(0);

    const mid = await count();
    await visit(page); // this page carries the admin session
    expect((await count()) - mid).toBe(0);
    await service().from("web_vitals").delete().gte("created_at", start);
  });
});
