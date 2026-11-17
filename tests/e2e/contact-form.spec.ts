import type { Page } from "@playwright/test";
import { expect, test } from "../support/fixtures";
import { service } from "../support/db";
import { settled } from "../support/settled";

// The "Ask me anything else" form on the home page (src/components/small-talk.tsx, a TanStack Query mutation), against the real
// /api/contact and local Supabase. Runs on the phone (390px) and the desktop projects.
const rand = () => Math.random().toString(36).slice(2, 8);
const sender = () => `e2e-tq-${rand()}@example.com`;

/** Opens the home page as a visitor from an address of its own, so the per-network quota never carries over between tests. */
async function open(page: Page) {
  const ip = `198.51.100.${1 + Math.floor(Math.random() * 250)}`;
  // Only on the form's request: as a page-wide header it would also go to the third-party font host, which refuses it (CORS).
  await page.route("**/api/contact", (route) => route.continue({ headers: { ...route.request().headers(), "x-test-ip": ip } }));
  await page.goto("/");
  await settled(page);
  return {
    ip,
    question: page.getByLabel("Ask me anything else"),
    email: page.getByLabel("Your email, so I can reply"),
    send: page.getByRole("button", { name: "Send question" }),
    status: page.getByRole("status").filter({ hasText: /\S/ }),
  };
}
const stored = async (email: string) => (await service().from("messages").select("body").eq("from_email", email)).data ?? [];

test.describe("contact form", () => {
  test.afterAll(async () => { await service().from("messages").delete().like("from_email", "e2e-tq-%"); });

  test("is disabled until there is a question and an email and while sending; a sent question clears the form and shows the reply", async ({ page }) => {
    const who = sender();
    const f = await open(page);
    await expect(f.send).toBeDisabled();
    await f.question.fill("e2e hello from the TanStack form test");
    await expect(f.send).toBeDisabled(); // no email yet
    await f.email.fill(who);
    await expect(f.send).toBeEnabled();

    // Hold the request until the button has been seen disabled.
    let release!: () => void;
    const held = new Promise<void>((r) => { release = r; });
    await page.route("**/api/contact", async (route) => { await held; await route.fallback(); });
    await f.send.click();
    await expect(f.send).toBeDisabled();
    release();

    await expect(f.status).toHaveText("Sent. Thank you, I will write back.");
    await expect(f.question).toHaveValue("");
    await expect(f.email).toHaveCount(0); // the email field shows only while there is a question
    expect(await stored(who)).toEqual([{ body: "e2e hello from the TanStack form test" }]);
  });

  test("a refusal from the server shows the server's message and keeps what was typed", async ({ page }) => {
    const who = sender();
    const f = await open(page);
    // Three messages an hour per email: use them up first, from the same address.
    for (let i = 0; i < 3; i++) expect((await page.request.post("/api/contact", { data: { email: who, message: `e2e quota ${i}` }, headers: { "x-test-ip": f.ip } })).status()).toBe(201);
    await f.question.fill("e2e one too many");
    await f.email.fill(who);
    await f.send.click();
    await expect(f.status).toHaveText("That is a few messages already. Give it a little while before sending another.");
    await expect(f.question).toHaveValue("e2e one too many");
    await expect(f.email).toHaveValue(who);
    await expect(f.send).toBeEnabled();
    expect(await stored(who)).toHaveLength(3);
  });

  test("offline, it says to check the connection instead of waiting", async ({ page, context }) => {
    const who = sender();
    const f = await open(page);
    await f.question.fill("e2e offline question");
    await f.email.fill(who);
    await context.setOffline(true);
    await f.send.click();
    await expect(f.status).toHaveText("Could not send that. Check your connection.");
    await expect(f.question).toHaveValue("e2e offline question");
    await context.setOffline(false);
    expect(await stored(who)).toEqual([]);
  });

  test("a bot that fills the hidden field gets 204 and \"Sent.\", and nothing is stored", async ({ page }) => {
    const who = sender();
    const f = await open(page);
    await f.question.fill("e2e bot question");
    await f.email.fill(who);
    await page.locator("input[name=website]").evaluate((el: HTMLInputElement) => { el.value = "http://spam.example"; });
    const reply = page.waitForResponse("**/api/contact");
    await f.send.click();
    expect((await reply).status()).toBe(204);
    await expect(f.status).toHaveText("Sent.");
    await expect(f.question).toHaveValue("");
    expect(await stored(who)).toEqual([]);
  });
});
