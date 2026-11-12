import { Marquee } from "@/components/ui/marquee";
import type { getTools } from "@/lib/api/about";
import { toolIcons } from "@/lib/icons";

type Tools = Awaited<ReturnType<typeof getTools>>;

/** Tools as two opposing marquee rows. Rows run at different speeds so they never line up and read as a pattern. */
export function Tools({ tools }: { tools: Tools }) {
  const half = Math.ceil(tools.length / 2);
  const rows = [tools.slice(0, half), tools.slice(half)];
  return (
    <section aria-labelledby="tools-title" className="pt-40">
      <h2 id="tools-title" className="page-x text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.03em]">
        Tools I reach for
      </h2>
      <div className="mt-14 space-y-6">
        {rows.map((row, i) => (
          <Marquee key={i} reverse={i === 1} duration={i === 0 ? 38 : 46} label={i === 0 ? "Tools, first row" : "Tools, second row"}>
            {row.map((t) => {
              const Icon = toolIcons[t.tool_key];
              return (
                <li key={t.id} className="flex items-center gap-4 text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  <Icon aria-hidden className="size-9 shrink-0" />
                  <span className="whitespace-nowrap font-display text-[clamp(1.75rem,3.2vw,2.75rem)] italic leading-none">{t.name}</span>
                </li>
              );
            })}
          </Marquee>
        ))}
      </div>
    </section>
  );
}
