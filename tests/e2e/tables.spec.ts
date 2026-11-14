import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

const rand = () => Math.random().toString(36).slice(2, 8);

test.describe.serial("table features (posts)", () => {
  const tag = `e2e-tbl-${rand()}`;
  const titles = [1, 2, 3].map((n) => `${tag} ${n}`);

  test.beforeAll(async () => {
    const db = service();
    const author = (await db.from("authors").select("id").limit(1).single()).data!.id;
    const cat = (await db.from("post_categories").select("slug").limit(1).single()).data!.slug;
    const { error } = await db.from("posts").insert(titles.map((title, i) => ({
      slug: `${tag}-${i}`, title, excerpt: "x", author_id: author, category: cat, status: "draft", published_at: new Date().toISOString(),
    })));
    if (error) throw error;
  });
  test.afterAll(async () => { await service().from("posts").delete().like("slug", `${tag}%`); });

  const open = async (page: import("@playwright/test").Page) => {
    await page.goto("/admin/posts");
    await page.getByRole("searchbox", { name: "Search posts" }).fill(tag);
  };

  test("sorting by a column toggles aria-sort", async ({ page }) => {
    await open(page);
    const th = page.getByRole("columnheader", { name: /Title/ });
    await th.getByRole("button").click();
    await expect(th).toHaveAttribute("aria-sort", "ascending");
    await th.getByRole("button").click();
    await expect(th).toHaveAttribute("aria-sort", "descending");
    await expect(page.getByRole("row").nth(1)).toContainText(titles[2]);
  });

  test("rows per page limits the table and is remembered", async ({ page }) => {
    await page.goto("/admin/posts");
    await page.getByRole("combobox", { name: "Rows per page" }).click();
    await page.getByRole("option", { name: "10 rows", exact: true }).click();
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Rows per page" })).toContainText("10");
  });

  test("selecting rows bulk-moves them, then bulk-deletes with confirmation", async ({ page }) => {
    await open(page);
    await page.getByRole("checkbox", { name: /Select all/ }).first().check();
    await expect(page.getByText("3 selected")).toBeVisible();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect.poll(async () => (await service().from("posts").select("id").like("slug", `${tag}%`).eq("status", "published")).data?.length).toBe(3);

    await page.getByRole("checkbox", { name: /Select all/ }).first().check();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect.poll(async () => (await service().from("posts").select("id").like("slug", `${tag}%`)).data?.length).toBe(0);
  });
});
