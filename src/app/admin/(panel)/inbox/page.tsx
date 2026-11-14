import { Inbox } from "@/components/admin/inbox";
import { PageHeader } from "@/components/admin/page-header";
import { listMessages } from "@/lib/admin/data";
import { getMailStatus } from "@/lib/admin/mail-connection";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export default async function InboxPage() {
  const [messages, gmail] = await Promise.all([listMessages(), getMailStatus()]);
  return (
    <>
      <PageHeader title="Inbox" description="Messages from the contact form, mail from your Gmail, and notices about unusual access to the admin." />
      <Inbox messages={messages} gmail={gmail} />
    </>
  );
}
