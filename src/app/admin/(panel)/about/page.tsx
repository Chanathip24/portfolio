import { Briefcase, ExternalLink, Layers, MessageSquareQuote, Wrench } from "lucide-react";
import { EntityManager } from "@/components/admin/entity-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listCareer, listSkills, listTaxonomy, listTestimonials, listTools, taxonomyOptions } from "@/lib/admin/data";
import { titleCase } from "@/lib/format";
import { Streamed } from "@/components/admin/page-loading";
import { CardsSkeleton } from "@/components/admin/skeletons";

const trigger = "h-10 flex-none gap-2 rounded-full border border-border px-4 text-sm data-active:border-foreground data-active:bg-foreground data-active:text-background";

export default function AboutAdmin() {
  return <Streamed fallback={<CardsSkeleton tabs />}><AboutAdminContent /></Streamed>;
}

async function AboutAdminContent() {
  const [skills, groups, tools, career, testimonials, options] = await Promise.all([listSkills(), listTaxonomy("skillGroup"), listTools(), listCareer(), listTestimonials(), taxonomyOptions()]);
  const groupName = new Map(groups.map((g) => [g.slug, g.name]));
  const groupOrder = new Map(groups.map((g, i) => [g.slug, i]));
  // Skills are shown group by group, in the order of the groups, then in their own order.
  const orderedSkills = [...skills].sort((a, b) => (groupOrder.get(a.group) ?? 99) - (groupOrder.get(b.group) ?? 99) || a.sort_order - b.sort_order);

  return (
    <>
      <PageHeader title="About page" description="The lists on the About page. Your name, bio and social links are under Profile; the skill groups are under Categories."
        action={<Button variant="outline" render={<a href="/about" target="_blank" rel="noopener" />} nativeButton={false} role="link"><ExternalLink /> View page</Button>} />
      <Tabs defaultValue="skills" className="gap-6">
        <TabsList className="h-auto! w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="skills" className={trigger}><Layers aria-hidden /> Skills <span className="tabular-nums opacity-60">{skills.length}</span></TabsTrigger>
          <TabsTrigger value="tools" className={trigger}><Wrench aria-hidden /> Tools <span className="tabular-nums opacity-60">{tools.length}</span></TabsTrigger>
          <TabsTrigger value="career" className={trigger}><Briefcase aria-hidden /> Career <span className="tabular-nums opacity-60">{career.length}</span></TabsTrigger>
          <TabsTrigger value="testimonials" className={trigger}><MessageSquareQuote aria-hidden /> Testimonials <span className="tabular-nums opacity-60">{testimonials.length}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <EntityManager entity="skill" noun="skill" empty="No skills yet. Add the first one." options={{ group: options.group }}
            items={orderedSkills.map((s) => ({ id: s.id, title: s.name, meta: s.note, note: `${s.years} ${s.years === 1 ? "year" : "years"}`, group: groupName.get(s.group) ?? titleCase(s.group), values: s }))} />
        </TabsContent>
        <TabsContent value="tools">
          <EntityManager entity="tool" noun="tool" variant="tiles" empty="No tools yet. Add one with its logo."
            items={tools.map((t) => ({ id: t.id, title: t.name, meta: t.logo_url ? "Custom logo" : t.tool_key ? "Built-in icon" : "Initials", tool: { name: t.name, tool_key: t.tool_key, logo_url: t.logo_url }, values: t }))} />
        </TabsContent>
        <TabsContent value="career">
          <EntityManager entity="career" noun="role" variant="timeline" empty="No career entries yet."
            items={career.map((c) => ({ id: c.id, title: `${c.role}, ${c.organisation}`, meta: `${c.start_year}–${c.end_year ?? "now"}${c.location ? ` · ${c.location}` : ""}`, badge: titleCase(c.kind), note: c.summary, values: c }))} />
        </TabsContent>
        <TabsContent value="testimonials">
          <EntityManager entity="testimonial" noun="testimonial" variant="quotes" empty="No testimonials yet."
            items={testimonials.map((t) => ({ id: t.id, title: t.author_name, meta: [t.author_role, t.company].filter(Boolean).join(", "), quote: { text: t.quote, avatar: t.avatar_url, who: t.author_name }, values: t }))} />
        </TabsContent>
      </Tabs>
    </>
  );
}
