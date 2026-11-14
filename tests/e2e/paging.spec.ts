import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

const rand = () => Math.random().toString(36).slice(2, 7);

test.describe.serial("lists are no longer cut off at the API's page size", () => {
  const tag = `e2e-pg-${rand()}`;
  const total = 1200;
  test.beforeAll(async () => {
    const db = service();
    const author = (await db.from("authors").select("id").limit(1).single()).data!.id;
    const cat = (await db.from("post_categories").select("slug").limit(1).single()).data!.slug;
    const rows = Array.from({ length: total }, (_, i) => ({ slug: `${tag}-${i}`, title: `${tag} ${i}`, excerpt: "x", author_id: author, category: cat, status: "draft" }));
    for (let i = 0; i < rows.length; i += 400) { const { error } = await db.from("posts").insert(rows.slice(i, i + 400)); if (error) throw error; }
  });
  test.afterAll(async () => { await service().from("posts").delete().like("slug", `${tag}%`); });

  test(`the post list holds all ${total} new posts (the API returns 1000 at a time)`, async ({ page }) => {
    await page.goto("/admin/posts");
    await page.getByRole("searchbox", { name: "Search posts" }).fill(tag);
    await expect(page.getByRole("status").filter({ hasText: `${total} of ` })).toBeVisible();
    await page.getByRole("combobox", { name: "Rows per page" }).click();
    await page.getByRole("option", { name: "All rows" }).click();
    await expect(page.getByRole("status").filter({ hasText: `1–${total} of ${total}` })).toBeVisible();
  });

  test("the posts overview counts them all", async ({ page }) => {
    await page.goto("/admin/posts");
    const tile = page.locator("dt", { hasText: /^Posts$/ }).locator("xpath=following-sibling::dd[1]");
    await expect.poll(async () => Number(await tile.innerText())).toBeGreaterThanOrEqual(total);
  });
});

test.describe.serial("the user list holds more than 200 users", () => {
  const tag = `e2e-pgu-${rand()}`;
  const ids: string[] = [];
  const count = 210; // the list used to stop at 200
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    const db = service();
    for (let i = 0; i < count; i += 30) {
      const made = await Promise.all(Array.from({ length: Math.min(30, count - i) }, (_, k) => db.auth.admin.createUser({ email: `${tag}-${i + k}@test.local`, password: "Str0ng!Passw0rd#new", email_confirm: true })));
      for (const m of made) ids.push(m.data.user!.id);
    }
  });
  test.afterAll(async () => { await Promise.all(ids.map((id) => service().auth.admin.deleteUser(id))); });

  test("all of them are listed", async ({ page }) => {
    await page.goto("/admin/users");
    await page.getByRole("searchbox", { name: "Search users" }).fill(tag);
    await expect(page.getByRole("status").filter({ hasText: `${count} of ` })).toBeVisible();
  });
});
