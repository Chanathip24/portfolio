import { expect, test } from "@playwright/test";
import { anon, createUser, deleteUser, service, signedInClient, type TestUser } from "../support/db";

// The rules added for categories, groups, scheduled publishing, the audit log, settings and admin management.
test.describe("admin database features", () => {
  let admin: TestUser, other: TestUser, plain: TestUser;
  test.beforeAll(async () => { admin = await createUser(); other = await createUser(); plain = await createUser({ admin: false }); });
  test.afterAll(async () => {
    const sb = service();
    await sb.from("posts").delete().like("slug", "e2e%");
    await sb.from("projects").delete().like("slug", "e2e%");
    await sb.from("post_categories").delete().like("slug", "e2e%");
    await sb.from("project_categories").delete().like("slug", "e2e%");
    await sb.from("skill_groups").delete().like("slug", "e2e%");
    await sb.from("app_settings").update({ data_tools_enabled: false }).eq("id", true);
    for (const u of [admin, other, plain]) await deleteUser(u.id);
  });
  const author = async () => (await service().from("authors").select("id").limit(1).single()).data!.id as string;

  test.describe("categories and groups", () => {
    test("visitors can read them but not change them", async () => {
      for (const table of ["post_categories", "project_categories", "skill_groups"]) {
        expect(((await anon().from(table).select("slug")).data ?? []).length).toBeGreaterThan(0);
        expect((await anon().from(table).insert({ slug: "e2e-x", name: "x" })).error?.code).toBe("42501");
      }
    });

    test("an admin manages them; a category in use cannot be deleted or renamed away", async () => {
      const sb = await signedInClient(admin, { mfa: true });
      expect((await sb.from("post_categories").insert({ slug: "e2e-notes", name: "E2E Notes" })).error).toBeNull();
      const post = await sb.from("posts").insert({ slug: "e2e-in-category", title: "t", category: "e2e-notes", author_id: await author() }).select("id").single();
      expect(post.error).toBeNull();
      expect((await sb.from("post_categories").delete().eq("slug", "e2e-notes")).error?.code).toBe("23503"); // still used
      expect((await sb.from("post_categories").update({ slug: "e2e-renamed" }).eq("slug", "e2e-notes")).error).not.toBeNull();
      expect((await sb.from("post_categories").update({ name: "E2E Renamed" }).eq("slug", "e2e-notes")).error).toBeNull(); // the display name can change
      expect((await sb.from("posts").insert({ slug: "e2e-bad-cat", title: "t", category: "no-such", author_id: await author() })).error?.code).toBe("23503");
      await sb.from("posts").delete().eq("id", post.data!.id);
      expect((await sb.from("post_categories").delete().eq("slug", "e2e-notes")).error).toBeNull(); // free now
    });

    test("project categories are checked in the tags array, and a used one is protected", async () => {
      const sb = await signedInClient(admin, { mfa: true });
      await sb.from("project_categories").insert({ slug: "e2e-tag", name: "E2E Tag" });
      expect((await sb.from("projects").insert({ slug: "e2e-bad-tag", title: "t", tags: ["no-such"] })).error?.code).toBe("23503");
      const project = await sb.from("projects").insert({ slug: "e2e-tagged", title: "t", tags: ["e2e-tag"] }).select("id").single();
      expect(project.error).toBeNull();
      expect((await sb.from("project_categories").delete().eq("slug", "e2e-tag")).error?.code).toBe("23503");
      await sb.from("projects").delete().eq("id", project.data!.id);
      expect((await sb.from("project_categories").delete().eq("slug", "e2e-tag")).error).toBeNull();
    });

    test("skill groups are protected the same way", async () => {
      const sb = await signedInClient(admin, { mfa: true });
      await sb.from("skill_groups").insert({ slug: "e2e-group", name: "E2E Group" });
      const skill = await sb.from("skills").insert({ name: "E2E skill", group: "e2e-group", years: 1 }).select("id").single();
      expect((await sb.from("skill_groups").delete().eq("slug", "e2e-group")).error?.code).toBe("23503");
      await sb.from("skills").delete().eq("id", skill.data!.id);
      expect((await sb.from("skill_groups").delete().eq("slug", "e2e-group")).error).toBeNull();
    });
  });

  test("scheduled publishing: a published post shows to visitors only from its own date", async () => {
    const sb = await signedInClient(admin, { mfa: true });
    const a = await author();
    const future = await sb.from("posts").insert({ slug: "e2e-future", title: "future", category: "engineering", status: "published", published_at: new Date(Date.now() + 3_600_000).toISOString(), author_id: a });
    const past = await sb.from("posts").insert({ slug: "e2e-past", title: "past", category: "engineering", status: "published", published_at: new Date(Date.now() - 3_600_000).toISOString(), author_id: a });
    expect(future.error).toBeNull(); expect(past.error).toBeNull();
    const seen = ((await anon().from("posts").select("slug").like("slug", "e2e-%")).data ?? []).map((r) => r.slug);
    expect(seen).toContain("e2e-past");
    expect(seen).not.toContain("e2e-future");
    const adminSees = ((await sb.from("posts").select("slug").like("slug", "e2e-%")).data ?? []).map((r) => r.slug);
    expect(adminSees).toContain("e2e-future"); // the admin still sees it, to edit it

    const project = await sb.from("projects").insert({ slug: "e2e-later", title: "later", status: "published", published_at: new Date(Date.now() + 3_600_000).toISOString() });
    expect(project.error).toBeNull();
    expect(((await anon().from("projects").select("slug").eq("slug", "e2e-later")).data ?? []).length).toBe(0);
  });

  test.describe("audit log", () => {
    test("records who changed what, and only an admin can read it", async () => {
      const sb = await signedInClient(admin, { mfa: true });
      await sb.from("project_categories").insert({ slug: "e2e-audit", name: "E2E Audit" });
      await sb.from("project_categories").update({ name: "E2E Audit 2" }).eq("slug", "e2e-audit");
      await sb.from("project_categories").delete().eq("slug", "e2e-audit");
      const log = (await sb.from("audit_log").select("action,entity,summary,actor_email").eq("entity", "project_categories").order("id", { ascending: false }).limit(3)).data!;
      expect(log.map((l) => l.action)).toEqual(["deleted", "updated", "created"]);
      expect(log[0].actor_email).toBe(admin.email);
      expect(log[1].summary).toBe("E2E Audit 2");
      expect((await anon().from("audit_log").select("id")).data ?? []).toEqual([]);
      expect(((await (await signedInClient(plain, { mfa: true })).from("audit_log").select("id")).data ?? [])).toEqual([]);
    });

    test("the page-view counter and seeds do not flood it", async () => {
      const before = (await service().from("audit_log").select("id", { count: "exact", head: true })).count;
      await anon().from("page_views").insert({ path: "/blog/sync-without-fear", visitor: "e2e-audit" }); // bumps posts.views through a trigger
      expect((await service().from("audit_log").select("id", { count: "exact", head: true })).count).toBe(before);
    });

    test("events are written through log_event, by admins only", async () => {
      const sb = await signedInClient(admin, { mfa: true });
      expect((await sb.rpc("log_event", { p_entity: "users", p_summary: "Created user e2e@example.com" })).error).toBeNull();
      expect((await sb.from("audit_log").select("action,summary").eq("entity", "users").order("id", { ascending: false }).limit(1)).data![0]).toMatchObject({ action: "event", summary: "Created user e2e@example.com" });
      expect((await anon().rpc("log_event", { p_entity: "users", p_summary: "nope" })).error).not.toBeNull();
      expect((await (await signedInClient(plain, { mfa: true })).rpc("log_event", { p_entity: "users", p_summary: "nope" })).error).not.toBeNull();
    });
  });

  test.describe("admin management", () => {
    test("admin_status lists the admins, with their second-factor state, to admins only", async () => {
      const sb = await signedInClient(admin, { mfa: true });
      const rows = (await sb.rpc("admin_status")).data as { email: string; mfa_enabled: boolean }[];
      expect(rows.find((r) => r.email === admin.email)?.mfa_enabled).toBe(true);
      expect(rows.some((r) => r.email === plain.email)).toBe(false);
      expect(((await (await signedInClient(plain, { mfa: true })).rpc("admin_status")).data ?? [])).toEqual([]);
      expect((await anon().rpc("admin_status")).error).not.toBeNull();
    });

    test("set_admin_flag promotes and demotes others, never yourself, and only for admins", async () => {
      const sb = await signedInClient(admin, { mfa: true });
      expect((await sb.rpc("set_admin_flag", { target: plain.id, make: true })).error).toBeNull();
      expect((await service().from("admins").select("user_id").eq("user_id", plain.id)).data).toHaveLength(1);
      expect((await sb.rpc("set_admin_flag", { target: plain.id, make: false })).error).toBeNull();
      expect((await service().from("admins").select("user_id").eq("user_id", plain.id)).data).toHaveLength(0);
      const self = await sb.rpc("set_admin_flag", { target: admin.id, make: false });
      expect(self.error?.message).toMatch(/your own admin access/);
      expect((await sb.rpc("set_admin_flag", { target: "00000000-0000-4000-8000-00000000dead", make: true })).error?.message).toMatch(/No such user/);
      const outsider = await signedInClient(plain, { mfa: true });
      expect((await outsider.rpc("set_admin_flag", { target: plain.id, make: true })).error?.code).toBe("42501"); // not an admin: cannot make themselves one
      expect((await anon().rpc("set_admin_flag", { target: plain.id, make: true })).error).not.toBeNull();
    });

    test("another admin can be removed, and it is recorded", async () => {
      const sb = await signedInClient(admin, { mfa: true });
      expect((await sb.rpc("set_admin_flag", { target: other.id, make: false })).error).toBeNull();
      const last = (await sb.from("audit_log").select("summary").eq("entity", "admins").order("id", { ascending: false }).limit(1)).data![0];
      expect(last.summary).toContain(other.email);
    });
  });

  test("settings: only an admin reads or changes them", async () => {
    expect((await anon().from("app_settings").select("*")).data ?? []).toEqual([]);
    const sb = await signedInClient(admin, { mfa: true });
    expect((await sb.from("app_settings").update({ data_tools_enabled: true }).eq("id", true).select("data_tools_enabled")).data![0].data_tools_enabled).toBe(true);
    const hacked = await anon().from("app_settings").update({ data_tools_enabled: false }).eq("id", true).select();
    expect(hacked.data ?? []).toEqual([]);
    expect((await service().from("app_settings").select("data_tools_enabled").single()).data!.data_tools_enabled).toBe(true);
  });

  test("tools can carry a logo address, but only http(s) or a path", async () => {
    const sb = await signedInClient(admin, { mfa: true });
    const ok = await sb.from("tools").insert({ name: "E2E Tool", logo_url: "https://example.com/logo.png" }).select("id").single();
    expect(ok.error).toBeNull();
    expect((await sb.from("tools").insert({ name: "E2E Bad", logo_url: "javascript:alert(1)" })).error).not.toBeNull();
    await sb.from("tools").delete().like("name", "E2E%");
  });

  test("the media bucket is listable by an admin and not by a visitor", async () => {
    const sb = await signedInClient(admin, { mfa: true });
    expect((await sb.storage.from("media").list("", { limit: 5 })).error).toBeNull();
    expect(((await anon().storage.from("media").list("", { limit: 5 })).data ?? []).length).toBe(0);
  });
});

