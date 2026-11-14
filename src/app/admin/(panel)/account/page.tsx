import { listMyFactors } from "@/app/admin/account-actions";
import { PasswordPanel, ProfilePanel, SecurityPanel } from "@/components/admin/account-panels";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin/auth";

export const instant = false;

// Admin pages read the signed-in session, so they render on request, never ahead of time.
export default async function AccountPage() {
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
