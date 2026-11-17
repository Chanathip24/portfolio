import type { Page } from "@playwright/test";
import { expect, test } from "../support/fixtures";
import { settled } from "../support/settled";

// The public pages' TanStack Query data (src/lib/api/queries.ts, src/app/providers.tsx): hydrated by the server, saved to localStorage,
// refreshed in the background once stale. Runs on the phone (390px) and the desktop projects.
const KEY = "public-query-cache";
type Saved = { buster: string; timestamp: number; clientState: { queries: { queryKey: unknown[]; state: { data: unknown; dataUpdatedAt: number } }[]; mutations: unknown[] } };
const saved = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), KEY) as Promise<Saved | null>;
const keys = (s: Saved | null) => (s?.clientState.queries ?? []).map((q) => JSON.stringify(q.queryKey)).sort();
/** Every /api/public request the page makes from now on. */
const publicCalls = (page: Page) => {
  const calls: string[] = [];
  page.on("request", (r) => { if (new URL(r.url()).pathname.startsWith("/api/public/")) calls.push(new URL(r.url()).pathname); });
  return calls;
};

test.describe("first load", () => {
  // What must hold still on each page. Shifts elsewhere are older than TanStack Query: the hero's words on /, and on /blog everything
  // under the existing "Loading posts…" fallback, which the list replaces in the browser (on desktop its cards still move once after
  // they appear, with the same data and no request; reported separately). So /blog checks only what the server drew.
  for (const [path, hydrated] of [["/", "[aria-label='Selected projects']"], ["/blog", "main > h1"], ["/about", "main"]]) {
    test(`${path} hydrates from the server: no loading fallback, nothing in its data moves`, async ({ page }) => {
      await page.addInitScript((selector) => {
        const w = window as unknown as { shifted: string[]; fallbacks: string[] };
        w.shifted = [];
        w.fallbacks = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as { hadRecentInput: boolean; sources: { node?: Node }[] }[]) {
            if (e.hadRecentInput) continue;
            for (const { node } of e.sources) {
              const el = node instanceof Element ? node : node?.parentElement;
              if (el?.closest(selector)) w.shifted.push(`${el.tagName} ${(el.textContent ?? "").slice(0, 40)}`);
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
        // Any short "Loading…" text that appears, except the blog's existing one around its search-params boundary.
        new MutationObserver((records) => {
          for (const r of records) for (const n of r.addedNodes) {
            const text = (n.textContent ?? "").trim();
            if (text.length < 60 && /loading/i.test(text) && text !== "Loading posts…") w.fallbacks.push(text);
          }
        }).observe(document, { childList: true, subtree: true });
      }, hydrated);
      await page.goto(path);
      await settled(page);
      await expect(page.locator(hydrated)).toBeVisible();
      const seen = await page.evaluate(() => { const w = window as unknown as { shifted: string[]; fallbacks: string[] }; return { shifted: w.shifted, fallbacks: w.fallbacks }; });
      expect(seen).toEqual({ shifted: [], fallbacks: [] });
      // Zero /api/public requests is asserted in the next test: here it would pass or fail with the server snapshot's age.
    });
  }

  test("a visitor who arrives after the server's copy is five minutes old still makes no /api/public request", async ({ page }) => {
    // The pages' hydration state is cached on the server ("minutes" on / and /blog, "hours" on /about), so its timestamp can be older than
    // the browser's five-minute staleTime. Moving the browser's clock forward plays a visitor who arrives then.
    const calls = publicCalls(page);
    await page.clock.setSystemTime(Date.now() + 6 * 60_000);
    const made: Record<string, string[]> = {};
    for (const path of ["/", "/blog", "/about"]) {
      await page.goto(path);
      await settled(page);
      made[path] = calls.splice(0);
    }
    expect(made).toEqual({ "/": [], "/blog": [], "/about": [] });
  });
});

test.describe("the saved copy", () => {
  test("holds only public queries, never a mutation, with a buster, also after the contact form and the admin", async ({ page }) => {
    // Each full load restores what the last one saved and adds its own query. The save is throttled, so wait for it before moving on.
    for (const [path, key] of [["/", "work"], ["/blog", "posts"], ["/about", "about"]]) {
      await page.goto(path);
      await settled(page);
      await expect.poll(async () => keys(await saved(page))).toContain(`["public","${key}"]`);
    }
    await expect.poll(async () => keys(await saved(page))).toEqual(['["public","about"]', '["public","posts"]', '["public","work"]']);
    const first = (await saved(page))!;
    expect(first.buster).toMatch(/\S/);
    expect(first.clientState.mutations).toEqual([]);

    // A contact form send is a mutation; it is not saved (the honeypot keeps the database out of this).
    await page.goto("/");
    await settled(page);
    await page.getByLabel("Ask me anything else").fill("e2e saved-copy check");
    await page.getByLabel("Your email, so I can reply").fill("e2e-tq-saved@example.com");
    await page.locator("input[name=website]").evaluate((el: HTMLInputElement) => { el.value = "http://bot.example"; });
    const before = (await saved(page))!.timestamp;
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(page.getByRole("status")).toHaveText("Sent.");
    await expect.poll(async () => (await saved(page))!.timestamp).toBeGreaterThan(before); // saved again after the mutation
    expect((await saved(page))!.clientState.mutations).toEqual([]);

    await page.goto("/admin");
    await expect(page.locator("main h1")).toBeVisible();
    await settled(page);
    const afterAdmin = (await saved(page))!;
    expect(afterAdmin.clientState.queries.every((q) => q.queryKey[0] === "public")).toBe(true);
    expect(afterAdmin.clientState.mutations).toEqual([]);
  });

  /** A saved copy that would win if it were read back: its "work" data carries a marker title and is newer than the server's. */
  const seedFrom = async (page: Page, change: (s: Saved) => void) => {
    await page.goto("/");
    await settled(page);
    await expect.poll(async () => keys(await saved(page))).toContain('["public","work"]');
    const copy = (await saved(page))!;
    const work = copy.clientState.queries.find((q) => q.queryKey[1] === "work")!;
    (work.state.data as { signature: { title: string }[] }).signature[0].title = "E2E saved marker";
    work.state.dataUpdatedAt = Date.now() + 60_000;
    change(copy);
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(copy)]);
    return copy;
  };

  test("a valid copy newer than the server's is used without a hydration error", async ({ page }) => {
    await seedFrom(page, () => {});
    await page.reload();
    await settled(page);
    await expect(page.getByText("E2E saved marker").first()).toBeVisible(); // newer data wins (providers.tsx)
  });

  for (const [name, change] of [
    ["from another build", (s: Saved) => { s.buster = "an-older-build"; }],
    ["older than a day", (s: Saved) => { s.timestamp = Date.now() - 25 * 60 * 60_000; }],
  ] as const) {
    test(`is discarded when it is ${name}`, async ({ page }) => {
      const { buster } = await seedFrom(page, change);
      await page.reload();
      await settled(page);
      await expect(page.getByText("E2E saved marker")).toHaveCount(0);
      await expect.poll(async () => JSON.stringify(await saved(page))).not.toContain("E2E saved marker"); // replaced by what the page hydrated
      expect((await saved(page))!.buster).not.toBe("an-older-build");
      if (name === "older than a day") expect((await saved(page))!.buster).toBe(buster);
    });
  }

  for (const [name, script] of [
    ["blocked (reading localStorage throws)", () => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } })],
    ["full (every localStorage call throws)", () => {
      for (const m of ["getItem", "setItem", "removeItem"] as const) {
        const real = Storage.prototype[m] as (...a: string[]) => unknown;
        // sessionStorage keeps working: only localStorage is under test
        Storage.prototype[m] = function (this: Storage, ...a: string[]) { if (this === window.localStorage) throw new DOMException("full", "QuotaExceededError"); return real.apply(this, a); } as never;
      }
    }],
  ] as const) {
    test(`a ${name} localStorage does not break the public pages`, async ({ page }) => {
      await page.addInitScript(script);
      for (const path of ["/", "/blog", "/about"]) {
        await page.goto(path);
        await settled(page);
        await expect(page.locator("main")).toBeVisible();
      }
      await page.goto("/");
      await expect(page.getByRole("region", { name: "Selected projects" }).getByRole("heading", { level: 3 }).first()).toBeVisible();
    });
  }
});

