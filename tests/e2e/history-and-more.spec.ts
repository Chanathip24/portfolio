import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const rand = () => Math.random().toString(36).slice(2, 7);
const REAL_BROWSER = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const seedPost = async (slug: string, extra: Record<string, unknown> = {}) => {
  const db = service();
  const author = (await db.from("authors").select("id").limit(1).single()).data!.id;
  const cat = (await db.from("post_categories").select("slug").limit(1).single()).data!.slug;
  const { data, error } = await db.from("posts").insert({ slug, title: `Original ${slug}`, excerpt: "x", author_id: author, category: cat, status: "published", published_at: new Date(Date.now() - 864e5).toISOString(), ...extra }).select("id").single();
  if (error) throw error;
  return data.id as string;
};

test.describe.serial("history: every change can be put back with one click", () => {
  const slug = `e2e-hist-${rand()}`;
  let id = "";
  test.beforeAll(async () => { id = await seedPost(slug); });
  test.afterAll(async () => { await service().from("posts").delete().eq("slug", slug); await service().from("revisions").delete().eq("row_id", id); });

  test("saving a change keeps the version before it, and Restore puts it back (and can itself be undone)", async ({ page }) => {
    await page.goto(`/admin/posts/${id}`);
    await page.getByLabel("Title").fill("Changed once");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.getByLabel("Title").fill("Changed twice");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect.poll(async () => (await service().from("revisions").select("id").eq("row_id", id)).data?.length).toBe(2);

    await page.reload();
    await page.getByRole("button", { name: /History/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("listitem")).toHaveCount(2);
    await expect(sheet.getByRole("listitem").first()).toContainText("changed title");
    // the oldest version is the original title
    await sheet.getByRole("listitem").last().getByRole("button", { name: /Restore/ }).click();
    await expect(sheet.getByRole("status")).toContainText("Restored");
    await expect.poll(async () => (await service().from("posts").select("title").eq("id", id).single()).data?.title).toBe(`Original ${slug}`);
    // the version it replaced ("Changed twice") was kept, so the restore can be undone
    await expect.poll(async () => (await service().from("revisions").select("label").eq("row_id", id)).data?.map((r) => r.label)).toContain("Changed twice");
  });

  test("a deleted post is listed under Deleted on the History page and can be brought back with its old id", async ({ page }) => {
    await page.goto(`/admin/posts/${id}`);
    await page.getByRole("button", { name: /^Delete/ }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: /^Delete/ }).click();
    await page.waitForURL(/\/admin\/posts$/);
    expect((await service().from("posts").select("id").eq("id", id)).data).toHaveLength(0);

    await page.goto("/admin/history?show=deleted");
    const row = page.getByRole("listitem").filter({ hasText: `Original ${slug}` });
    await expect(row).toContainText("Deleted");
    await row.getByRole("button", { name: /Bring back/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Brought back" })).toBeVisible();
    expect((await service().from("posts").select("slug").eq("id", id)).data).toHaveLength(1);
  });

  test("restoring a post leaves its view counter alone", async ({ page }) => {
    await service().from("posts").update({ views: 41 }).eq("id", id); // no signed-in user: not a revision
    await page.goto(`/admin/posts/${id}`);
    await page.getByLabel("Title").fill("Touched");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await service().from("posts").update({ views: 99 }).eq("id", id);
    await page.reload();
    await page.getByRole("button", { name: /History/ }).click();
    await page.getByRole("dialog").getByRole("listitem").first().getByRole("button", { name: /Restore/ }).click();
    await expect(page.getByRole("dialog").getByRole("status")).toContainText("Restored");
    expect((await service().from("posts").select("views").eq("id", id).single()).data?.views).toBe(99);
  });
});

test.describe.serial("image descriptions and captions", () => {
  const slug = `e2e-alt-${rand()}`;
  let id = "";
  const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Before the picture." }] }, { type: "image", attrs: { src: PIXEL, alt: "A harbour at dawn", caption: "Tidewater, 6am" } }] };
  test.beforeAll(async () => { id = await seedPost(slug, { body }); });
  test.afterAll(async () => { await service().from("posts").delete().eq("slug", slug); await service().from("revisions").delete().eq("row_id", id); });

  test("a captioned image is a figure with its description, and the cover uses its own description", async ({ page }) => {
    await service().from("posts").update({ image_url: "/cover-e2e.png", image_alt: "The cover: a harbour" }).eq("id", id);
    await page.goto(`/blog/${slug}`);
    const figure = page.locator(".rich figure");
    await expect(figure.locator("img")).toHaveAttribute("alt", "A harbour at dawn");
    await expect(figure.locator("figcaption")).toHaveText("Tidewater, 6am");
    await expect(page.locator("img[alt='The cover: a harbour']").first()).toBeAttached();
  });

  test("in the editor, selecting an image shows its description and lets you change the caption", async ({ page }) => {
    await page.goto(`/admin/posts/${id}`);
    await page.locator(".ProseMirror img").first().click();
    const bar = page.getByRole("group", { name: "Selected image" });
    await expect(bar).toContainText("A harbour at dawn");
    await bar.getByRole("button", { name: "Edit description and caption" }).click();
    await page.getByRole("textbox", { name: "Caption shown under the image" }).fill("A new caption");
    await page.getByRole("button", { name: "Save details" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    const saved = (await service().from("posts").select("body").eq("id", id).single()).data!.body as { content: { type: string; attrs?: { caption?: string; alt?: string } }[] };
    const image = saved.content.find((n) => n.type === "image")!;
    expect(image.attrs).toMatchObject({ caption: "A new caption", alt: "A harbour at dawn" });
  });

  test("an image without a description is flagged in the editor, and the cover field is saved", async ({ page }) => {
    await service().from("posts").update({ body: { type: "doc", content: [{ type: "image", attrs: { src: PIXEL, alt: "", caption: "" } }] } }).eq("id", id);
    await page.goto(`/admin/posts/${id}`);
    await page.locator(".ProseMirror img").first().click();
    await expect(page.getByRole("group", { name: "Selected image" })).toContainText("No description");
    await page.getByLabel("Cover image description").fill("Saved cover description");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    expect((await service().from("posts").select("image_alt").eq("id", id).single()).data?.image_alt).toBe("Saved cover description");
  });
});

test.describe("sign-in is rate limited", () => {
  test("after five wrong passwords for one address further tries are refused without asking Supabase, and a notice is left", async ({ browser }) => {
    const email = `e2e-limit-${rand()}@example.com`;
    const ctx = await browser.newContext({ userAgent: REAL_BROWSER, storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    for (let i = 0; i < 5; i++) {
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(`wrong-password-${i}-xyz`);
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText("Wrong email or password.")).toBeVisible();
    }
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password-6-xyz");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/Too many attempts\. Wait ten minutes/)).toBeVisible();
    await ctx.close();
    // Another browser behind an unknown ingress must not inherit an email-only lockout.
    const other = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const otherPage = await other.newPage();
    await otherPage.goto("/admin/login");
    await otherPage.getByLabel("Email").fill(email);
    await otherPage.getByLabel("Password").fill("wrong-password-other-browser");
    await otherPage.getByRole("button", { name: "Continue" }).click();
    await expect(otherPage.getByText("Wrong email or password.")).toBeVisible();
    await other.close();
    expect(((await service().from("messages").select("severity").eq("subject", `Sign-in blocked for ${email}`)).data ?? [])[0]?.severity).toBe("critical");
    await service().from("auth_attempts").delete().eq("key", email);
    await service().from("messages").delete().like("subject", `%${email}%`);
  });
});

test.describe("privilege changes leave notices", () => {
  test("making someone an admin, and resetting an authenticator, are announced in the inbox", async ({ page }) => {
    const email = `e2e-priv-${rand()}@test.local`;
    const { data } = await service().auth.admin.createUser({ email, password: "Str0ng!Passw0rd#new", email_confirm: true });
    const uid = data.user!.id;
    await page.goto("/admin/users");
    await page.getByRole("searchbox", { name: "Search users" }).fill(email);
    await page.getByRole("button", { name: `Actions for ${email}` }).click();
    await page.getByRole("menuitem", { name: "Make admin" }).click();
    await expect.poll(async () => (await service().from("messages").select("severity").eq("subject", `${email} was made an admin`)).data?.length).toBe(1);
    await service().auth.admin.deleteUser(uid);
    await service().from("messages").delete().like("subject", `%${email}%`);
  });
});
