import type { Metadata } from "next";
import { Career } from "@/components/about/career";
import { Intro } from "@/components/about/intro";
import { Skills } from "@/components/about/skills";
import { Testimonials } from "@/components/about/testimonials";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getCareer, getProfile, getSkillGroups, getSkills, getTestimonials, getTools } from "@/lib/api/about";

export const metadata: Metadata = {
  title: "About · Your Name",
  description: "Who I am, the tools I use, what people say, my career so far, and what I do.",
};

export default async function AboutPage() {
  const [profile, career, skills, groups, tools, testimonials] = await Promise.all([getProfile(), getCareer(), getSkills(), getSkillGroups(), getTools(), getTestimonials()]);
  return (
    <>
      <SiteNav />
      <main className="flex-1 overflow-x-clip">
        <Intro profile={profile} tools={tools} />
        <Testimonials items={testimonials} />
        <Career entries={career} />
        <Skills skills={skills} groups={groups} />
      </main>
      <SiteFooter />
    </>
  );
}
