import { notFound } from "next/navigation";
import { DetailLayout } from "@/components/detail-layout";
import { hash, SectionId } from "@/lib/enums";
import { getProject, getProjectNeighbors, getProjects } from "@/lib/api/projects";

export const instant = false;

export async function generateStaticParams() {
  return (await getProjects()).map(({ slug }) => ({ slug }));
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
      image={{ src: project.image_url, alt: `${project.title} project preview` }}
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
