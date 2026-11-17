import { expect, test } from "@playwright/test";

// GET /api/public/[resource]: what TanStack Query refetches in the browser (src/lib/api/queries.ts).
// A documentation-range address per run: the limit counts per address in the server's memory, so each run needs its own.
const address = () => `2001:db8::${Math.floor(Math.random() * 0xffff).toString(16)}:${Math.floor(Math.random() * 0xffff).toString(16)}`;

test.describe("public reads", () => {
  const get = (request: import("@playwright/test").APIRequestContext, path: string, headers: Record<string, string> = {}) =>
    request.get(`/api/public/${path}`, { headers: { "x-test-ip": address(), ...headers } });

  test("posts, work and about answer 200 with the shape the components read", async ({ request, baseURL }) => {
    const posts = await get(request, "posts", { origin: baseURL! });
    expect(posts.status()).toBe(200);
    const p = await posts.json();
    expect(Object.keys(p).sort()).toEqual(["categories", "posts"]);
    expect(p.posts.length).toBeGreaterThan(0);
    expect(p.posts[0]).toMatchObject({ slug: expect.any(String), title: expect.any(String), category: expect.any(String), views: expect.any(Number), publishedAt: expect.any(String) });
    expect(p.categories[0]).toMatchObject({ slug: expect.any(String), name: expect.any(String) });

    const work = await (await get(request, "work")).json(); // no Origin header at all is a same-site read too
    expect(Object.keys(work).sort()).toEqual(["categories", "others", "signature"]);
    expect(work.signature[0]).toMatchObject({ slug: expect.any(String), title: expect.any(String), href: expect.any(String) });
    expect(Array.isArray(work.others) && Array.isArray(work.categories)).toBe(true);

    const about = await (await get(request, "about")).json();
    expect(Object.keys(about).sort()).toEqual(["career", "groups", "skills", "testimonials"]);
    for (const list of Object.values(about)) expect(Array.isArray(list)).toBe(true);
  });

  test("an unknown resource is 404, another site is 403", async ({ request }) => {
    const unknown = await get(request, "users");
    expect(unknown.status()).toBe(404);
    expect(await unknown.json()).toEqual({ message: "Not found." });
    const foreign = await get(request, "posts", { origin: "https://evil.example" });
    expect(foreign.status()).toBe(403);
    expect(await foreign.json()).toEqual({ message: "Not allowed." });
  });

  test("one address gets 120 reads a minute, then 429; another address is not affected", async ({ request }) => {
    const ip = address();
    const statuses = await Promise.all(Array.from({ length: 120 }, () => get(request, "work", { "x-test-ip": ip }).then((r) => r.status())));
    expect(statuses.every((s) => s === 200)).toBe(true);
    const over = await get(request, "work", { "x-test-ip": ip });
    expect(over.status()).toBe(429);
    expect(await over.json()).toEqual({ message: "Too many requests. Try again in a minute." });
    expect((await get(request, "work")).status()).toBe(200);
  });
});
