import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css?theme=sky-blue-navigation-v2";
import { Providers } from "./providers";
import { PageNavigation } from "@/components/page-navigation";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* beforeInteractive: Next injects it into <head> ahead of hydration, without React's script-tag warning. */}
        <Script id="theme" strategy="beforeInteractive">{themeScript}</Script>
        <Script id="history-transition" strategy="beforeInteractive">{`window.addEventListener("popstate",function(){window.dispatchEvent(new Event("portfolio:before-history"))},true)`}</Script>
        <Providers><PageNavigation>{children}</PageNavigation></Providers>
      </body>
    </html>
  );
}
