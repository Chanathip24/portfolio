import { SiteImage } from "@/components/ui/site-image";
import { notFound } from "next/navigation";
import { BackToWork } from "@/components/back-to-work";
import { RichContent } from "@/components/ui/rich-content";
import { getProject, getProjects } from "@/lib/api/projects";

export const instant = false;

export async function generateStaticParams() {
  return (await getProjects()).map(({ slug }) => ({ slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <main className="page-x flex-1 pb-24 pt-28 sm:pt-36">
      <article className="mx-auto max-w-5xl">
        <BackToWork className="mb-12 inline-flex size-11 items-center justify-center rounded-full bg-muted text-xl no-underline transition-colors hover:bg-brand hover:text-white" />
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.5fr)_minmax(12rem,0.7fr)] md:items-start">
          <div>
            <p className="mb-5 text-sm text-muted-foreground">{project.client} · Sample project</p>
            <h1 className="max-w-[18ch] font-display text-5xl italic leading-[0.98] tracking-[-0.025em] sm:text-6xl">{project.title}</h1>
            <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-muted-foreground">{project.summary}</p>
            {project.tags.length > 0 && <ul className="mt-6 flex flex-wrap gap-2" aria-label="Project tags">{project.tags.map((tag) => <li key={tag} className="rounded-md bg-muted px-2.5 py-1 text-xs">{tag}</li>)}</ul>}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 text-sm md:grid-cols-1">
            <div><dt className="text-muted-foreground">Type</dt><dd className="mt-1">Sample project</dd></div>
            <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1">Placeholder</dd></div>
          </dl>
        </div>
          <SiteImage src={project.image_url} alt={`${project.title} project preview`} width={1600} height={1100} sizes="100vw" className="mt-16 aspect-[7/5] w-full rounded-[1.75rem] bg-tile object-cover sm:mt-24" />
        <RichContent doc={project.body} className="mx-auto mt-16 max-w-[44rem] sm:mt-24" />
      </article>
    </main>
  );
}
