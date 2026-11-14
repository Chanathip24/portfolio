import { Inbox } from "@/components/admin/inbox";
import { PageHeader } from "@/components/admin/page-header";
import { listMessages } from "@/lib/admin/data";
import { getMailStatus } from "@/lib/admin/mail-connection";
import { Streamed } from "@/components/admin/page-loading";
import { InboxSkeleton } from "@/components/admin/skeletons";

export default function InboxPage() {
  return <Streamed fallback={<InboxSkeleton />}><InboxPageContent /></Streamed>;
}

async function InboxPageContent() {
  const [messages, gmail] = await Promise.all([listMessages(), getMailStatus()]);
  return (
    <>
      <PageHeader title="Inbox" description="Messages from the contact form, mail from your Gmail, and notices about unusual access to the admin." />
      <Inbox messages={messages} gmail={gmail} />
    </>
  );
}
