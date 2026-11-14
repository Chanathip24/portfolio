import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { EntityEditor } from "@/components/admin/entity-editor";
import { DeleteButton } from "@/components/admin/entity-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { HistoryButton } from "@/components/admin/revisions";
import { getCreator, getProjectById, listRevisions, taxonomyOptions } from "@/lib/admin/data";

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export const instant = false;

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const valid = z.uuid().safeParse(id).success;
  const [project, { tags }, revisions, creator] = await Promise.all([valid ? getProjectById(id) : null, taxonomyOptions(), valid ? listRevisions("projects", id) : [], valid ? getCreator("projects", id) : "-"]);
  if (!project) notFound();
  return (
    <>
      <PageHeader title={project.title || "Untitled"} back={{ label: "Projects", href: "/admin/projects" }} description={`Created by ${creator}`}
        action={
          <div className="flex flex-wrap gap-2">
            <HistoryButton items={revisions} />
            {project.status === "published" && <Button variant="outline" render={<a href={`/work/${project.slug}`} target="_blank" rel="noopener" />} nativeButton={false} role="link"><ExternalLink /> View on site</Button>}
            <DeleteButton entity="project" id={project.id} name={project.title} redirectTo="/admin/projects" />
          </div>
        } />
      <EntityEditor entity="project" id={project.id} initial={project} submitLabel="Save changes" options={{ tags }} />
    </>
  );
}
