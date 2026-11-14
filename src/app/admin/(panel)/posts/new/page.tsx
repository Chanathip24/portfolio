import { PageHeader } from "@/components/admin/page-header";
import { EntityEditor } from "@/components/admin/entity-editor";
import { taxonomyOptions } from "@/lib/admin/data";
import { blank } from "@/lib/admin/fields";
import { Streamed } from "@/components/admin/page-loading";
import { FormSkeleton } from "@/components/admin/skeletons";

export default function NewPost() {
  return <Streamed fallback={<FormSkeleton side />}><NewPostContent /></Streamed>;
}

async function NewPostContent() {
  const { category } = await taxonomyOptions();
  return (
    <>
      <PageHeader title="New post" back={{ label: "Blog posts", href: "/admin/posts" }} description="Saved as a draft until you set the status to Published." />
      <EntityEditor entity="post" id={null} initial={blank.post} basePath="/admin/posts" submitLabel="Create post" options={{ category }} />
    </>
  );
}
