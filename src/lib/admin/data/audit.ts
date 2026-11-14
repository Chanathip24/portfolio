import "server-only";
import { db } from "./core";

export type AuditRow = { id: number; at: string; actor_email: string | null; action: "created" | "updated" | "deleted" | "event"; entity: string; entity_id: string | null; summary: string };
export type AuditFilter = { q?: string; action?: string; entity?: string; actor?: string; from?: string; to?: string; dir?: "asc" | "desc" };
const AUDIT_COLUMNS = "id,at,actor_email,action,entity,entity_id,summary";
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Narrow an audit query by the filters. Free text matches the summary or the person; dates are whole days (UTC). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function narrow(q: any, f: AuditFilter) {
  if (f.action) q = q.eq("action", f.action);
  if (f.entity) q = q.eq("entity", f.entity);
  if (f.actor) q = f.actor === "system" ? q.is("actor_email", null) : q.eq("actor_email", f.actor);
  const text = f.q?.replace(/[,()%*\\]/g, " ").trim();
  if (text) q = q.or(`summary.ilike.%${text}%,actor_email.ilike.%${text}%`);
  if (f.from && DAY.test(f.from)) q = q.gte("at", `${f.from}T00:00:00Z`);
  if (f.to && DAY.test(f.to)) q = q.lt("at", new Date(Date.parse(`${f.to}T00:00:00Z`) + 864e5).toISOString());
  return q;
}
export async function listAudit({ limit = 12, offset = 0, ...f }: { limit?: number; offset?: number } & AuditFilter = {}) {
  const asc = f.dir === "asc";
  const { data, count } = await narrow((await db()).from("audit_log").select(AUDIT_COLUMNS, { count: "exact" }), f)
    .order("at", { ascending: asc }).order("id", { ascending: asc }).range(offset, offset + limit - 1);
  return { rows: (data ?? []) as AuditRow[], total: (count ?? 0) as number };
}

export type AuditStats = {
  total: number;
  byAction: { key: string; label: string; value: number }[];
  byEntity: { name: string; value: number }[];
  byActor: { name: string; value: number }[];
  daily: Record<string, string | number>[];
  entities: string[];
  actors: string[];
};
const ACTIONS = ["created", "updated", "deleted", "event"] as const;
/** Counts for the activity charts, over the same filters. The database does the counting (audit_stats). */
export async function auditStats(f: AuditFilter): Promise<AuditStats> {
  const text = f.q?.replace(/[,()%*\\]/g, " ").trim();
  const { data } = await (await db()).rpc("audit_stats", {
    p_q: text || null, p_action: f.action || null, p_entity: f.entity || null, p_actor: f.actor || null,
    p_from: f.from && DAY.test(f.from) ? `${f.from}T00:00:00Z` : null,
    p_to: f.to && DAY.test(f.to) ? new Date(Date.parse(`${f.to}T00:00:00Z`) + 864e5).toISOString() : null,
  });
  const r = (data ?? {}) as { total?: number; by_action?: { name: string; value: number }[]; by_entity?: { name: string; value: number }[]; by_actor?: { name: string; value: number }[]; daily?: { day: string; action: string; n: number }[]; entities?: string[]; actors?: string[] };
  const end = f.to && DAY.test(f.to) ? new Date(`${f.to}T00:00:00Z`) : new Date();
  const start = f.from && DAY.test(f.from) ? new Date(`${f.from}T00:00:00Z`) : new Date(end.getTime() - 29 * 864e5);
  const span = Math.min(90, Math.max(1, Math.round((end.getTime() - start.getTime()) / 864e5) + 1));
  const days = Array.from({ length: span }, (_, i) => new Date(end.getTime() - (span - 1 - i) * 864e5).toISOString().slice(0, 10));
  const daily = days.map((day) => ({ day, ...Object.fromEntries(ACTIONS.map((a) => [a, 0])) })) as Record<string, string | number>[];
  const at = new Map(days.map((d, i) => [d, i]));
  for (const d of r.daily ?? []) { const i = at.get(d.day); if (i !== undefined) daily[i][d.action] = d.n; }
  const count = (a: string) => r.by_action?.find((x) => x.name === a)?.value ?? 0;
  return {
    total: r.total ?? 0,
    byAction: ACTIONS.map((a) => ({ key: a, label: a === "event" ? "Events" : a[0].toUpperCase() + a.slice(1), value: count(a) })),
    byEntity: r.by_entity ?? [],
    byActor: r.by_actor ?? [],
    daily,
    entities: r.entities ?? [],
    actors: r.actors ?? [],
  };
}
