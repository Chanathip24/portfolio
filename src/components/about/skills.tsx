"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getSkills } from "@/lib/api/about";
import { SkillGroup } from "@/lib/enums";
import { titleCase } from "@/lib/format";
import { Parallax } from "@/components/ui/parallax";

type Skills = Awaited<ReturnType<typeof getSkills>>;
const groups = Object.values(SkillGroup);

/** Skills by area. Each is a name, one honest line about how it is used, and years; a list, not a grid of badges. */
export function Skills({ skills }: { skills: Skills }) {
  return (
    <section aria-labelledby="skills-title" className="page-x pt-40">
      <Parallax distance={18}>
        <h2 id="skills-title" className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.03em]">
          What I do
        </h2>
      </Parallax>
      <Tabs defaultValue={SkillGroup.Frontend} className="mt-12 gap-8">
        <TabsList className="h-auto! w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          {groups.map((g) => (
            <TabsTrigger
              key={g}
              value={g}
              className="h-10 flex-none rounded-full border border-border px-4 text-sm data-active:border-foreground data-active:bg-foreground data-active:text-background"
            >
              {titleCase(g)}
              <span className="tabular-nums opacity-60">{skills.filter((s) => s.group === g).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((g) => (
          <TabsContent key={g} value={g}>
            <ul className="border-b border-border">
              {skills
                .filter((s) => s.group === g)
                .map((s) => (
                  <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-8 gap-y-1 border-t border-border py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_5rem]">
                    <span className="text-2xl font-medium leading-tight tracking-[-0.01em]">{s.name}</span>
                    <span className="order-3 col-span-2 text-muted-foreground sm:order-none sm:col-span-1">{s.note}</span>
                    <span className="text-right text-sm tabular-nums text-muted-foreground">{s.years} yrs</span>
                  </li>
                ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
