"use client";

import { ArrowUpRight, BatteryFull, ExternalLink, Laptop, RotateCw, Signal, Smartphone, Wifi, X } from "lucide-react";
import { Link } from "next-view-transitions";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SiteImage } from "@/components/ui/site-image";
import type { WorkItem } from "@/lib/api/projects";
import { cn } from "@/lib/utils";

type Viewport = "desktop" | "phone";

/** Our own demo pages (a relative URL) need only scripts and forms, so they get a fully isolated sandbox. An external
 *  site also gets its own origin (many apps break without storage); that is safe because it really is another origin. */
const sandboxFor = (url: string) =>
  url.startsWith("/") ? "allow-scripts allow-forms" : "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

/** The address shown in the frame's bar: a relative preview is one of our own demo pages, so show its path. */
const addressOf = (url: string) => {
  try {
    return url.startsWith("/") ? url : new URL(url).host;
  } catch {
    return url;
  }
};

const subscribeNothing = () => () => {};
const isWide = () => matchMedia("(min-width: 640px)").matches;

/** Fits a device of fixed logical size (w x h, in CSS px) into the space it is given: the largest scale that fits, never
 *  above 1. The site inside renders at the device's real width, then the whole device is scaled, so its layout is genuine. */
function useFit(w: number, h: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; ready: boolean }>({ scale: 1, ready: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFit({ scale: Math.min(1, el.clientWidth / w, el.clientHeight / h), ready: true }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);
  return [ref, fit] as const;
}

type ScreenProps = { children: React.ReactNode; loaded: boolean };

/** The loading veil that sits over a device screen until the page inside has loaded. */
function Veil({ loaded }: { loaded: boolean }) {
  if (loaded) return null;
  return (
    <div role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-white text-sm text-neutral-500">
      <span className="animate-pulse">Loading preview…</span>
    </div>
  );
}

/** A MacBook-style display: black bezel, the notch, a menu bar, then a macOS window (traffic lights and address) holding the
 *  site, and the base underneath. Logical size 1360 x 860; the screen is 1280 x 800. */
const MAC = { w: 1360, h: 860 };
function Mac({ url, children, loaded }: ScreenProps & { url: string }) {
  return (
    <div className="flex flex-col items-center" style={{ width: MAC.w, height: MAC.h }}>
      <div className="rounded-[26px] bg-[#0d0d10] p-4 shadow-[0_40px_60px_-30px_rgba(0,0,0,0.5)]" style={{ width: 1312 }}>
        <div className="relative overflow-hidden rounded-[10px] bg-white" style={{ width: 1280, height: 800 }}>
          <div className="flex h-7 items-center justify-between bg-neutral-200/90 px-4 text-[13px] text-neutral-800">
            <span aria-hidden className="flex gap-5"><b className="font-semibold">Preview</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><span>Help</span></span>
            <span aria-hidden className="tabular-nums">Mon 9:41</span>
          </div>
          <div aria-hidden className="absolute left-1/2 top-0 z-20 h-7 w-[170px] -translate-x-1/2 rounded-b-[14px] bg-[#0d0d10]" />
          <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-100 px-4" style={{ height: 40 }}>
            <span aria-hidden className="flex gap-2"><i className="size-3 rounded-full bg-[#ff5f57]" /><i className="size-3 rounded-full bg-[#febc2e]" /><i className="size-3 rounded-full bg-[#28c840]" /></span>
            <span className="mx-auto w-[520px] max-w-[60%] truncate rounded-md bg-white px-3 py-1 text-center text-[13px] text-neutral-500">{addressOf(url)}</span>
            <span className="w-[52px]" aria-hidden />
          </div>
          <div className="relative" style={{ width: 1280, height: 800 - 28 - 40 }}>
            <Veil loaded={loaded} />
            {children}
          </div>
        </div>
      </div>
      <div className="h-[18px] rounded-b-[26px] bg-gradient-to-b from-[#d8d9dc] to-[#b9bbbf]" style={{ width: MAC.w }}>
        <div className="mx-auto h-[6px] w-[180px] rounded-b-md bg-[#a3a5a9]" />
      </div>
    </div>
  );
}

/** An iPhone-style device: titanium frame, side buttons, the dynamic island, a status bar, the site, and the home
 *  indicator. Logical size 414 x 784; the screen is 390 x 760. */
const PHONE = { w: 414, h: 784 };
function Phone({ children, loaded }: ScreenProps) {
  return (
    <div className="relative" style={{ width: PHONE.w, height: PHONE.h }}>
      <i aria-hidden className="absolute -left-[3px] top-[118px] h-8 w-[3px] rounded-l bg-[#2b2b2f]" />
      <i aria-hidden className="absolute -left-[3px] top-[170px] h-14 w-[3px] rounded-l bg-[#2b2b2f]" />
      <i aria-hidden className="absolute -left-[3px] top-[236px] h-14 w-[3px] rounded-l bg-[#2b2b2f]" />
      <i aria-hidden className="absolute -right-[3px] top-[190px] h-24 w-[3px] rounded-r bg-[#2b2b2f]" />
      <div className="size-full rounded-[58px] bg-[#2b2b2f] p-[3px] shadow-[0_40px_60px_-30px_rgba(0,0,0,0.5)]">
        <div className="size-full rounded-[55px] bg-black p-[9px]">
          <div className="relative size-full overflow-hidden rounded-[46px] bg-white">
            <div aria-hidden className="absolute left-1/2 top-[11px] z-20 h-[34px] w-[118px] -translate-x-1/2 rounded-full bg-black" />
            <div aria-hidden className="flex items-end justify-between bg-white px-9 pb-1.5 text-[15px] font-semibold text-black" style={{ height: 52 }}>
              <span className="tabular-nums">9:41</span>
              <span className="flex items-center gap-1.5"><Signal className="size-4" strokeWidth={2.25} /><Wifi className="size-4" strokeWidth={2.25} /><BatteryFull className="size-[1.4rem]" strokeWidth={1.75} /></span>
            </div>
            <div className="relative" style={{ width: 390, height: 760 - 52 }}>
              <Veil loaded={loaded} />
              {children}
            </div>
            <div aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 z-20 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame({ item, url }: { item: WorkItem; url: string }) {
  const wide = useSyncExternalStore(subscribeNothing, isWide, () => true);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [run, setRun] = useState(0); // bumping this remounts the iframe, which reloads it
  const [loaded, setLoaded] = useState(false);
  const device = viewport === "phone" ? PHONE : MAC;
  const [stage, fit] = useFit(device.w, device.h);

  const iframe = (
    <iframe
      key={`${run}-${viewport}`}
      src={url}
      title={`${item.title}, live preview`}
      onLoad={() => setLoaded(true)}
      sandbox={sandboxFor(url)}
      referrerPolicy="no-referrer"
      className="absolute inset-0 size-full bg-white"
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div role="group" aria-label="Preview size" className="hidden items-center gap-1 rounded-full border border-border bg-card p-1 sm:flex">
          {([["desktop", Laptop, "Desktop"], ["phone", Smartphone, "Phone"]] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={viewport === v}
              onClick={() => { setLoaded(false); setViewport(v); }}
              className={cn("flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors", viewport === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon aria-hidden className="size-4" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
        <p className="hidden min-w-0 flex-1 truncate text-center text-xs text-muted-foreground lg:block">
          A sandboxed preview you can click around in. If a site looks blank, it refuses to be framed: open it in a new tab.
        </p>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => { setLoaded(false); setRun((n) => n + 1); }} aria-label="Reload preview">
            <RotateCw aria-hidden className="size-4" strokeWidth={1.75} />
          </Button>
          <Button nativeButton={false} variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Open the preview in a new tab" render={<a href={url} target="_blank" rel="noopener noreferrer" role="link" />}>
            <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {wide ? (
        <div ref={stage} className="relative min-h-0 flex-1">
          <div
            className={cn("absolute left-1/2 top-1/2 transition-opacity duration-300", fit.ready ? "opacity-100" : "opacity-0")}
            style={{ width: device.w * fit.scale, height: device.h * fit.scale, transform: "translate(-50%, -50%)" }}
          >
            <div style={{ width: device.w, height: device.h, transform: `scale(${fit.scale})`, transformOrigin: "top left" }}>
              {viewport === "phone" ? <Phone loaded={loaded}>{iframe}</Phone> : <Mac url={url} loaded={loaded}>{iframe}</Mac>}
            </div>
          </div>
        </div>
      ) : (
        // A real phone: the device frame would be a frame inside a frame, so show the page edge to edge.
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted/50 px-3 py-2">
            <span className="block truncate rounded-md bg-background px-3 py-1 text-center text-xs text-muted-foreground">{addressOf(url)}</span>
          </div>
          <div className="relative min-h-0 flex-1">
            {!loaded && (
              <div role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-card text-sm text-muted-foreground">
                <span className="animate-pulse">Loading preview…</span>
              </div>
            )}
            {iframe}
          </div>
        </div>
      )}
    </div>
  );
}

function NoPreview({ item }: { item: WorkItem }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-5 text-center">
      <span className="block w-full max-w-md overflow-hidden rounded-2xl bg-tile">
        <SiteImage src={item.image} alt={`${item.title} cover`} width={800} height={600} sizes="28rem" className="aspect-[4/3] w-full object-cover" />
      </span>
      <p className="max-w-[40ch] text-muted-foreground">A live preview isn’t available for this project. See the details, or visit it directly.</p>
    </div>
  );
}

/**
 * Preview a project without leaving the page: a near-fullscreen dialog (fullscreen on a phone) holding the project's live
 * page in a device: a MacBook display, or an iPhone, scaled to fit. Visitors can use the page. Footer: the summary, and
 * the two ways on: the project's detail page, or the project itself.
 */
export function ProjectPreview({ item, onClose }: { item: WorkItem | null; onClose: () => void }) {
  // Keep showing the last project while the dialog animates closed.
  const [shown, setShown] = useState(item);
  if (item && item !== shown) setShown(item);
  if (!shown) return null;

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="flex! h-dvh! w-screen! max-w-none! flex-col! gap-0! overflow-hidden! rounded-none! p-0! sm:h-[min(92dvh,58rem)]! sm:w-[min(96vw,84rem)]! sm:max-w-none! sm:rounded-2xl!">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <DialogTitle className="truncate text-lg font-medium">{shown.title}</DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-sm text-muted-foreground">
              {shown.client} · {shown.year}
              {shown.tags.length > 0 && <> · {shown.tags.join(", ")}</>}
            </DialogDescription>
          </div>
          {/* A real target: 44px, outlined, away from the corner, and Escape or a click outside close it too. */}
          <DialogClose render={<Button type="button" variant="outline" size="icon" className="size-11 shrink-0 rounded-full" />}>
            <X aria-hidden className="size-5" strokeWidth={2} />
            <span className="sr-only">Close preview</span>
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 bg-muted/40 p-3 sm:px-6 sm:py-4">
          {shown.previewUrl ? <Frame key={shown.slug} item={shown} url={shown.previewUrl} /> : <NoPreview item={shown} />}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="line-clamp-2 max-w-[62ch] text-sm text-muted-foreground">{shown.summary}</p>
          <div className="flex shrink-0 gap-2">
            <Button nativeButton={false} variant="outline" className="h-10 flex-1 rounded-full px-5 sm:flex-none" render={<Link href={shown.href} role="link" onClick={onClose} />}>
              View details
            </Button>
            {shown.liveUrl && (
              <Button nativeButton={false} className="h-10 flex-1 rounded-full px-5 sm:flex-none" render={<a href={shown.liveUrl} target="_blank" rel="noopener noreferrer" role="link" />}>
                Visit project <ArrowUpRight aria-hidden className="size-4" strokeWidth={2} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
