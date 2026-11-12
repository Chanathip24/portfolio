import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { ViewTransitions } from "next-view-transitions";
import { Suspense } from "react";
import { ScrollRestore } from "@/components/scroll-restore";
import "./globals.css";
import "./navigation.css";
import { Providers } from "./providers";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Free stand-in for a calligraphic italic display serif.
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Your Name, full-stack developer",
  description: "Sample portfolio. Interfaces and the systems underneath, from first sketch to production.",
};

// Runs before paint so the saved or system theme never flashes.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

// Landing on /#section would let the browser jump straight past the hero. Take the hash off the URL
// before the browser can scroll to it and remember it; HashEntry scrolls there after the intro.
const entryScript = `try{var h=location.hash;if(h.length>1&&location.pathname==="/"){sessionStorage.setItem("entry-hash",h);history.replaceState(history.state,"",location.pathname+location.search)}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ViewTransitions>
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* beforeInteractive: Next injects it into <head> ahead of hydration, without React's script-tag warning. */}
        <Script id="theme" strategy="beforeInteractive">{themeScript}</Script>
        <Script id="entry" strategy="beforeInteractive">{entryScript}</Script>
        <Suspense fallback={null}>
          <ScrollRestore />
        </Suspense>
        <Providers>{children}</Providers>
        {/* Vercel Web Analytics + real-user Web Vitals; both are no-ops off Vercel. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
    </ViewTransitions>
  );
}
