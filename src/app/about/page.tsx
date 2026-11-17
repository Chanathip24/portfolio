import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Career } from "@/components/about/career";
import { Intro } from "@/components/about/intro";
import { Skills } from "@/components/about/skills";
import { Testimonials } from "@/components/about/testimonials";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getProfile, getTools } from "@/lib/api/about";
import { aboutState } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "About · Your Name",
  description: "Who I am, the tools I use, what people say, my career so far, and what I do.",
};

export default async function AboutPage() {
  const [profile, tools, state] = await Promise.all([getProfile(), getTools(), aboutState()]);
  return (
    <>
      <SiteNav />
      <main className="flex-1 overflow-x-clip">
        <Intro profile={profile} tools={tools} />
        <HydrationBoundary state={state}>
          <Testimonials />
          <Career />
          <Skills />
        </HydrationBoundary>
      </main>
      <SiteFooter />
    </>
  );
}
