// Ableitung von Start/Ende aus dem Altformat (data.date bzw. startedAt/endedAt/ms bei alone);
// genutzt von der Datenmigration, der Sync-API (Uebergang) und der Client-Migration.

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
