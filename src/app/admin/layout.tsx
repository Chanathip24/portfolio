import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  // An opaque ground, so the night starfield behind the public site never shows through the dashboard.
  return <div className="min-h-svh bg-background text-foreground">{children}</div>;
}
