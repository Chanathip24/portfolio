"use client";

import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Adds a tooltip to an icon-only control. The control keeps its own aria-label; this is for sighted pointer users. */
export function Tip({ label, children }: { label: string; children: ReactElement<Record<string, unknown>> }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
