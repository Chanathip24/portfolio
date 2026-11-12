import { HashEntry, HashLinks } from "@/components/hash-entry";
import { Hero } from "@/components/hero";
import { NotesStrip } from "@/components/notes-strip";
import { GlobeScene } from "@/components/scroll-effects";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { SmallTalk } from "@/components/small-talk";
import { WorkRow } from "@/components/work-grid";
import { about, hero, owner, work } from "@/content/site";

export default function Home() {
  return (
    <>
      <HashEntry />
      <HashLinks />
      <SiteNav />
      <main id="top">
        <Hero lines={hero.lines} swap={hero.swap} intro={hero.intro} note="Sample content · edit src/content/site.ts" />

        {/* Opaque and above the globe scene, so the rising globe passes behind Work instead of over it.
            Clipped sideways: cards fly in from 1.5x and must not widen the page while they do. */}
        <section id="work" aria-label="Selected projects" className="page-x relative z-10 scroll-mt-24 overflow-x-clip bg-background pb-24 pt-12">
          <div className="dim-others space-y-16">
            {work.map((row) => (
              <WorkRow key={row.lead.slug} lead={row.lead} wall={row.wall} />
            ))}
          </div>
        </section>

        <GlobeScene pin={owner.pin} heading={about.heading} body={about.body} primary={{ label: "Read my notes", href: "#notes" }} />

        <NotesStrip />
        <SmallTalk />
      </main>
      <SiteFooter />
    </>
  );
}
