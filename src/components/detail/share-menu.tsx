"use client";

import { Check, Link2, Mail, Share2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FaLinkedinIn } from "react-icons/fa6";
import { SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Static facts about the device: nothing to subscribe to. false on the server, so the first render matches.
const noSubscribe = () => () => {};
const canShareNatively = () => matchMedia("(hover: none)").matches && typeof navigator.share === "function";

/**
 * Share. With a mouse it opens a small menu (copy link, X, LinkedIn, email). On a phone, where the system has its own
 * share sheet with the apps the reader actually uses, it opens that instead. Copying says so on the button itself.
 */
export function ShareMenu({ title, className }: { title: string; className?: string }) {
  const native = useSyncExternalStore(noSubscribe, canShareNatively, () => false);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
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
  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const enc = encodeURIComponent;

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
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" className={buttonClass} />}>{content}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={copy}>
          <Link2 aria-hidden /> Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(location.href)}`)}>
          <SiX aria-hidden /> Post on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(location.href)}`)}>
          <FaLinkedinIn aria-hidden /> Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => (location.href = `mailto:?subject=${enc(title)}&body=${enc(location.href)}`)}>
          <Mail aria-hidden /> Send by email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
