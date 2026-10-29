// Ableitung von Start/Ende aus dem Altformat (data.date bzw. startedAt/endedAt/ms bei alone);
// genutzt von der Datenmigration, der Sync-API (Uebergang) und der Client-Migration.

import { LEGACY_STOOL_CONSISTENCY } from "./constants";

const MINUTE_MS = 60_000;
const roundToMinute = (ms: number) => Math.round(ms / MINUTE_MS) * MINUTE_MS;
const toMs = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};
const firstMs = (...values: unknown[]) => {
  for (const value of values) {
    const ms = toMs(value);
    if (ms !== null) return ms;
  }
  return null;
};

/** Leitet Start und Ende aus dem Altformat ab (data.date bzw. startedAt/endedAt bei alone). */
export function legacyRange(type: string, data: Record<string, unknown>): { startAt: number | null; endAt: number | null } {
  if (type === "alone") {
    const start = firstMs(data.startDatetime, data.startedAt, data.date);
    const end = firstMs(data.endDatetime, data.endedAt) ?? (start !== null && typeof data.ms === "number" ? start + data.ms : null);
    return {
      startAt: start === null ? null : roundToMinute(start),
      endAt: end === null ? null : roundToMinute(end),
    };
  }
  const start = firstMs(data.date);
  return { startAt: start, endAt: start };
}

/** Bringt altformatige data-Felder auf den aktuellen Stand (Stuhlgang: consistency als Array, neue Bezeichnungen). */
export function normalizeLegacyData(type: string, data: Record<string, unknown>): Record<string, unknown> {
  if (type !== "stool" || data.consistency === undefined) return data;
  const raw = data.consistency;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const mapped = list.map((c) => LEGACY_STOOL_CONSISTENCY[String(c)] ?? String(c));
  return { ...data, consistency: [...new Set(mapped)] };
}