test("once stale, a window refocus fetches again and the new data replaces the old without a flash", async ({ page }) => {
  // Once armed, the route answers with the real data, one title changed, so the update is visible. Before that (a refetch on mount,
  // see the known bug above) it passes the real data through.
  let armed = false;
  await page.route("**/api/public/work", async (route) => {
    const res = await route.fetch();
    const data = await res.json();
    if (armed) data.signature[0].title = "E2E refreshed title";
    await route.fulfill({ response: res, json: data });
  });
  const calls = publicCalls(page);
  await page.goto("/");
  await settled(page);
  const work = page.getByRole("region", { name: "Selected projects" });
  const heading = work.getByRole("heading", { level: 3 }).first();
  await expect(heading).toBeVisible();
  const oldTitle = await heading.textContent();
  armed = true;
  calls.length = 0;

  // Count how often the section has no project heading at all while it refreshes.
  await page.evaluate(() => {
    const w = window as unknown as { empty: number };
    w.empty = 0;
    const section = document.querySelector("[aria-label='Selected projects']")!;
    new MutationObserver(() => { if (!section.querySelector("h3")) w.empty++; }).observe(section, { childList: true, subtree: true });
  });
  await page.clock.setSystemTime(Date.now() + 6 * 60_000); // past the five-minute staleTime, without waiting for it
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await expect(work.getByText("E2E refreshed title").first()).toBeVisible();
  expect(calls).toEqual(["/api/public/work"]);
  expect(oldTitle).not.toBe("E2E refreshed title");
  expect(await page.evaluate(() => (window as unknown as { empty: number }).empty)).toBe(0);
});
