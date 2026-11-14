/** Reads every row a query matches, one page at a time. The API hands back at most 1000 rows per request (and silently stops there), so a
 *  plain select on a long table would quietly drop rows. `page` must give a stable order (end with the primary key), or pages could
 *  overlap. `max` is a safety stop, not a promise: nothing here is meant to hold more. */
export const PAGE_ROWS = 1000;

export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>, max = 50_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE_ROWS) {
    const { data } = await page(from, from + PAGE_ROWS - 1);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE_ROWS) break;
  }
  return out;
}
