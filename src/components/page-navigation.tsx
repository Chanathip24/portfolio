"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const EXIT_DURATION = 450;
const HOLD_DURATION = 120;
const SWAP_DURATION = 500;
const ENTER_DURATION = 600;
const PAGE_SCALE = 0.84;
const EASE = "cubic-bezier(0.76,0,0.24,1)";

// Animate viewport-sized frames so page length and restored scroll do not
// change the centre of the zoom or move fixed navigation during the transition.
function captureFrame(source: HTMLDivElement) {
  const snapshot = source.cloneNode(true) as HTMLDivElement;
  const canvases = snapshot.querySelectorAll("canvas");
  source.querySelectorAll("canvas").forEach((canvas, i) => {
    if (canvas.width && canvas.height) canvases[i]?.getContext("2d")?.drawImage(canvas, 0, 0);
  });
  snapshot.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  snapshot.querySelectorAll("script").forEach((element) => element.remove());
  Object.assign(snapshot.style, { position: "absolute", top: `${source.getBoundingClientRect().top}px`, left: "0", width: `${source.clientWidth}px`, margin: "0", visibility: "visible" });
  const frame = document.createElement("div");
  Object.assign(frame.style, { position: "absolute", inset: "0", overflow: "hidden", background: "var(--background)", willChange: "transform" });
  frame.append(snapshot);
  return frame;
}

/** Animate the visible page on navigation, including native browser history. */
export function PageNavigation({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const shell = useRef<HTMLDivElement>(null);
  const pending = useRef<{ overlay: HTMLDivElement; started: number; timeout: number } | null>(null);

  useEffect(() => {
    const clear = () => {
      if (pending.current) {
        clearTimeout(pending.current.timeout);
        pending.current.overlay.remove();
        pending.current = null;
      }
      if (shell.current) shell.current.style.visibility = "";
    };
    const begin = () => {
      if (!shell.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      clear();
      const source = shell.current;
      const overlay = document.createElement("div");
      overlay.dataset.navigationFrame = "outgoing";
      overlay.setAttribute("aria-hidden", "true");
      overlay.inert = true;
      Object.assign(overlay.style, { position: "fixed", inset: "0", zIndex: "9999", overflow: "hidden", background: "var(--brand)", pointerEvents: "none" });
      const frame = captureFrame(source);
      overlay.append(frame);
      document.body.append(overlay);
      source.style.visibility = "hidden";
      frame.animate([{ transform: "scale(1)" }, { transform: `scale(${PAGE_SCALE})` }], { duration: EXIT_DURATION, easing: EASE, fill: "forwards" });
      pending.current = { overlay, started: performance.now(), timeout: window.setTimeout(clear, 12000) };
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      event.preventDefault();
      begin();
      router.push(url.pathname + url.search + url.hash);
    };
    // Capture the outgoing DOM before Next handles the browser history change.
    const pop = () => begin();
    document.addEventListener("click", click, true);
    window.addEventListener("portfolio:before-history", pop);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("portfolio:before-history", pop);
      // The pending snapshot survives route changes; the layout effect reveals it.
    };
  }, [router, pathname]);

  useLayoutEffect(() => {
    const transition = pending.current;
    const page = shell.current;
    if (!transition || !page) return;
    clearTimeout(transition.timeout);
    const delay = Math.max(0, EXIT_DURATION + HOLD_DURATION - (performance.now() - transition.started));
    const timer = window.setTimeout(() => {
      const frame = transition.overlay.firstElementChild as HTMLDivElement;
      // The frame stays still. Only the two viewport previews move inside it.
      const outgoing = document.createElement("div");
      Object.assign(outgoing.style, { position: "absolute", inset: "0", overflow: "hidden" });
      outgoing.append(...Array.from(frame.childNodes));
      frame.append(outgoing);
      const incoming = captureFrame(page);
      frame.append(incoming);
      outgoing.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: SWAP_DURATION, easing: EASE, fill: "forwards" });
      incoming.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: SWAP_DURATION, easing: EASE, fill: "forwards" });
      const arrival = frame.animate([
        { transform: `scale(${PAGE_SCALE})` },
        { transform: "scale(1)" },
      ], { delay: SWAP_DURATION, duration: ENTER_DURATION, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "forwards" });
      arrival.finished.finally(() => {
        page.style.visibility = "";
        transition.overlay.remove();
        pending.current = null;
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [pathname]);

  return <div ref={shell} className="flex flex-1 flex-col bg-background">{children}</div>;
}
