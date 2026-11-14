import { notFound } from "next/navigation";
import { z } from "zod";
import { ItemStats, RANGES } from "@/components/admin/item-stats";
import { Streamed } from "@/components/admin/page-loading";
import { StatsSkeleton } from "@/components/admin/skeletons";
import { getCreator, getProjectSummary, getSectionAnalytics, visibilityOf } from "@/lib/admin/data";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> };

// Everything that waits for the session or the database sits inside <Streamed>, so the page opens at once with a placeholder.
export default function ProjectStats(props: Props) {
  return <Streamed fallback={<StatsSkeleton />}><ProjectStatsContent {...props} /></Streamed>;
}

async function ProjectStatsContent({ params, searchParams }: Props) {
  const [{ id }, { range }] = await Promise.all([params, searchParams]);
  const project = z.uuid().safeParse(id).success ? await getProjectSummary(id) : null;
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
