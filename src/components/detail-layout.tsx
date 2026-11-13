import type { JSONContent } from "@tiptap/core";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "next-view-transitions";
import { CrumbLink } from "@/components/detail/crumb-link";
import { MobileToc } from "@/components/detail/mobile-toc";
import { ReadingProgress } from "@/components/detail/reading-progress";
import { ShareMenu } from "@/components/detail/share-menu";
import { Toc } from "@/components/detail/toc";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichContent } from "@/components/ui/rich-content";
import { Separator } from "@/components/ui/separator";
import { SiteImage } from "@/components/ui/site-image";
import { headingsOf } from "@/lib/headings";

export type Person = { name: string; role: string; bio?: string; image?: string | null; href?: string | null };
/** A previous/next link. `label` says which way ("Older post", "Next project"). */
export type Adjacent = { href: string; title: string; label: string };
/** A related item, shown as a small card. */
export type RelatedCard = { href: string; title: string; meta: string; image: string };
/** The list this page belongs to ("Work", "Blog"). `entry` sends the visitor to that home-page section instead. */
export type Section = { label: string; href: string; entry?: string };

const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("");

function PersonAvatar({ person }: { person: Person }) {
  return (
    <Avatar size="lg">
      {person.image && <AvatarImage src={person.image} alt="" />}
      <AvatarFallback>{initials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

function Facts({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm sm:grid-cols-3 lg:grid-cols-1">
      {facts.map((f) => (
        <div key={f.label}>
          <dt className="text-muted-foreground">{f.label}</dt>
          <dd className="mt-1 text-base">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The page for one project or one post, in reading order: breadcrumb, title, summary, who wrote it (posts only),
 * tags, and beside the title a column with the facts and Share (it scrolls away with the header; it is not sticky).
 * Then the hero image and the article: the text column is 48rem (about 90 characters a line at 16px; kept wider than the 46rem we started with) at every width that
 * has room for it, with the topics list sticky on its left from `xl` (below that, topics become a bottom pill and
 * sheet). After the article: the author bio, previous/next, related items.
 * /work/[slug] and /blog/[slug] both render through this and differ only in the data they pass.
 */
export function DetailLayout({
  section,
  title,
  summary,
  author,
  tags,
  tagsLabel,
  facts,
  image,
  body,
  adjacent,
  related,
}: {
  section: Section;
  title: string;
  summary: string;
  /** Posts have an author; projects don’t. Dates and read time belong in `facts`. */
  author?: Person;
  tags: string[];
  tagsLabel: string;
  facts: { label: string; value: string }[];
  image: { src: string; alt: string };
  body: JSONContent;
  adjacent: { prev?: Adjacent | null; next?: Adjacent | null };
  related: { heading: string; items: RelatedCard[] };
}) {
  const headings = headingsOf(body);
  const showToc = headings.length >= 3;

  return (
    <>
      <ReadingProgress />
      <SiteNav />
      <main className="page-x flex-1 pb-12 pt-28 sm:pt-36">
        <article>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<CrumbLink href="/" />}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<CrumbLink href={section.href} entry={section.entry} />}>{section.label}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="block max-w-[22ch] truncate sm:max-w-[40ch]">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <header className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
            <div>
              <h1 className="max-w-[20ch] text-balance font-display text-5xl italic leading-[0.98] tracking-[-0.025em] sm:text-6xl lg:text-7xl">{title}</h1>
              <p className="mt-7 max-w-[52ch] text-xl leading-relaxed text-muted-foreground">{summary}</p>

              {author && (
                <div className="mt-8 flex items-center gap-3">
                  <PersonAvatar person={author} />
                  <p className="leading-tight">
                    <span className="block font-medium">{author.name}</span>
                    <span className="block text-sm text-muted-foreground">{author.role}</span>
                  </p>
                </div>
              )}

              {tags.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2" aria-label={tagsLabel}>
                  {tags.map((tag) => (
                    <li key={tag}>
                      <Badge variant="secondary" className="h-6 px-2.5 text-xs">{tag}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Facts and Share live up here, beside the title, and scroll away with it. */}
            <div className="lg:pt-3">
              <Separator />
              <div className="py-6">
                <Facts facts={facts} />
              </div>
              <ShareMenu title={title} />
            </div>
          </header>

          <SiteImage src={image.src} alt={image.alt} width={1600} height={1100} sizes="100vw" priority className="mt-14 aspect-[16/10] w-full rounded-[1.75rem] bg-tile object-cover sm:mt-20 lg:aspect-[2/1]" />

          <div className="mt-16 sm:mt-24 xl:grid xl:grid-cols-[12rem_minmax(0,48rem)] xl:justify-center xl:gap-14">
            <aside className="hidden xl:block">{showToc && <div className="sticky top-28"><Toc headings={headings} /></div>}</aside>

            <div className="mx-auto w-full min-w-0 max-w-[48rem]">
              <RichContent doc={body} />

              {author?.bio && (
                <Card aria-label={`About ${author.name}`} className="mt-20" size="default">
                  <CardContent className="flex gap-4">
                    <PersonAvatar person={author} />
                    <div className="min-w-0">
                      <p className="font-medium">{author.name}</p>
                      <p className="text-sm text-muted-foreground">{author.role}</p>
                      <p className="mt-3 text-muted-foreground">{author.bio}</p>
                      {author.href && (
                        <Link href={author.href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
                          More about {author.name} <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

          </div>
        </article>

        {(adjacent.prev || adjacent.next) && (
          <nav aria-label="Previous and next" className="mt-24">
            <Separator />
            <div className="grid md:grid-cols-2">
              {adjacent.prev ? (
                <Link href={adjacent.prev.href} className="group block py-8 no-underline md:pr-8">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowLeft aria-hidden className="size-4 transition-transform duration-300 group-hover:-translate-x-1" strokeWidth={2} />
                    {adjacent.prev.label}
                  </span>
                  <span className="mt-3 block font-display text-[clamp(1.75rem,3vw,2.75rem)] italic leading-[1.02] tracking-[-0.02em]">{adjacent.prev.title}</span>
                </Link>
              ) : (
                <span aria-hidden />
              )}
              {adjacent.next && (
                <Link href={adjacent.next.href} className="group block border-t border-border py-8 no-underline md:border-l md:border-t-0 md:pl-8 md:text-right">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground md:justify-end">
                    {adjacent.next.label}
                    <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
                  </span>
                  <span className="mt-3 block font-display text-[clamp(1.75rem,3vw,2.75rem)] italic leading-[1.02] tracking-[-0.02em]">{adjacent.next.title}</span>
                </Link>
              )}
            </div>
            <Separator />
          </nav>
        )}

        {related.items.length > 0 && (
          <section aria-labelledby="related-title" className="mt-24">
            <h2 id="related-title" className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium leading-[0.95] tracking-[-0.03em]">{related.heading}</h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.items.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="group block h-full no-underline">
                    <Card className="h-full gap-0 py-0 transition-shadow duration-300 group-hover:ring-foreground/30">
                      <span className="block overflow-hidden bg-tile">
                        <SiteImage src={r.image} alt="" width={720} height={540} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="aspect-[4/3] w-full object-cover transition-[scale] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]" />
                      </span>
                      <CardHeader className="py-5">
                        <CardDescription>{r.meta}</CardDescription>
                        <CardTitle className="font-display text-3xl italic leading-[1] tracking-[-0.02em]">{r.title}</CardTitle>
                      </CardHeader>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      {showToc && <MobileToc headings={headings} />}
      <SiteFooter />
    </>
  );
}
