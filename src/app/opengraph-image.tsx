import { owner } from "@/content/site";
import { ogCard, ogSize } from "@/lib/og";

export const alt = `${owner.name}, ${owner.role}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ eyebrow: "Portfolio", title: `${owner.name}, ${owner.role.toLowerCase()}` });
}
