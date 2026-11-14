import { expect, test } from "@playwright/test";
import { PAGE_ROWS, allRows } from "../../src/lib/admin/paging";

// allRows is what lets the admin lists go past the API's 1000-row cap, so its edges are checked against a fake pager.
const pager = (total: number) => {
  const calls: [number, number][] = [];
  const rows = Array.from({ length: total }, (_, i) => i);
  return { calls, page: async (from: number, to: number) => { calls.push([from, to]); return { data: rows.slice(from, to + 1) }; } };
};

test.describe("allRows", () => {
  for (const [total, requests] of [[0, 1], [1, 1], [999, 1], [1000, 2], [1001, 2], [2500, 3]] as const) {
    test(`${total} rows: all of them, in order, in ${requests} request${requests === 1 ? "" : "s"}`, async () => {
      const p = pager(total);
      const got = await allRows(p.page);
      expect(got).toHaveLength(total);
      expect(got).toEqual(Array.from({ length: total }, (_, i) => i));
      expect(p.calls).toHaveLength(requests);
      expect(p.calls[0]).toEqual([0, PAGE_ROWS - 1]);
    });
  }

  test("stops at the safety limit instead of looping forever", async () => {
    const p = pager(1_000_000);
    expect((await allRows(p.page, 3000))).toHaveLength(3000);
    expect(p.calls).toHaveLength(3);
  });

  test("a failed page (no data) ends the read with what it has", async () => {
    let n = 0;
    const got = await allRows(async () => (n++ === 0 ? { data: Array.from({ length: PAGE_ROWS }, (_, i) => i) } : { data: null }));
    expect(got).toHaveLength(PAGE_ROWS);
  });
});
