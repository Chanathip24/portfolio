import { HashEntry, HashLinks } from "@/components/hash-entry";
import { Hero } from "@/components/hero";
import { BlogSection } from "@/components/blog-section";
import { GlobeScene } from "@/components/scroll-effects";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { SmallTalk } from "@/components/small-talk";
import { WorkShowcase } from "@/components/work-grid";
import { about, hero, owner } from "@/content/site";
import { getWork } from "@/lib/api/projects";
import { hash, SectionId } from "@/lib/enums";

export default async function Home() {
  const work = await getWork();
  return (
    <>
      <HashEntry />
      <HashLinks />
      <SiteNav />
      <main id={SectionId.Top}>
        <Hero lines={hero.lines} swap={hero.swap} intro={hero.intro} note="Sample content · edit src/content/site.ts" />

        {/* Opaque and above the globe scene, so the rising globe passes behind Work instead of over it.
            Clipped sideways: cards fly in from 1.5x and must not widen the page while they do. */}
        <section id={SectionId.Work} aria-label="Selected projects" className="page-x relative z-10 scroll-mt-24 overflow-x-clip bg-background pb-24 pt-12">
          <WorkShowcase signature={work.signature} others={work.others} />
        </section>

        <GlobeScene pin={owner.pin} heading={about.heading} body={about.body} primary={{ label: "Read my notes", href: hash(SectionId.Notes) }} />

        <BlogSection />
        <SmallTalk />
      </main>
      <SiteFooter />
    </>
  );
}
