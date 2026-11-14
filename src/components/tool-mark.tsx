import type { ToolRow } from "@/lib/api/types";
import { toolColors, toolIcons } from "@/lib/icons";
import { cn } from "cn";

type Tool = Pick<ToolRow, "name" | "tool_key" | "logo_url">;

/** The colour a tool is tinted with: its brand colour when it has a built-in icon, otherwise the site's brand colour. */
export const toolTint = (t: Pick<ToolRow, "tool_key">) => (t.tool_key ? toolColors[t.tool_key] : "var(--brand-ink)");

/** A tool's mark: its uploaded logo if it has one, else the built-in icon for its key, else its initials.
 *  Size and shape come from `className` (the chip around it). */
export function ToolMark({ tool, className, iconClassName = "size-5" }: { tool: Tool; className?: string; iconClassName?: string }) {
  const Icon = tool.tool_key ? toolIcons[tool.tool_key] : null;
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden", className)}>
      {tool.logo_url ? (
        // A plain img: logos are small, may be SVG, and may live on any address the admin pasted.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tool.logo_url} alt="" loading="lazy" decoding="async" className="size-full object-contain p-[18%]" />
      ) : Icon ? (
        <Icon aria-hidden className={iconClassName} />
      ) : (
        <span aria-hidden className="text-sm font-semibold uppercase tracking-tight">{tool.name.slice(0, 2)}</span>
      )}
    </span>
  );
}
