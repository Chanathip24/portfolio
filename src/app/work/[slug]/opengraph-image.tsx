import { getProject } from "@/lib/api/projects";
import { ogCard, ogSize } from "@/lib/og";

export const contentType = "image/png";

/** One image per project, described by the project's own title (read aloud as the preview's alt text). */
export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProject((await params).slug);
  return [{ id: "card", alt: project ? `${project.title}, project` : "Project", size: ogSize, contentType }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProject((await params).slug);
  return ogCard({ eyebrow: project ? `Work · ${project.client}` : "Work", title: project?.title ?? "Project not found" });
}