test.describe("section analytics", () => {
  let admin: TestUser, plain: TestUser;
  test.beforeAll(async () => { admin = await createUser(); plain = await createUser({ admin: false }); });
  test.afterAll(async () => { await service().from("page_views").delete().like("visitor", "e2e-pa%"); for (const u of [admin, plain]) await deleteUser(u.id); });

  test("section_analytics counts one post or all posts for an admin, and shows nothing to anyone else", async () => {
    await service().from("page_views").insert([
      { path: "/blog/e2e-pa-one", visitor: "e2e-pa1" }, { path: "/blog/e2e-pa-one", visitor: "e2e-pa2" }, { path: "/blog/e2e-pa-two", visitor: "e2e-pa1", referrer: "https://example.org/" },
    ]);
    const sb = await signedInClient(admin, { mfa: true });
    const one = (await sb.rpc("section_analytics", { p_prefix: "/blog/", p_path: "/blog/e2e-pa-one", days: 7 })).data;
    expect(one.views).toBe(2);
    expect(one.visitors).toBe(2);
    expect(one.daily).toHaveLength(7);
    const all = (await sb.rpc("section_analytics", { p_prefix: "/blog/", days: 7 })).data;
    expect(all.top.map((p: { path: string }) => p.path)).toEqual(expect.arrayContaining(["/blog/e2e-pa-one", "/blog/e2e-pa-two"]));
    expect(all.referrers[0].referrer).toBe("https://example.org/");

    expect((await anon().rpc("section_analytics", { p_prefix: "/blog/", days: 7 })).data?.views ?? 0).toBe(0);
    expect(((await (await signedInClient(plain)).rpc("section_analytics", { p_prefix: "/blog/", days: 7 })).data?.views) ?? 0).toBe(0);
  });
});

