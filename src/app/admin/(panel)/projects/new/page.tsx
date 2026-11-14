import { EntityEditor } from "@/components/admin/entity-editor";
import { PageHeader } from "@/components/admin/page-header";
import { taxonomyOptions } from "@/lib/admin/data";
import { blank } from "@/lib/admin/fields";

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export const instant = false;

export default async function NewProject() {
  const { tags } = await taxonomyOptions();
  return (
    <>
      <PageHeader title="New project" back={{ label: "Projects", href: "/admin/projects" }} description="Saved as a draft until you set the status to Published." />
      <EntityEditor entity="project" id={null} initial={blank.project} basePath="/admin/projects" submitLabel="Create project" options={{ tags }} />
    </>
  );
}
