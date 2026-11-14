import { isAxiosError } from "axios";
import { cacheLife, cacheTag } from "next/cache";
import { owner } from "@/content/site";
import { api } from "./client";
import type { CareerResponse, CategoriesResponse, ProfileResponse, ProfileRow, SkillsResponse, TestimonialsResponse, ToolsResponse } from "./types";

/** Shown until the profile is filled in (Admin, Profile), so a new, empty project still builds and the About page still opens. */
const blankProfile: ProfileRow = {
  id: "", display_name: owner.name, role: owner.role, location: owner.city, headline: "", status_note: "", years_experience: 0, image_url: "",
  bio: { type: "doc", content: [] }, socials: [],
};

const bySort = <T extends { sort_order: number }>(rows: T[]) => [...rows].sort((a, b) => a.sort_order - b.sort_order);

export async function getProfile() {
  "use cache";
  cacheLife("hours");
  cacheTag("about");
  try {
    const { data } = await api.get<ProfileResponse>("/profile");
    return { ...data.data, socials: bySort(data.data.socials) };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return blankProfile; // no profile row yet
    throw error;
  }
}

export async function getSkills() {
  "use cache";
  cacheLife("hours");
  cacheTag("about");
  const { data } = await api.get<SkillsResponse>("/skills");
  return bySort(data.data);
}

export async function getTools() {
  "use cache";
  cacheLife("hours");
  cacheTag("about");
  const { data } = await api.get<ToolsResponse>("/tools");
  return bySort(data.data);
}

export async function getTestimonials() {
  "use cache";
  cacheLife("hours");
  cacheTag("about");
  const { data } = await api.get<TestimonialsResponse>("/testimonials");
  return bySort(data.data);
}

export async function getCareer() {
  "use cache";
  cacheLife("hours");
  cacheTag("about");
  const { data } = await api.get<CareerResponse>("/career");
  return bySort(data.data);
}

/** Skill groups in the order the admin set. */
export async function getSkillGroups() {
  "use cache";
  cacheLife("hours");
  cacheTag("about");
  const { data } = await api.get<CategoriesResponse>("/skill-groups");
  return bySort(data.data);
}
