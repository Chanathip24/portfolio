import { ArrowUpRight } from "lucide-react";
import type { getProfile } from "@/lib/api/about";
import { SocialPlatform } from "@/lib/enums";
import { socialIcons } from "@/lib/icons";

type Socials = Awaited<ReturnType<typeof getProfile>>["socials"];

/** Where else to find me: a typographic list that closes the page. The row leans in and the arrow arrives on hover. */
export function Socials({ socials }: { socials: Socials }) {
  return (
    <section aria-labelledby="elsewhere-title" className="page-x pt-40">
      <h2 id="elsewhere-title" className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.03em]">
        Elsewhere
      </h2>
      <ul className="dim-others mt-12 border-b border-border">
        {socials.map((s) => {
          const Icon = socialIcons[s.platform];
          const external = s.platform !== SocialPlatform.Email;
          return (
            <li key={s.id} className="border-t border-border">
              <a
                href={s.url}
                {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                className="dim-item group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-5 py-6 no-underline sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <Icon aria-hidden className="size-6 text-muted-foreground transition-colors duration-200 group-hover:text-brand" />
                <span className="font-display text-[clamp(1.75rem,4vw,3rem)] italic leading-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">{s.label}</span>
                <span className="hidden text-muted-foreground sm:block">{s.handle}</span>
                <ArrowUpRight aria-hidden strokeWidth={2} className="size-6 -translate-x-2 translate-y-2 opacity-0 transition-[translate,opacity] duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 group-focus-visible:opacity-100" />
                <span className="sr-only">{s.handle}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
