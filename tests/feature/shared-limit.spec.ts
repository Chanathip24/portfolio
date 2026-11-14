import { expect, test } from "@playwright/test";
import { anon, service } from "../support/db";

// take_rate_slot: the limit that every server instance shares, kept in the database.
test.describe("shared rate limit", () => {
  const key = () => `e2e-limit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const take = async (k: string, max: number, seconds = 60) => (await service().rpc("take_rate_slot", { p_key: k, p_max: max, p_window_seconds: seconds })).data as boolean;
  test.afterAll(async () => { await service().from("rate_limits").delete().like("key", "e2e-limit-%"); });

  test("lets `max` calls through in a window, then refuses", async () => {
    const k = key();
    expect([await take(k, 3), await take(k, 3), await take(k, 3), await take(k, 3), await take(k, 3)]).toEqual([true, true, true, false, false]);
  });

  test("counts each key on its own", async () => {
    const [a, b] = [key(), key()];
    expect(await take(a, 1)).toBe(true);
    expect(await take(a, 1)).toBe(false);
    expect(await take(b, 1)).toBe(true);
  });

  test("starts a new window once the old one has ended", async () => {
    const k = key();
    expect(await take(k, 1, 1)).toBe(true);
    expect(await take(k, 1, 1)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(await take(k, 1, 1)).toBe(true);
  });

  test("a signed-out visitor cannot use it, nor read the table", async () => {
    const { error } = await anon().rpc("take_rate_slot", { p_key: key(), p_max: 5, p_window_seconds: 60 });
    expect(error).not.toBeNull();
    const { data } = await anon().from("rate_limits").select("key").limit(1);
    expect(data ?? []).toEqual([]);
  });
});
