import type { Metadata } from "next";
import { Intro } from "@/components/about/intro";
import { Skills } from "@/components/about/skills";
import { Socials } from "@/components/about/socials";
import { Testimonials } from "@/components/about/testimonials";
import { Tools } from "@/components/about/tools";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getProfile, getSkills, getTestimonials, getTools } from "@/lib/api/about";

export const metadata: Metadata = {
  title: "About · Your Name",
  description: "Who I am, what I do, the tools I use, and where to find me.",
};

export default async function AboutPage() {
  const [profile, skills, tools, testimonials] = await Promise.all([getProfile(), getSkills(), getTools(), getTestimonials()]);
  return (
    <>
      <SiteNav />
      <main className="flex-1 overflow-x-clip">
        <Intro profile={profile} />
        <Tools tools={tools} />
        <Skills skills={skills} />
        <Testimonials items={testimonials} />
        <Socials socials={profile.socials} />
      </main>
      <SiteFooter />
    </>
  );
}
