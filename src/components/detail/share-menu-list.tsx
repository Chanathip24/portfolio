"use client";

import { Link2, Mail } from "lucide-react";
import type { RefObject } from "react";
import { FaLinkedinIn } from "react-icons/fa6";
import { SiX } from "react-icons/si";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
const enc = encodeURIComponent;

/** The share menu's list. Loaded on first hover, focus or click of the Share button (see share-menu.tsx), so the menu code is not in the page's first load. */
export default function ShareMenuList({ trigger, open: isOpen, onOpenChange, title, onCopy }: {
  trigger: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onCopy: () => void;
}) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuContent anchor={trigger} finalFocus={trigger} align="start" className="w-56">
        <DropdownMenuItem onClick={onCopy}>
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
