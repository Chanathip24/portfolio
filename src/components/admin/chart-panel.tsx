import type { LucideIcon } from "lucide-react";
import { ChartGate, HideChartButton } from "@/components/admin/chart-card";
import { DashCard } from "@/components/admin/dash-card";

/** A DashCard that holds a chart: the admin can hide it (and bring it back from the page's Charts menu). Give every one a stable `id`.
 *  `action` is a wider control such as a period switch; it goes on its own row on a phone. */
export function ChartPanel({ id, icon, title, description, action, className, children }: {
  id: string; icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  return (
    <ChartGate id={id}>
      <DashCard icon={icon} title={title} description={description} className={className} controls={action} action={<HideChartButton id={id} label={title} />}>
        {children}
      </DashCard>
    </ChartGate>
  );
}
