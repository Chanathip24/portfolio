import { FolderKanban, Layers, Newspaper } from "lucide-react";
import { EntityManager } from "@/components/admin/entity-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listTaxonomy } from "@/lib/admin/data";

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export const instant = false;

const trigger = "h-10 flex-none gap-2 rounded-full border border-border px-4 text-sm data-active:border-foreground data-active:bg-foreground data-active:text-background";
const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export default async function CategoriesPage() {
  const [postCategories, projectCategories, skillGroups] = await Promise.all([listTaxonomy("postCategory"), listTaxonomy("projectCategory"), listTaxonomy("skillGroup")]);
  return (
    <>
      <PageHeader title="Categories" description="The lists that organise the site: what a blog post or project can be filed under, and how skills are grouped on the About page. Lower numbers come first. One in use can't be deleted until its items are moved." />
      <Tabs defaultValue="posts" className="gap-6">
        <TabsList className="h-auto! w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="posts" className={trigger}><Newspaper aria-hidden /> Blog categories <span className="tabular-nums opacity-60">{postCategories.length}</span></TabsTrigger>
          <TabsTrigger value="projects" className={trigger}><FolderKanban aria-hidden /> Work categories <span className="tabular-nums opacity-60">{projectCategories.length}</span></TabsTrigger>
          <TabsTrigger value="skills" className={trigger}><Layers aria-hidden /> Skill groups <span className="tabular-nums opacity-60">{skillGroups.length}</span></TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <EntityManager entity="postCategory" noun="category" empty="No blog categories yet. Posts need one, so add the first."
            items={postCategories.map((c) => ({ id: c.slug, title: c.name, meta: `/blog?category=${c.slug}`, note: count(c.used, "post"), values: c }))} />
        </TabsContent>
        <TabsContent value="projects">
          <EntityManager entity="projectCategory" noun="category" empty="No work categories yet."
            items={projectCategories.map((c) => ({ id: c.slug, title: c.name, meta: c.slug, note: count(c.used, "project"), values: c }))} />
        </TabsContent>
        <TabsContent value="skills">
          <EntityManager entity="skillGroup" noun="group" empty="No skill groups yet. Skills need one, so add the first."
            items={skillGroups.map((c) => ({ id: c.slug, title: c.name, meta: c.slug, note: count(c.used, "skill"), values: c }))} />
        </TabsContent>
      </Tabs>
    </>
  );
}
