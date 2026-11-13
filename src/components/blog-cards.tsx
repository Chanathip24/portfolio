import { Eye } from "lucide-react";
import { Link } from "next-view-transitions";
import { Fragment } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SiteImage } from "@/components/ui/site-image";
import type { Post } from "@/lib/api/posts";
import { formatCount, titleCase } from "@/lib/format";

const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("");

function Byline({ post, className }: { post: Post; className?: string }) {
  return (
    <span className={className}>
      <Avatar size="sm">
        {post.author.image && <AvatarImage src={post.author.image} alt="" />}
        <AvatarFallback>{initials(post.author.name)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium">{post.author.name}</span>
    </span>
  );
}

/** Wraps each match of `query` in <mark>. */
export function Marked({ text, query }: { text: string; query: string }) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "i"));
  return parts.map((part, i) =>
    i % 2 ? <mark key={i} className="rounded-sm bg-brand/25 text-inherit">{part}</mark> : <Fragment key={i}>{part}</Fragment>,
  );
}

/**
 * A post in the grid: cover, title, two lines of excerpt, its category and reading time, then who wrote it and how many
 * people have read it. On a phone it is a compact row (small square cover beside the text) so nine posts do not mean
 * nine screens.
 */
export function PostCard({ post, query }: { post: Post; query: string }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group grid h-full grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 no-underline sm:flex sm:flex-col">
      <span className="block self-start overflow-hidden rounded-xl bg-tile sm:rounded-2xl">
        <SiteImage
          src={post.image}
          alt=""
          width={720}
          height={540}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 104px"
          className="aspect-square w-full object-cover transition-[scale] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] sm:aspect-[4/3]"
        />
      </span>
      <span className="flex min-w-0 flex-col sm:flex-1">
        <h2 className="text-balance font-display text-2xl italic leading-[1] tracking-[-0.02em] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 sm:mt-5 sm:text-3xl">
          <Marked text={post.title} query={query} />
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground sm:mt-3 sm:text-base"><Marked text={post.excerpt} query={query} /></p>
        <span className="mt-3 text-xs text-muted-foreground sm:text-sm">{titleCase(post.category)} · {post.minutes} min read</span>
        <span className="mt-3 flex items-center justify-between gap-3 sm:mt-auto sm:pt-4">
          <Byline post={post} className="flex min-w-0 items-center gap-2" />
          <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground sm:text-sm" title={`${post.views.toLocaleString("en")} views`}>
            <Eye aria-hidden className="size-4" strokeWidth={1.75} />
            {formatCount(post.views)}
            <span className="sr-only"> views</span>
          </span>
        </span>
      </span>
    </Link>
  );
}
