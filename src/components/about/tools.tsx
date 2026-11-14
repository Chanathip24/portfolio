import { Marquee } from "@/components/ui/marquee";
import type { getTools } from "@/lib/api/about";
import { ToolMark, toolTint } from "@/components/tool-mark";

type Tools = Awaited<ReturnType<typeof getTools>>;

/**
 * Tools as two vertical marquee columns that run in opposite directions at different speeds, so they never line up and
 * read as a pattern. Each tool is a compact tile: its icon on a chip tinted with the brand colour, and its name. The
 * tiles fade out top and bottom; hovering a column pauses it and lifts the tile under the pointer.
 */
export function ToolsStack({ tools }: { tools: Tools }) {
  const half = Math.ceil(tools.length / 2);
  const columns = [tools.slice(0, half), tools.slice(half)];
  return (
    <div className="grid h-[26rem] grid-cols-2 gap-4 sm:h-[30rem] lg:h-[34rem]">
      {columns.map((column, i) => (
        <Marquee
          key={i}
          vertical
          reverse={i === 1}
          duration={i === 0 ? 34 : 42}
          label={i === 0 ? "Tools, first column" : "Tools, second column"}
          className="h-full [--marquee-gap:1rem]"
        >
          {column.map((t) => {
            return (
              <li
                key={t.id}
                style={{ "--tool": toolTint(t) } as React.CSSProperties}
                className="flex h-24 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card px-3 shadow-[0_12px_28px_-20px_rgba(0,0,0,0.35)] transition-[border-color,box-shadow,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] sm:gap-4 sm:px-4 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--tool)_55%,var(--border))] hover:shadow-[0_16px_32px_-18px_rgba(0,0,0,0.4)]"
              >
                <ToolMark tool={t} iconClassName="size-5 sm:size-6" className="size-10 rounded-xl bg-[color-mix(in_oklab,var(--tool)_14%,transparent)] text-[var(--tool)] sm:size-12" />
                <span className="min-w-0 text-[0.9375rem] font-medium leading-tight tracking-[-0.01em] sm:text-lg">{t.name}</span>
              </li>
            );
          })}
        </Marquee>
      ))}
    </div>
  );
}
