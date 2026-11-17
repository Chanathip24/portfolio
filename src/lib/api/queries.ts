import { queryOptions, type QueryKey } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";
import type { publicData } from "./public";

/** The public reads the browser keeps in TanStack Query. Every key starts with "public": only those are saved to localStorage
 *  (see providers.tsx), so anything else, such as admin data, never is. The server fills them in first (see public.ts). */
export const publicResources = ["posts", "work", "about"] as const;
export type PublicResource = (typeof publicResources)[number];
export const publicKey = (resource: PublicResource) => ["public", resource] as const;
export const isPublicKey = (key: QueryKey) => key[0] === "public" && (publicResources as readonly unknown[]).includes(key[1]);

/** Restores only public queries and no mutations: the saved copy is untrusted, and its timestamp and buster can be forged. */
export const publicOnly = (persister: Persister): Persister => ({
  ...persister,
  restoreClient: async () => {
    try {
      const saved = await persister.restoreClient();
      if (!saved) return undefined;
      const queries = saved.clientState.queries.filter((q) => Array.isArray(q.queryKey) && isPublicKey(q.queryKey));
      return { ...saved, clientState: { queries, mutations: [] } };
    } catch {
      await persister.removeClient(); // unreadable or the wrong shape: drop it rather than fail the restore
      return undefined;
    }
  },
});
type Data<R extends PublicResource> = Awaited<ReturnType<(typeof publicData)[R]>>;

const options = <R extends PublicResource>(resource: R) =>
  queryOptions({
    queryKey: publicKey(resource),
    queryFn: async ({ signal }): Promise<Data<R>> => {
      const res = await fetch(`/api/public/${resource}`, { signal });
      if (!res.ok) throw Object.assign(new Error(`Loading ${resource} failed (${res.status})`), { status: res.status });
      return res.json();
    },
    // a 4xx (403, 404, 429) will not change on retry; only network errors and 5xx are retried
    refetchOnMount: false, // the hydrated snapshot's age comes from "use cache", not from this visit
    retry: (failures, error) => failures < 3 && ((error as { status?: number }).status ?? 500) >= 500,
  });

export const publicQueries = { posts: options("posts"), work: options("work"), about: options("about") };
