import { RichContent } from "@/components/ui/rich-content";
import { SiteImage } from "@/components/ui/site-image";
import type { getProfile } from "@/lib/api/about";

type Profile = Awaited<ReturnType<typeof getProfile>>;

/**
 * First viewport: the headline in the display italic, large, with the bio and three plain facts below
 * it; a portrait sits beside it. One entrance, staggered once, nothing else moves.
 */
export function Intro({ profile }: { profile: Profile }) {
  const rise = (delay: number) => ({ animationDelay: `${delay}ms`, animationFillMode: "backwards" as const });
  return (
    <section aria-labelledby="about-title" className="page-x grid items-start gap-14 pt-32 sm:pt-40 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-20">
      <div>
        <p className="animate-in fade-in slide-in-from-bottom-3 text-lg text-muted-foreground duration-700" style={rise(0)}>
          {profile.display_name} · {profile.role}
        </p>
        <h1
          id="about-title"
          className="animate-in fade-in slide-in-from-bottom-4 mt-5 max-w-[16ch] text-balance font-display text-[clamp(3rem,8.5vw,7rem)] italic leading-[0.95] tracking-[-0.03em] duration-1000"
          style={rise(100)}
        >
          {profile.headline}
        </h1>
        <RichContent doc={profile.bio} className="animate-in fade-in slide-in-from-bottom-3 mt-10 max-w-[52ch] text-muted-foreground duration-1000 [&_strong]:text-foreground" />
        <dl className="mt-10 grid max-w-xl grid-cols-1 gap-x-10 gap-y-5 border-t border-border pt-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Based in</dt>
            <dd className="mt-1 text-base">{profile.location}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Experience</dt>
            <dd className="mt-1 text-base tabular-nums">{profile.years_experience} years</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Right now</dt>
            <dd className="mt-1 text-base">{profile.status_note}</dd>
          </div>
        </dl>
      </div>

      <figure className="animate-in fade-in slide-in-from-bottom-6 mx-auto w-full max-w-sm duration-1000 lg:mx-0 lg:justify-self-end" style={rise(250)}>
        <div className="overflow-hidden rounded-[1.75rem] bg-tile lg:rotate-2">
          <SiteImage src={profile.image_url} alt={`Portrait of ${profile.display_name} (placeholder)`} width={560} height={680} sizes="(min-width: 1024px) 24rem, 90vw" priority className="aspect-[28/34] w-full object-cover" />
        </div>
        <figcaption className="mt-3 text-sm text-muted-foreground">Placeholder portrait. Swap in your own photo.</figcaption>
      </figure>
    </section>
  );
}
