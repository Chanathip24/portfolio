import { expect, test } from "@playwright/test";
import { anon, createUser, deleteUser, service, signedInClient, type TestUser } from "../support/db";

// The rules that live in the database (supabase/migrations). They hold whatever the app does, so they are tested without the app.
test.describe("database security", () => {
  let admin: TestUser, other: TestUser;
  test.beforeAll(async () => { admin = await createUser(); other = await createUser({ admin: false }); });
  test.afterAll(async () => {
    await service().from("posts").delete().like("slug", "e2e%");
    await service().from("projects").delete().like("slug", "e2e%");
    await deleteUser(admin.id); await deleteUser(other.id);
  });

  test.describe("a visitor (anonymous)", () => {
    test("reads only published posts and projects", async () => {
      const posts = await anon().from("posts").select("slug,status");
      expect(posts.data!.length).toBeGreaterThan(0);
      expect(posts.data!.every((p) => p.status === "published")).toBe(true);
      const projects = await anon().from("projects").select("status");
      expect(projects.data!.every((p) => p.status === "published")).toBe(true);
    });

    test("cannot create, change or delete content", async () => {
      const author = (await service().from("authors").select("id").limit(1).single()).data!.id;
      expect((await anon().from("posts").insert({ slug: "e2e-x", title: "x", category: "engineering", author_id: author })).error?.code).toBe("42501");
      await anon().from("profile").update({ headline: "hacked" }).neq("display_name", "");
      expect((await service().from("profile").select("headline").single()).data!.headline).not.toBe("hacked");
      const before = (await service().from("posts").select("id", { count: "exact", head: true })).count;
      await anon().from("posts").delete().neq("slug", "");
      expect((await service().from("posts").select("id", { count: "exact", head: true })).count).toBe(before);
    });

    test("cannot add page views or read the log or analytics", async () => {
      expect((await anon().from("page_views").insert({ path: "/blog/sync-without-fear", visitor: "e2e-visitor" })).error?.code).toBe("42501");
      expect((await anon().from("page_views").select("*")).data ?? []).toEqual([]);
      const summary = await anon().rpc("analytics_summary", { days: 7 });
      expect(summary.data?.views ?? 0).toBe(0);
      expect((await anon().from("page_views").insert({ path: "no-slash", visitor: "e2e-visitor" })).error).not.toBeNull(); // path must start with /
    });

    test("a server-recorded view of a post raises its counter", async () => {
      const read = async () => (await service().from("posts").select("views").eq("slug", "sync-without-fear").single()).data!.views as number;
      const before = await read();
      expect((await service().from("page_views").insert({ path: "/blog/sync-without-fear", visitor: "e2e-visitor" })).error).toBeNull();
      expect(await read()).toBe(before + 1);
    });

    test("cannot upload to the media bucket", async () => {
      const { error } = await anon().storage.from("media").upload(`e2e-${Date.now()}.png`, new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }));
      expect(error).not.toBeNull();
    });
  });

  test("a signed-in user who is not an admin cannot write", async () => {
    const sb = await signedInClient(other, { mfa: true }); // even with MFA: not on the list
    expect((await sb.rpc("is_admin")).data).toBe(false);
    expect((await sb.from("projects").insert({ slug: "e2e-evil", title: "evil" })).error?.code).toBe("42501");
  });

  test("public keys cannot bypass contact or telemetry validation, including signed-in users", async () => {
    for (const sb of [anon(), await signedInClient(other)]) {
      expect((await sb.from("messages").insert({ source: "contact", kind: "message", severity: "info", from_email: "e2e@test.local", subject: "spam", body: "spam" })).error?.code).toBe("42501");
      expect((await sb.from("web_vitals").insert({ metric: "LCP", value: 1, rating: "good", path: "/", device: "desktop" })).error?.code).toBe("42501");
      expect((await sb.from("page_views").insert({ path: "/", visitor: "e2e-bypass" })).error?.code).toBe("42501");
      expect((await sb.rpc("reserve_contact", { p_email: "bypass", p_network: "bypass" })).error).not.toBeNull();
    }
  });

  test("parallel contact requests cannot exceed the email quota", async () => {
    const key = `e2e-quota-${Date.now()}`;
    try {
      const results = await Promise.all(Array.from({ length: 8 }, () => service().rpc("reserve_contact", { p_email: key, p_network: key })));
      expect(results.every((r) => !r.error)).toBe(true);
      expect(results.filter((r) => r.data === true)).toHaveLength(3);
    } finally { await service().from("auth_attempts").delete().eq("key", key); }
  });

  test("an admin who has only typed a password (no second factor) can do nothing special", async () => {
    const sb = await signedInClient(admin);
    expect((await sb.rpc("is_admin")).data).toBe(false);
    expect((await sb.from("projects").insert({ slug: "e2e-needs-mfa", title: "needs mfa" })).error?.code).toBe("42501");
    expect(((await sb.from("posts").select("slug").eq("status", "draft")).data ?? []).length).toBe(0);
    expect((await sb.storage.from("media").upload("e2e-aal1.png", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }))).error).not.toBeNull();
  });

  test("an admin with the second factor (aal2) can read drafts, write, upload and see analytics", async () => {
    const sb = await signedInClient(admin, { mfa: true });
    expect((await sb.rpc("is_admin")).data).toBe(true);
    expect(((await sb.from("posts").select("slug").eq("status", "draft")).data ?? []).length).toBeGreaterThan(0);

    const created = await sb.from("projects").insert({ slug: "e2e-aal2", title: "aal2 project" }).select("id").single();
    expect(created.error).toBeNull();
    expect((await sb.from("projects").update({ title: "renamed" }).eq("id", created.data!.id).select("title").single()).data!.title).toBe("renamed");
    expect((await sb.from("projects").delete().eq("id", created.data!.id)).error).toBeNull();

    const path = `e2e-${Date.now()}.png`;
    const upload = await sb.storage.from("media").upload(path, new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), { contentType: "image/png" });
    expect(upload.error).toBeNull();
    await sb.storage.from("media").remove([path]);
    const bad = await sb.storage.from("media").upload(`e2e-${Date.now()}.txt`, new Blob(["not an image"], { type: "text/plain" }), { contentType: "text/plain" });
    expect(bad.error).not.toBeNull(); // only images are allowed

    const summary = await sb.rpc("analytics_summary", { days: 30 });
    expect(summary.error).toBeNull();
    expect(summary.data.daily).toHaveLength(30);
  });

  test("the data rules reject bad values", async () => {
    const sb = await signedInClient(admin, { mfa: true });
    const author = (await service().from("authors").select("id").limit(1).single()).data!.id;
    const bad = (row: object) => sb.from("posts").insert({ author_id: author, category: "engineering", ...row });
    expect((await bad({ slug: "Bad Slug", title: "t" })).error).not.toBeNull();
    expect((await bad({ slug: "e2e-long", title: "x".repeat(200) })).error).not.toBeNull();
    expect((await sb.from("socials").insert({ platform: "github", label: "E2E", handle: "", url: "javascript:alert(1)", profile_id: (await service().from("profile").select("id").single()).data!.id })).error).not.toBeNull();
  });
});
