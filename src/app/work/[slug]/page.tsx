import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailLayout } from "@/components/detail-layout";
import { owner } from "@/content/site";
import { hash, SectionId } from "@/lib/enums";
import { getProject, getProjectNeighbors, getProjects } from "@/lib/api/projects";
import { feedAlternate } from "@/lib/site";

export const instant = false;

export async function generateStaticParams() {
  return (await getProjects()).map(({ slug }) => ({ slug }));
}

/** Each project gets its own title, description and share preview (the card image is ./opengraph-image.tsx). */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = await getProject((await params).slug);
  if (!project) return { title: "Project not found", robots: { index: false } };
  return {
    title: `${project.title} · ${owner.name}`,
    description: project.summary,
    alternates: { canonical: `/work/${project.slug}`, types: feedAlternate },
    openGraph: { type: "website", url: `/work/${project.slug}`, title: project.title, description: project.summary },
    twitter: { card: "summary_large_image", title: project.title, description: project.summary },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();
  const { related, prev, next } = await getProjectNeighbors(slug);
  const year = String(new Date(project.created_at).getUTCFullYear());

  return (
    <DetailLayout
      section={{ label: "Work", href: "/", entry: hash(SectionId.Work) }}
      title={project.title}
      summary={project.summary}
      tags={project.tags}
      tagsLabel="Project tags"
      facts={[
        { label: "Client", value: project.client },
        { label: "Year", value: year },
        { label: "Type", value: project.is_signature ? "Signature project" : "Project" },
      ]}
      image={{ src: project.image_url, alt: project.image_alt || `${project.title} project preview` }}
      body={project.body}
      adjacent={{
        prev: prev && { href: `/work/${prev.slug}`, title: prev.title, label: "Previous project" },
        next: next && { href: `/work/${next.slug}`, title: next.title, label: "Next project" },
      }}
      related={{
        heading: "More work",
        items: related.map((p) => ({ href: p.href, title: p.title, meta: `${p.client} · ${p.year}`, image: p.image })),
      }}
    />
  );
}
