import { notFound } from "next/navigation";
import { z } from "zod";
import { ItemStats, RANGES } from "@/components/admin/item-stats";
import { getCreator, getProjectById, getSectionAnalytics, visibilityOf } from "@/lib/admin/data";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export default async function ProjectStats({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const [{ id }, { range }] = await Promise.all([params, searchParams]);
  const project = z.uuid().safeParse(id).success ? await getProjectById(id) : null;
  if (!project) notFound();
  const days = RANGES.includes(Number(range)) ? Number(range) : 30;
  const [stats, creator] = await Promise.all([getSectionAnalytics("/work/", days, `/work/${project.slug}`), getCreator("projects", project.id)]);
  return (
    <ItemStats noun="project" listLabel="Projects" listHref="/admin/projects" base={`/admin/projects/${project.id}/stats`} editHref={`/admin/projects/${project.id}`} publicHref={`/work/${project.slug}`}
      title={project.title} visibility={visibilityOf(project.status, project.published_at)} publishedAt={project.published_at} creator={creator} stats={stats} days={days}
      facts={[["Client", project.client || "-"], ["Layout", project.is_signature ? "Signature" : "Index"]]}
      tiles={[{ label: "Order", value: project.sort_order, note: project.is_signature ? "Signature card" : "Index list" }, { label: "Categories", value: project.tags.length }]} />
  );
}
