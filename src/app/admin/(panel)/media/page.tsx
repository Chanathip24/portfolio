import { DataToolsOff } from "@/components/admin/data-tools-off";
import { MediaLibrary } from "@/components/admin/media-library";
import { PageHeader } from "@/components/admin/page-header";
import { getSettings, listMedia } from "@/lib/admin/data";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export default async function MediaPage() {
  if (!(await getSettings()).dataToolsEnabled) return (<><PageHeader title="Media" /><DataToolsOff /></>);
  return (
    <>
      <PageHeader title="Media" description="Every image you uploaded. Copy an address to use it anywhere, or delete what you no longer need." />
      <MediaLibrary files={await listMedia()} />
    </>
  );
}
