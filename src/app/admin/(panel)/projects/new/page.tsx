import { EntityEditor } from "@/components/admin/entity-editor";
import { PageHeader } from "@/components/admin/page-header";
import { taxonomyOptions } from "@/lib/admin/data";
import { blank } from "@/lib/admin/fields";
import { Streamed } from "@/components/admin/page-loading";
import { FormSkeleton } from "@/components/admin/skeletons";

export default function NewProject() {
  return <Streamed fallback={<FormSkeleton side />}><NewProjectContent /></Streamed>;
}

async function NewProjectContent() {
  const { tags } = await taxonomyOptions();
  return (
    <>
      <PageHeader title="New project" back={{ label: "Projects", href: "/admin/projects" }} description="Saved as a draft until you set the status to Published." />
      <EntityEditor entity="project" id={null} initial={blank.project} basePath="/admin/projects" submitLabel="Create project" options={{ tags }} />
    </>
  );
}
