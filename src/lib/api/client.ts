import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import career from "@/mock/api/career.json";
import postCategories from "@/mock/api/post-categories.json";
import projectCategories from "@/mock/api/project-categories.json";
import skillGroups from "@/mock/api/skill-groups.json";
import postDetails from "@/mock/api/post-details.json";
import posts from "@/mock/api/posts.json";
import details from "@/mock/api/project-details.json";
import projects from "@/mock/api/projects.json";
import profile from "@/mock/api/profile.json";
import skills from "@/mock/api/skills.json";
import testimonials from "@/mock/api/testimonials.json";
import tools from "@/mock/api/tools.json";
import { supabaseConfigured } from "@/lib/supabase/env";
import { fromSupabase } from "./supabase-source";

// Requests are answered from Supabase when it is configured (NEXT_PUBLIC_SUPABASE_URL), otherwise from the
// sample responses in src/mock/api. Set API_URL to send them to another server instead; call sites don't change.
const routes: Record<string, unknown> = {
  "/projects": projects,
  "/posts": posts,
  "/profile": profile,
  "/career": career,
  "/post-categories": postCategories,
  "/project-categories": projectCategories,
  "/skill-groups": skillGroups,
  "/skills": skills,
  "/tools": tools,
  "/testimonials": testimonials,
};

const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
  const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
  if (status < 400) return Promise.resolve(response);
  return Promise.reject(new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response));
};

const mockAdapter: AxiosAdapter = (config) => {
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
