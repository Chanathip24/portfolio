import { MailSettings } from "@/components/admin/mail-settings";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsPanel } from "@/components/admin/settings-panel";
import { getSettings } from "@/lib/admin/data";
import { getMailStatus, redirectUri } from "@/lib/admin/mail-connection";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ gmail?: string }> }) {
  const [settings, mail, uri, { gmail }] = await Promise.all([getSettings(), getMailStatus(), redirectUri(), searchParams]);
  return (
    <>
      <PageHeader title="Settings" description="How the admin itself behaves, and the accounts it connects to." />
      <div className="grid max-w-3xl gap-4">
        <SettingsPanel dataTools={settings.dataToolsEnabled} />
        <MailSettings status={mail} redirectUri={uri} flash={gmail} />
      </div>
    </>
  );
}
