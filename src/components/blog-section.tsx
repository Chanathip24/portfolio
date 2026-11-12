import { ArrowRight } from "lucide-react";
import { Link } from "next-view-transitions";
import { SiteImage } from "@/components/ui/site-image";
import { notes } from "@/content/site";
import { getPosts } from "@/lib/api/posts";
import { SectionId } from "@/lib/enums";
import { formatDate, titleCase } from "@/lib/format";

/**
 * The latest three posts as a typographic list: the title is the content, set large in the display
 * italic; the thumbnail supports it and tilts into place on hover. Each row jumps to that post on /blog.
 */
export async function BlogSection() {
  const posts = (await getPosts()).slice(0, 3);
  return (
    <section id={SectionId.Notes} aria-labelledby="notes-title" className="page-x scroll-mt-24 pt-64">
      <div className="grid items-end gap-6 lg:grid-cols-2">
        <h2 id="notes-title" className="text-[clamp(3rem,8vw,6.5rem)] font-medium leading-[0.9] tracking-[-0.03em]">{notes.heading}</h2>
        <div className="max-w-[22rem] lg:justify-self-end">
          <p className="text-muted-foreground">{notes.blurb}</p>
          <Link href="/blog" className="group mt-4 inline-flex items-center gap-1.5 no-underline">
            <span className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background">All posts</span>
            <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:-rotate-45" strokeWidth={2} />
            </span>
          </Link>
        </div>
      </div>

      <ul className="dim-others mt-14 border-b border-border">
        {posts.map((p) => (
          <li key={p.slug} className="border-t border-border">
            <Link
              href={`/blog#${p.slug}`}
              className="dim-item group grid items-center gap-x-10 gap-y-5 py-8 no-underline md:grid-cols-[7rem_minmax(0,1fr)_15rem] md:py-10"
            >
              <time dateTime={p.publishedAt} className="hidden text-sm tabular-nums text-muted-foreground md:block">{formatDate(p.publishedAt)}</time>
              <span className="order-2 min-w-0 md:order-none">
                <span className="block font-display text-[clamp(2.25rem,5vw,4rem)] italic leading-[0.98] tracking-[-0.02em] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">{p.title}</span>
                <span className="mt-4 block max-w-[56ch] text-muted-foreground">{p.excerpt}</span>
                <span className="mt-4 block text-sm text-muted-foreground">
                  <span className="text-foreground">{titleCase(p.category)}</span> · {p.minutes} min read<span className="md:hidden"> · {formatDate(p.publishedAt)}</span>
                </span>
              </span>
              <span className="order-1 block overflow-hidden rounded-xl bg-tile transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-2 group-hover:scale-[1.03] md:order-none">
                <SiteImage src={p.image} alt="" width={480} height={360} sizes="(min-width: 768px) 240px, 100vw" className="aspect-[16/9] w-full object-cover md:aspect-[4/3]" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
