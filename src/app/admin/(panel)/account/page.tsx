import { listMyFactors } from "@/app/admin/account-actions";
import { PasswordPanel, ProfilePanel, SecurityPanel } from "@/components/admin/account-panels";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin/auth";
import { Streamed } from "@/components/admin/page-loading";
import { FormSkeleton } from "@/components/admin/skeletons";

export default function AccountPage() {
  return <Streamed fallback={<FormSkeleton />}><AccountPageContent /></Streamed>;
}

async function AccountPageContent() {
  const [me, factors] = await Promise.all([requireAdmin(), listMyFactors()]);
  return (
    <>
      <PageHeader title="My account" description="Your own profile and sign-in settings." />
      <div className="grid max-w-3xl gap-4">
        <ProfilePanel name={me.name} email={me.email} avatar={me.avatar} />
        <SecurityPanel factors={factors} />
        <PasswordPanel />
      </div>
    </>
  );
}
