import { ImageResponse } from "next/og";
import { owner } from "@/content/site";

export const ogSize = { width: 1200, height: 630 };

/** The share card shown when a link is pasted into a chat or social app: a small label, the title large, and the site's name. */
export function ogCard({ eyebrow, title }: { eyebrow: string; title: string }) {
  const long = title.length > 70;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f8fafc", color: "#0f172a", padding: 72 }}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 2, textTransform: "uppercase", color: "#075985" }}>{eyebrow}</div>
        <div style={{ display: "flex", fontSize: long ? 64 : 84, lineHeight: 1.05, fontWeight: 700, letterSpacing: -2 }}>{title.slice(0, 120)}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, color: "#475569" }}>
          <span>{owner.name}</span>
          <span>{owner.role}</span>
        </div>
      </div>
    ),
    ogSize,
  );
}
