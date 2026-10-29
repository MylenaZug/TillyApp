export const MIN_ALONE_DURATION_MS = 60_000;

export function roundToMinute(ms: number): number | null {
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 60_000) * 60_000;
}

/** Wandelt einen "YYYY-MM-DDTHH:mm"-Wert (lokale Zeit) in Epoch-ms. */
export function localDateTimeToMs(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function aloneDurationMs(startAt?: number | null, endAt?: number | null): number {
  if (startAt == null || endAt == null) return 0;
  return Number.isFinite(startAt) && Number.isFinite(endAt) && endAt > startAt ? endAt - startAt : 0;
}
