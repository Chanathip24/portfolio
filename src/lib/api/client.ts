import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { supabaseConfigured } from "@/lib/supabase/env";
import { fromSupabase } from "./supabase-source";

// Requests are answered from Supabase when it is configured (NEXT_PUBLIC_SUPABASE_URL), otherwise from the
// sample responses in src/mock/api. Set API_URL to send them to another server instead; call sites don't change.
// The sample responses are only needed when Supabase is not configured, so they are loaded on first use (and then kept)
// instead of being part of the server bundle every cold start.
const json = (name: string) => import(`@/mock/api/${name}.json`).then((m) => m.default as unknown);
type Mock = { routes: Record<string, unknown>; details: Record<string, unknown>; postDetails: Record<string, unknown> };
let mock: Promise<Mock> | undefined;
const loadMock = () =>
  (mock ??= Promise.all(
    ["projects", "posts", "profile", "career", "post-categories", "project-categories", "skill-groups", "skills", "tools", "testimonials", "project-details", "post-details"].map(json),
  ).then(([projects, posts, profile, career, postCategories, projectCategories, skillGroups, skills, tools, testimonials, details, postDetails]): Mock => ({
    routes: {
      "/projects": projects, "/posts": posts, "/profile": profile, "/career": career, "/post-categories": postCategories,
      "/project-categories": projectCategories, "/skill-groups": skillGroups, "/skills": skills, "/tools": tools, "/testimonials": testimonials,
    },
    details: details as Record<string, unknown>,
    postDetails: postDetails as Record<string, unknown>,
  })));

const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
  const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
  if (status < 400) return Promise.resolve(response);
  return Promise.reject(new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response));
};

const mockAdapter: AxiosAdapter = async (config) => {
  const { routes, details, postDetails } = await loadMock();
  const url = config.url ?? "";
  if (url in routes) return respond(config, 200, routes[url]);
  // /projects/:slug and /posts/:slug
  const [, kind, slug] = /^\/(projects|posts)\/([^/]+)$/.exec(url) ?? [];
  if (kind) {
    const table: Record<string, unknown> = kind === "projects" ? details : postDetails;
    const detail = Object.hasOwn(table, slug) ? table[slug] : null;
    return respond(config, detail ? 200 : 404, detail ?? { error: "Not found" });
  }
  return respond(config, 404, { error: "Not found" });
};

const supabaseAdapter: AxiosAdapter = async (config) => {
  const { status, data } = await fromSupabase(config.url ?? "");
  return respond(config, status, data);
};

export const api = axios.create({
  baseURL: process.env.API_URL,
  adapter: process.env.API_URL ? undefined : supabaseConfigured ? supabaseAdapter : mockAdapter,
});
