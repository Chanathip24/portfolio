import { expect, test } from "@playwright/test";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClientRestore } from "@tanstack/react-query-persist-client";
import { publicOnly } from "../../src/lib/api/queries";

const KEY = "public-query-cache";
const BUSTER = "build-1";

function setup(saved: string) {
  const items = new Map([[KEY, saved]]);
  const storage = {
    getItem: async (k: string) => items.get(k) ?? null,
    setItem: async (k: string, v: string) => void items.set(k, v),
    removeItem: async (k: string) => void items.delete(k),
  };
  const queryClient = new QueryClient();
  const persister = publicOnly(createAsyncStoragePersister({ storage, key: KEY }));
  return { items, queryClient, restore: () => persistQueryClientRestore({ queryClient, persister, buster: BUSTER }) };
}

const query = (queryKey: unknown[]) => ({
  queryKey,
  queryHash: JSON.stringify(queryKey),
  state: { data: "x", dataUpdateCount: 1, dataUpdatedAt: Date.now(), error: null, errorUpdateCount: 0, errorUpdatedAt: 0, fetchFailureCount: 0, fetchFailureReason: null, fetchMeta: null, isInvalidated: false, status: "success", fetchStatus: "idle" },
});

test("a forged saved copy restores only public queries and no mutations", async () => {
  const blob = {
    buster: BUSTER,
    timestamp: Date.now(),
    clientState: {
      queries: [query(["public", "work"]), query(["admin", "users"]), query(["publicx"])],
      mutations: [{ mutationKey: ["contact"], state: { status: "pending", variables: { email: "a@b.c" } } }],
    },
  };
  const { queryClient, restore } = setup(JSON.stringify(blob));
  await restore();
  expect(queryClient.getQueryCache().getAll().map((q) => q.queryKey)).toEqual([["public", "work"]]);
  expect(queryClient.getMutationCache().getAll()).toEqual([]);
});

test("a malformed saved copy does not throw out of the restore", async () => {
  for (const saved of ["{not json", JSON.stringify({ buster: BUSTER, timestamp: Date.now(), clientState: null })]) {
    const { items, queryClient, restore } = setup(saved);
    await expect(restore()).resolves.toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(items.has(KEY)).toBe(false);
  }
});
