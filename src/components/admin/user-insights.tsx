import { UserPlus, Users } from "lucide-react";
import { ChartMenu } from "@/components/admin/chart-card";
import { ChartPanel } from "@/components/admin/chart-panel";
import { Donut, Legend, TrendChart } from "@/components/admin/charts";
import { StatTiles } from "@/components/admin/stat-tiles";
import type { UserStats } from "@/lib/admin/user-stats";
import { cn } from "cn";

export const roleSlices = (s: UserStats) => [
  { key: "admins", label: "admins", value: s.admins },
  { key: "regular", label: "users", value: s.regular },
];

/** The headline numbers about the accounts: how many, who is an admin, who is blocked, who protects their account. */
export function UserTiles({ stats: s, className }: { stats: UserStats; className?: string }) {
  return (
    <StatTiles className={cn(className)} items={[
      { label: "Accounts", value: s.total, note: `${s.newInPeriod} new in ${s.days} days` },
      { label: "Admins", value: s.admins, note: s.adminsWithoutMfa ? `${s.adminsWithoutMfa} without 2-step` : "All with 2-step", warn: s.adminsWithoutMfa > 0 },
      { label: "Users", value: s.regular, note: `${s.active7} active this week` },
      { label: "Blocked", value: s.blocked, note: `${s.neverSignedIn} never signed in` },
    ]} />
  );
}

/** Sign-ups over time and the split between admins and users. */
export function UserInsights({ stats: s }: { stats: UserStats }) {
  return (
    <div className="contents">
      <div className="order-1 flex justify-end"><ChartMenu charts={[{ id: "users-signups", label: "New accounts" }, { id: "users-roles", label: "Admins and users" }]} /></div>
      <UserTiles stats={s} className="order-2" />
      <div className="order-4 grid gap-4 lg:order-3 lg:grid-cols-12">
        <ChartPanel id="users-signups" className="lg:col-span-8" icon={UserPlus} title="New accounts" description={`Created per day, last ${s.days} days.`}>
          <TrendChart data={s.signups} series={[{ key: "signups", label: "New accounts" }]} kind="bar" height={190} />
        </ChartPanel>
        <ChartPanel id="users-roles" className="lg:col-span-4" icon={Users} title="Admins and users" description="Who can change the site.">
          <Donut data={roleSlices(s)} caption="accounts" />
          <Legend data={roleSlices(s)} />
        </ChartPanel>
      </div>
    </div>
  );
}
