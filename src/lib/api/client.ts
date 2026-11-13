import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import career from "@/mock/api/career.json";
import postDetails from "@/mock/api/post-details.json";
import posts from "@/mock/api/posts.json";
import details from "@/mock/api/project-details.json";
import projects from "@/mock/api/projects.json";
import profile from "@/mock/api/profile.json";
import skills from "@/mock/api/skills.json";
import testimonials from "@/mock/api/testimonials.json";
import tools from "@/mock/api/tools.json";

// Until the real API (Supabase) exists, requests are answered from src/mock/api. Set API_URL to send
// them to the real server instead; call sites don't change.
const routes: Record<string, unknown> = {
  "/projects": projects,
  "/posts": posts,
  "/profile": profile,
  "/career": career,
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

export const api = axios.create({
  baseURL: process.env.API_URL,
  adapter: process.env.API_URL ? undefined : mockAdapter,
});
