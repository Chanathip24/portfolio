import "server-only";
import { db } from "./core";

export type ErrorGroup = { fingerprint: string; n: number; first_seen: string; last_seen: string; source: "client" | "server"; message: string; path: string; stack: string | null; pages: number };
export type ErrorSummary = {
  total: number;
  groups: ErrorGroup[];
  daily: { day: string; source: "client" | "server"; n: number }[];
  paths: { name: string; value: number }[];
};

/** Errors in the last `days` days, grouped by fingerprint (the same bug counts once, with how often it happened). */
export async function getErrorSummary(days: number) {
  const { data } = await (await db()).rpc("error_summary", { days });
  const stats = data as ErrorSummary | null;
  if (!stats) return null;
  // One row per day (at least a week, so a quiet period still draws), with zeros where nothing happened.
  const span = Math.max(days, 7);
  const series = Array.from({ length: span }, (_, i) => ({ day: new Date(Date.now() - (span - 1 - i) * 864e5).toISOString().slice(0, 10), client: 0, server: 0 }) as Record<string, string | number>);
  for (const d of stats.daily) { const row = series.find((r) => r.day === d.day); if (row) row[d.source] = d.n; }
  return { ...stats, series };
}
