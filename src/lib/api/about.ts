import { cacheLife } from "next/cache";
import { api } from "./client";
import type { ProfileResponse, SkillsResponse, TestimonialsResponse, ToolsResponse } from "./types";

const bySort = <T extends { sort_order: number }>(rows: T[]) => [...rows].sort((a, b) => a.sort_order - b.sort_order);

export async function getProfile() {
  "use cache";
  cacheLife("hours");
  const { data } = await api.get<ProfileResponse>("/profile");
  return { ...data.data, socials: bySort(data.data.socials) };
}

export async function getSkills() {
  "use cache";
  cacheLife("hours");
  const { data } = await api.get<SkillsResponse>("/skills");
  return bySort(data.data);
}

export async function getTools() {
  "use cache";
  cacheLife("hours");
  const { data } = await api.get<ToolsResponse>("/tools");
  return bySort(data.data);
}

export async function getTestimonials() {
  "use cache";
  cacheLife("hours");
  const { data } = await api.get<TestimonialsResponse>("/testimonials");
  return bySort(data.data);
}
