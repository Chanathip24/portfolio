import { Plus } from "lucide-react";
import Link from "next/link";
import { ContentList } from "@/components/admin/content-list";
import { PageHeader } from "@/components/admin/page-header";
import { SectionInsights } from "@/components/admin/section-insights";
import { Button } from "@/components/ui/button";
import { getSectionAnalytics, listProjects } from "@/lib/admin/data";
import { Streamed } from "@/components/admin/page-loading";
import { ListSkeleton } from "@/components/admin/skeletons";

const DAYS = 30;

export default function ProjectsPage() {
  return <Streamed fallback={<ListSkeleton />}><ProjectsPageContent /></Streamed>;
}

async function ProjectsPageContent() {
  const [projects, stats] = await Promise.all([listProjects(), getSectionAnalytics("/work/", DAYS)]);
  const signature = projects.filter((p) => p.is_signature).length;
  return (
    <>
      <PageHeader title="Projects" description="Signature projects get the large card on the home page; the rest sit in the index beside them. Open a project to see how it is viewed."
        action={<Button render={<Link href="/admin/projects/new" />} nativeButton={false} role="link"><Plus /> New project</Button>} />
      <div className="flex flex-col gap-4">
        <SectionInsights noun="project" plural="projects" prefix="/work/" adminBase="/admin/projects" stats={stats} days={DAYS} groupTitle="Live projects by category"
          items={projects.map((p) => ({ id: p.id, slug: p.slug, visibility: p.visibility, groups: p.tagNames }))}
          extra={{ label: "Signature projects", value: signature, note: `${projects.length - signature} in the index` }} />
        <div className="order-3 lg:order-4"><ContentList kind="project" rows={projects} /></div>
      </div>
    </>
  );
}
