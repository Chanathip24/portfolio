import "server-only";
import { addDays, siteDay, siteDayStart } from "@/lib/tz";
import { db, getTimeZone } from "./core";

export type AuditRow = { id: number; at: string; actor_email: string | null; action: "created" | "updated" | "deleted" | "event"; entity: string; entity_id: string | null; summary: string };
export type AuditFilter = { q?: string; action?: string; entity?: string; actor?: string; from?: string; to?: string; dir?: "asc" | "desc" };
const AUDIT_COLUMNS = "id,at,actor_email,action,entity,entity_id,summary";
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Narrow an audit query by the filters. Free text matches the summary or the person; dates are whole days (UTC). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function narrow(q: any, f: AuditFilter, tz: string) {
  if (f.action) q = q.eq("action", f.action);
  if (f.entity) q = q.eq("entity", f.entity);
  if (f.actor) q = f.actor === "system" ? q.is("actor_email", null) : q.eq("actor_email", f.actor);
  const text = f.q?.replace(/[,()%*\\]/g, " ").trim();
  if (text) q = q.or(`summary.ilike.%${text}%,actor_email.ilike.%${text}%`);
  if (f.from && DAY.test(f.from)) q = q.gte("at", siteDayStart(f.from, tz));
  if (f.to && DAY.test(f.to)) q = q.lt("at", siteDayStart(addDays(f.to, 1), tz));
  return q;
}
export async function listAudit({ limit = 12, offset = 0, ...f }: { limit?: number; offset?: number } & AuditFilter = {}) {
  const asc = f.dir === "asc";
  const { data, count } = await narrow((await db()).from("audit_log").select(AUDIT_COLUMNS, { count: "exact" }), f, await getTimeZone())
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
  const tz = await getTimeZone();
  const { data } = await (await db()).rpc("audit_stats", {
    p_q: text || null, p_action: f.action || null, p_entity: f.entity || null, p_actor: f.actor || null,
    p_from: f.from && DAY.test(f.from) ? siteDayStart(f.from, tz) : null,
    p_to: f.to && DAY.test(f.to) ? siteDayStart(addDays(f.to, 1), tz) : null,
    p_tz: tz,
  });
  const r = (data ?? {}) as { total?: number; by_action?: { name: string; value: number }[]; by_entity?: { name: string; value: number }[]; by_actor?: { name: string; value: number }[]; daily?: { day: string; action: string; n: number }[]; entities?: string[]; actors?: string[] };
  const end = f.to && DAY.test(f.to) ? f.to : siteDay(Date.now(), tz);
  const start = f.from && DAY.test(f.from) ? f.from : addDays(end, -29);
  const span = Math.min(90, Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 864e5) + 1));
  const days = Array.from({ length: span }, (_, i) => addDays(end, i + 1 - span));
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
