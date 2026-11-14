import { DataToolsOff } from "@/components/admin/data-tools-off";
import { MediaLibrary } from "@/components/admin/media-library";
import { PageHeader } from "@/components/admin/page-header";
import { getSettings, listMedia } from "@/lib/admin/data";
import { Streamed } from "@/components/admin/page-loading";
import { MediaSkeleton } from "@/components/admin/skeletons";

export default function MediaPage() {
  return <Streamed fallback={<MediaSkeleton />}><MediaPageContent /></Streamed>;
}

async function MediaPageContent() {
  if (!(await getSettings()).dataToolsEnabled) return (<><PageHeader title="Media" /><DataToolsOff /></>);
  return (
    <>
      <PageHeader title="Media" description="Every image you uploaded. Copy an address to use it anywhere, or delete what you no longer need." />
      <MediaLibrary files={await listMedia()} />
    </>
  );
}
