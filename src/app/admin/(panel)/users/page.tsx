import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { UserInsights } from "@/components/admin/user-insights";
import { UsersManager } from "@/components/admin/users-manager";
import { requireAdmin } from "@/lib/admin/auth";
import { userStats } from "@/lib/admin/user-stats";
import { listUsers, usersConfigured } from "@/lib/admin/users";
import { Streamed } from "@/components/admin/page-loading";
import { ListSkeleton } from "@/components/admin/skeletons";

export default function UsersPage() {
  return <Streamed fallback={<ListSkeleton tiles />}><UsersPageContent /></Streamed>;
}

async function UsersPageContent() {
  const me = await requireAdmin();
  const users = usersConfigured ? await listUsers() : null;
  return (
    <>
      <PageHeader title="Users" description="Everyone with an account. Add people, make them admins, reset a lost authenticator, change a password, block or delete." />
      {users ? (
        <div className="flex flex-col gap-4 lg:gap-6">
          <UserInsights stats={userStats(users)} />
          <div className="order-3 lg:order-4"><UsersManager users={users} meId={me.id} /></div>
        </div>
      ) : (
        <div className="flex max-w-xl flex-col gap-3 rounded-xl border border-dashed border-border p-8">
          <KeyRound aria-hidden className="size-5 text-muted-foreground" />
          <h2 className="font-medium">User management is not switched on</h2>
          <p className="text-sm text-muted-foreground">
            Managing other people&apos;s accounts needs the project&apos;s <code className="rounded bg-muted px-1.5 py-0.5">service_role</code> key, which Supabase only gives to server code.
            Add it to the server&apos;s environment as <code className="rounded bg-muted px-1.5 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> (Supabase, Project settings, API) and restart.
            It is never sent to the browser, and only a signed-in admin can trigger anything that uses it.
          </p>
        </div>
      )}
    </>
  );
}
