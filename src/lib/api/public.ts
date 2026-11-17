import "server-only";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { getCareer, getSkillGroups, getSkills, getTestimonials } from "./about";
import { getPostCategories, getPosts } from "./posts";
import { getWork } from "./projects";
import { publicKey, type PublicResource } from "./queries";

/** What each public query returns, read with the cached getters. The pages prefetch these and /api/public/[resource] serves them. */
export const publicData = {
  posts: async () => {
    const [posts, categories] = await Promise.all([getPosts(), getPostCategories()]);
    return { posts, categories };
  },
  work: getWork,
  // The About intro (profile, tools) stays a server component: its bio is rendered to HTML on the server, see RichContent.
  about: async () => {
    const [career, skills, groups, testimonials] = await Promise.all([getCareer(), getSkills(), getSkillGroups(), getTestimonials()]);
    return { career, skills, groups, testimonials };
  },
} satisfies Record<PublicResource, () => Promise<unknown>>;

/** The page's hydration state for one public query. Cached with the same life and tag as its data, because dehydrating reads the
 *  clock, which a prerender may only do inside "use cache"; the timestamp then moves forward whenever the data does. A failed read
 *  throws (and is not cached), as the page did before, instead of hydrating nothing and fetching in the browser. */
async function snapshot(resource: PublicResource) {
  const queryClient = new QueryClient();
  await queryClient.fetchQuery<unknown>({ queryKey: publicKey(resource), queryFn: publicData[resource] });
  return dehydrate(queryClient);
}

export async function postsState() {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  return snapshot("posts");
}

export async function workState() {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");
  return snapshot("work");
}

export async function aboutState() {
  "use cache";
  cacheLife("hours");
  cacheTag("about");
  return snapshot("about");
}
