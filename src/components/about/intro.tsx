import { ToolsStack } from "@/components/about/tools";
import { Parallax } from "@/components/ui/parallax";
import { RichContent } from "@/components/ui/rich-content";
import type { getProfile, getTools } from "@/lib/api/about";
import { SocialPlatform } from "@/lib/enums";
import { socialIcons } from "@/lib/icons";

type Profile = Awaited<ReturnType<typeof getProfile>>;
type Tools = Awaited<ReturnType<typeof getTools>>;

/**
 * First viewport: the headline in the display italic, large, with the bio, a row of small social links and three plain
 * facts below it. Beside it, the tools I use scroll past in two vertical columns. One entrance, staggered once.
 */
export function Intro({ profile, tools }: { profile: Profile; tools: Tools }) {
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

        <ul aria-label="Find me elsewhere" className="animate-in fade-in slide-in-from-bottom-3 mt-8 flex flex-wrap gap-2 duration-1000" style={rise(200)}>
          {profile.socials.map((s) => {
            const Icon = socialIcons[s.platform];
            const external = s.platform !== SocialPlatform.Email;
            return (
              <li key={s.id}>
                <a
                  href={s.url}
                  {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                  aria-label={`${s.label}, ${s.handle}`}
                  title={`${s.label} · ${s.handle}`}
                  className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:border-foreground hover:bg-foreground hover:text-background"
                >
                  <Icon aria-hidden className="size-[1.125rem]" />
                </a>
              </li>
            );
          })}
        </ul>

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

      <Parallax distance={36} className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000" style={rise(250)}>
          <ToolsStack tools={tools} />
        </div>
      </Parallax>
    </section>
  );
}
