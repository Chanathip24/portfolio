import { PageHeader } from "@/components/admin/page-header";
import { EntityEditor } from "@/components/admin/entity-editor";
import { taxonomyOptions } from "@/lib/admin/data";
import { blank } from "@/lib/admin/fields";

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export const instant = false;

export default async function NewPost() {
  const { category } = await taxonomyOptions();
  return (
    <>
      <PageHeader title="New post" back={{ label: "Blog posts", href: "/admin/posts" }} description="Saved as a draft until you set the status to Published." />
      <EntityEditor entity="post" id={null} initial={blank.post} basePath="/admin/posts" submitLabel="Create post" options={{ category }} />
    </>
  );
}
