"use client";

import { Check, Share2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Static facts about the device: nothing to subscribe to. false on the server, so the first render matches.
const noSubscribe = () => () => {};
// The menu list is its own chunk: fetched when the pointer or focus reaches the button, mounted on the first open.
const loadList = () => import("./share-menu-list");
const ShareMenuList = dynamic(loadList, { ssr: false });
const canShareNatively = () => matchMedia("(hover: none)").matches && typeof navigator.share === "function";

/**
 * Share. With a mouse it opens a small menu (copy link, X, LinkedIn, email). On a phone, where the system has its own
 * share sheet with the apps the reader actually uses, it opens that instead. Copying says so on the button itself.
 */
export function ShareMenu({ title, className }: { title: string; className?: string }) {
  const native = useSyncExternalStore(noSubscribe, canShareNatively, () => false);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [listOpen, setListOpen] = useState(false);
  const [listMounted, setListMounted] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (next: "copied" | "failed") => {
    setState(next);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2200);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      flash("copied");
    } catch {
      flash("failed");
    }
  };

  const label = state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : "Share";
  const content = (
    <>
      {state === "copied" ? <Check aria-hidden className="size-4" strokeWidth={2} /> : <Share2 aria-hidden className="size-4" strokeWidth={1.75} />}
      {label}
      <span aria-live="polite" className="sr-only">{state === "copied" ? "Link copied to clipboard" : state === "failed" ? "Could not copy the link" : ""}</span>
    </>
  );
  const buttonClass = cn("h-10 rounded-full px-5", className);

  if (native) {
    return (
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={() => navigator.share({ title, url: location.href }).catch((e: DOMException) => {
            if (e.name !== "AbortError") copy(); // closing the share sheet is not an error
          })}
      >
        {content}
      </Button>
    );
  }

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        variant="outline"
        className={buttonClass}
        aria-haspopup="menu"
        aria-expanded={listOpen}
        onPointerEnter={loadList}
        onFocus={loadList}
        onClick={() => {
          setListMounted(true);
          setListOpen((o) => !o);
        }}
      >
        {content}
      </Button>
      {listMounted && <ShareMenuList trigger={trigger} open={listOpen} onOpenChange={setListOpen} title={title} onCopy={copy} />}
    </>
  );
}
