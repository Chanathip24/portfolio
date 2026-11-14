import { EntityEditor } from "@/components/admin/entity-editor";
import { EntityManager } from "@/components/admin/entity-manager";
import { PageHeader } from "@/components/admin/page-header";
import { HistoryButton } from "@/components/admin/revisions";
import { getProfileAdmin, listRevisions } from "@/lib/admin/data";
import { blank } from "@/lib/admin/fields";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export default async function ProfilePage() {
  const profile = await getProfileAdmin();
  const revisions = profile ? await listRevisions("profile", profile.id) : [];
  return (
    <>
      <PageHeader title="Profile" description="Your name, headline, portrait and bio. They appear at the top of the About page." action={profile ? <HistoryButton items={revisions} /> : undefined} />
      <EntityEditor entity="profile" id={profile?.id ?? null} initial={profile ?? { ...blank.profile, display_name: "", years_experience: 0 }} submitLabel={profile ? "Save profile" : "Create profile"} />

      {profile && (
        <section aria-labelledby="social-h" className="mt-12">
          <h2 id="social-h" className="text-lg font-medium tracking-tight">Social links</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">Shown under your summary on the About page.</p>
          <EntityManager entity="social" noun="link" empty="No links yet."
            items={profile.socials.map((s) => ({ id: s.id, title: s.label, meta: s.handle || s.url, values: s }))} />
        </section>
      )}
    </>
  );
}
