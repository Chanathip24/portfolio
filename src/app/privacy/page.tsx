import type { Metadata } from "next";
import { ConsentControls } from "@/components/consent-controls";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { owner } from "@/content/site";

export const metadata: Metadata = {
  title: `Privacy · ${owner.name}`,
  description: "What this site measures, what it stores, who else sees it, and how to change your choice.",
};

const h2 = "mt-12 text-xl font-medium tracking-tight";
const ul = "mt-3 list-disc space-y-2 pl-5 text-muted-foreground";

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="page-x flex-1 pt-28 sm:pt-36">
        <article className="max-w-2xl text-base leading-relaxed">
          <p className="text-sm text-muted-foreground">Last updated 14 November 2026</p>
          <h1 className="mt-2 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[0.95] tracking-[-0.03em]">Privacy</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            This is a personal site. It collects very little, it has no ads, and it sets no tracking cookies. Here is exactly what happens.
          </p>

          <h2 className={h2}>Your choice</h2>
          <p className="mt-3 text-muted-foreground">
            The measurement below is on by default because it uses no cookies and cannot identify you. You can opt out here at any time. If your browser sends Do Not Track, it is off already.
          </p>
          <div className="mt-4"><ConsentControls /></div>

          <h2 className={h2}>What is measured</h2>
          <ul className={ul}>
            <li><span className="text-foreground">Page views.</span> The page address and, on your first page, the name of the site you came from. To count visitors, I store a code made from your IP address, browser, the date and a secret. It changes every day, cannot be turned back into your IP address, and cannot follow you from one day to the next.</li>
            <li><span className="text-foreground">Load times.</span> How fast the page appeared and reacted, which page, and whether you were on a phone or a desktop.</li>
            <li><span className="text-foreground">Errors.</span> If something breaks in your browser, the error message, its technical details and the page.</li>
            <li><span className="text-foreground">Vercel Web Analytics and Speed Insights</span>, which host this site and add their own anonymous counts of visits and speed. They are not loaded if you opt out.</li>
          </ul>
          <p className="mt-3 text-muted-foreground">None of this uses cookies, and none of it is sold or used for advertising. Your choice is kept in your browser&apos;s local storage on your own device.</p>

          <h2 className={h2}>What happens even if you opt out</h2>
          <ul className={ul}>
            <li><span className="text-foreground">The contact form.</span> If you write to me, I receive your name (optional), your email address and your message, and keep them to read and answer you. Write to the address below if you want them deleted.</li>
            <li><span className="text-foreground">Server errors.</span> If the site itself fails, the error and the page address are recorded. No personal details about you are included.</li>
            <li><span className="text-foreground">Hosting.</span> Like any web host, the servers that deliver this site can see your IP address and browser while they answer a request, and may keep that in their own logs.</li>
            <li><span className="text-foreground">Fonts.</span> A display font is loaded from a font service (onlinewebfonts.com), which therefore sees your IP address when the page loads.</li>
          </ul>

          <h2 className={h2}>Who handles the data</h2>
          <p className="mt-3 text-muted-foreground">
            The measurements and messages are stored in a database run by Supabase. The site is hosted by Vercel. Mail sent to the contact address is read in my own mailbox. I do not share this data with anyone else.
          </p>

          <h2 className={h2}>Signing in</h2>
          <p className="mt-3 text-muted-foreground">The only cookies on this site are the sign-in cookies for the site&apos;s admin area. Visitors never receive them.</p>

          <h2 className={h2}>Questions, or deleting your data</h2>
          <p className="mt-3 text-muted-foreground">
            Write to <a href={`mailto:${owner.email}`} className="text-foreground underline underline-offset-4">{owner.email}</a> to ask what I hold about you, or to have it deleted. Because the daily visitor code cannot be traced back to you, I can only find and delete messages you sent me.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
