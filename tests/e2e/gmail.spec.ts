import { expect, test } from "../support/fixtures";
import { service } from "../support/db";

const MOCK = `http://localhost:${process.env.MOCK_GOOGLE_PORT ?? "3199"}`;
const mock = async (path: string) => (await fetch(`${MOCK}${path}`)).json() as Promise<{ expired: boolean; revoked: string[] }>;
const row = async () => (await service().from("mail_connection").select("*").eq("id", true).single()).data!;

// The consent screen, Google's token endpoint and Gmail are a fake (tests/support/mock-google.mjs); the app talks to it exactly as it would to Google.
test.describe.serial("connecting Gmail with one click", () => {
  const reset = async () => {
    await mock("/__reset");
    await service().from("mail_connection").update({ client_id: "", client_secret_enc: "", refresh_token_enc: null, account_email: null, connected_at: null, expired: false }).eq("id", true);
    await service().from("messages").delete().in("external_id", ["<m1@mock.test>", "<m2@mock.test>"]);
  };
  test.beforeAll(reset);
  test.afterAll(reset);

  test("there is no Connect button until the Google client is saved, and the secret is stored encrypted", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("link", { name: "Connect Gmail" })).toHaveCount(0);
    await expect(page.locator("code", { hasText: "/api/gmail/callback" })).toBeVisible(); // the address to give Google
    await page.getByLabel("Client ID").fill("1234567890-test.apps.googleusercontent.com");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("p[role=alert]")).toContainText("client secret");
    await page.getByLabel("Client secret").fill("good-secret");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    const saved = await row();
    expect(saved.client_secret_enc).not.toContain("good-secret");
    expect(saved.client_secret_enc.split(".")).toHaveLength(3); // iv.tag.ciphertext
    await expect(page.getByRole("link", { name: "Connect Gmail" })).toBeVisible();
    await expect(page.getByLabel("Client secret")).toHaveAttribute("placeholder", /Saved/); // never shown back
  });

  test("one click goes to Google and back, and the refresh token is kept encrypted", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByRole("link", { name: "Connect Gmail" }).click();
    await expect(page).toHaveURL(/\/admin\/inbox\?gmail=connected/);
    await expect(page.getByText("Gmail: mock.owner@gmail.test")).toBeVisible();
    const saved = await row();
    expect(saved.account_email).toBe("mock.owner@gmail.test");
    expect(saved.refresh_token_enc).not.toContain("RT-secret");
    const log = (await service().from("audit_log").select("summary").eq("entity", "settings")).data!.map((l) => l.summary);
    expect(log.some((s) => s.includes("Connected Gmail"))).toBe(true);
  });

  test("a callback with the wrong state is refused", async ({ page }) => {
    const res = await page.request.get("/api/gmail/callback?code=GOOD&state=forged", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toContain("gmail=failed");
  });

  test("Sync Gmail brings the mail in as text, and a second sync adds nothing", async ({ page }) => {
    await page.goto("/admin/inbox");
    await page.getByRole("button", { name: "Sync Gmail" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Fetched 2 new messages." })).toBeVisible();
    await page.getByRole("listitem").filter({ hasText: "Hello from Gmail" }).click();
    await expect(page.getByRole("article")).toContainText("Ada Lovelace");
    await expect(page.getByRole("article")).toContainText("Plain body line one.");
    await page.getByRole("listitem").filter({ hasText: "HTML only" }).click();
    const body = page.getByRole("article");
    await expect(body).toContainText("Only html here");
    await expect(body).not.toContainText("alert(1)"); // scripts and styles are dropped, tags never rendered
    expect(await body.locator("b, script, style").count()).toBe(0);
    await page.getByRole("button", { name: "Sync Gmail" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Nothing new in Gmail." })).toBeVisible();
  });

  test("when Google ends the grant the inbox says so and offers Reconnect", async ({ page }) => {
    await mock("/__expire");
    await page.goto("/admin/inbox");
    await page.getByRole("button", { name: "Sync Gmail" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("Google ended the Gmail connection");
    await page.reload();
    await expect(page.getByRole("link", { name: "Reconnect Gmail" })).toBeVisible();
    expect((await row()).expired).toBe(true);
    await mock("/__reset");
    await page.getByRole("link", { name: "Reconnect Gmail" }).click(); // client is saved, so it goes straight to Google
    await expect(page).toHaveURL(/gmail=connected/);
    expect((await row()).expired).toBe(false);
  });

  test("Disconnect revokes the grant at Google and deletes the token", async ({ page }) => {
    const token = (await row()).refresh_token_enc;
    expect(token).toBeTruthy();
    await page.goto("/admin/settings");
    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Gmail is disconnected." })).toBeVisible();
    expect((await row()).refresh_token_enc).toBeNull();
    expect((await mock("/__state")).revoked.some((t) => t.startsWith("RT-secret"))).toBe(true);
    await expect(page.getByRole("link", { name: "Connect Gmail" })).toBeVisible();
  });

  test("the connection is not readable through the public API, signed in or not", async ({ admin }) => {
    const { signedInClient } = await import("../support/db");
    const sb = await signedInClient(admin);
    expect((await sb.from("mail_connection").select("*")).data ?? []).toEqual([]);
  });
});