test.describe("revisions", () => {
  let admin: TestUser, plain: TestUser;
  test.beforeAll(async () => { admin = await createUser(); plain = await createUser({ admin: false }); });
  test.afterAll(async () => {
    await service().from("posts").delete().like("slug", "e2e%");
    await service().from("revisions").delete().like("label", "e2e%");
    for (const u of [admin, plain]) await deleteUser(u.id);
  });

  test("a signed-in admin's changes keep the old row; the service key, the view counter and visitors do not; only admins read them", async () => {
    const sb = service();
    const author = (await sb.from("authors").select("id").limit(1).single()).data!.id as string;
    const cat = (await sb.from("post_categories").select("slug").limit(1).single()).data!.slug as string;
    const { data: post } = await sb.from("posts").insert({ slug: "e2e-rev", title: "e2e rev one", author_id: author, category: cat, status: "published" }).select("id").single();
    const id = post!.id as string;
    const count = async () => (await sb.from("revisions").select("id").eq("row_id", id)).data?.length ?? 0;

    await sb.from("posts").update({ title: "e2e rev two" }).eq("id", id); // service key: no signed-in user
    expect(await count()).toBe(0);
    await anon().from("page_views").insert({ path: "/blog/e2e-rev", visitor: "e2e-rev-visitor" }); // a visit raises the view counter
    expect((await sb.from("posts").select("views").eq("id", id).single()).data!.views).toBe(1);
    expect(await count()).toBe(0);

    const adminDb = await signedInClient(admin, { mfa: true });
    expect((await adminDb.from("posts").update({ title: "e2e rev three" }).eq("id", id).select("id")).data).toHaveLength(1);
    const kept = (await adminDb.from("revisions").select("action,label,data").eq("row_id", id)).data!;
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ action: "updated", label: "e2e rev two" });
    expect((kept[0].data as { title: string }).title).toBe("e2e rev two");

    // saving the same values again is not a change
    await adminDb.from("posts").update({ title: "e2e rev three" }).eq("id", id);
    expect(await count()).toBe(1);

    // a deletion keeps the whole row so it can be put back
    await adminDb.from("posts").delete().eq("id", id);
    expect((await sb.from("revisions").select("action").eq("row_id", id).eq("action", "deleted")).data).toHaveLength(1);

    expect((await anon().from("revisions").select("id")).data ?? []).toEqual([]);
    expect(((await (await signedInClient(plain)).from("revisions").select("id")).data) ?? []).toEqual([]);
    expect((await adminDb.from("revisions").delete().eq("row_id", id).select("id")).data ?? []).toEqual([]); // nobody can rewrite history through the API
  });
});
