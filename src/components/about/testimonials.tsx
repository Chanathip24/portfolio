import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Marquee } from "@/components/ui/marquee";
import type { getTestimonials } from "@/lib/api/about";

type Testimonials = Awaited<ReturnType<typeof getTestimonials>>;

const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("");

/** Testimonials in two opposing marquee rows; both rows pause while one is hovered or focused so a quote can be read. */
export function Testimonials({ items }: { items: Testimonials }) {
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half)];
  return (
    <section aria-labelledby="kind-words-title" className="pt-40">
      <h2 id="kind-words-title" className="page-x text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.03em]">
        Kind words
      </h2>
      <p className="page-x mt-4 text-sm text-muted-foreground">Placeholder quotes from placeholder people.</p>
      <div className="mt-14 space-y-6">
        {rows.map((row, i) => (
          <Marquee key={i} reverse={i === 1} duration={i === 0 ? 70 : 85} label={`Testimonials, row ${i + 1}`} className="[--marquee-gap:1.5rem]">
            {row.map((t) => (
              <li key={t.id} className="w-[min(22rem,80vw)] shrink-0">
                <figure className="flex h-full flex-col justify-between gap-8 rounded-2xl border border-border bg-card p-6">
                  <blockquote className="text-lg leading-snug">{t.quote}</blockquote>
                  <figcaption className="flex items-center gap-3">
                    <Avatar size="lg">
                      {t.avatar_url && <AvatarImage src={t.avatar_url} alt="" />}
                      <AvatarFallback>{initials(t.author_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      <span className="block font-medium">{t.author_name}</span>
                      <span className="block text-muted-foreground">{t.author_role} · {t.company}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </Marquee>
        ))}
      </div>
    </section>
  );
}
