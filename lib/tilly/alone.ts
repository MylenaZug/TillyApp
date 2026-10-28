export const MIN_ALONE_DURATION_MS = 60_000;

export function roundToMinute(iso: string): string | null {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return new Date(Math.round(timestamp / 60_000) * 60_000).toISOString();
}

export function localDateTimeToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function aloneDurationMs(startDatetime?: string | null, endDatetime?: string | null): number {
  if (!startDatetime || !endDatetime) return 0;
  const start = new Date(startDatetime).getTime();
  const end = new Date(endDatetime).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : 0;
}

export function normalizeAloneData(
  input: Record<string, unknown>,
  startColumn?: string | null,
  endColumn?: string | null,
) {
  const startValue = [startColumn, input.startDatetime, input.startedAt].find((value) => typeof value === "string" && value);
  const endValue = [endColumn, input.endDatetime, input.endedAt].find((value) => typeof value === "string" && value);
  const startDatetime = roundToMinute((startValue as string | undefined) || "");
  const endDatetime = roundToMinute((endValue as string | undefined) || "");
  const data = { ...input };
  delete data.startDatetime;
  delete data.endDatetime;
  delete data.startedAt;
  delete data.endedAt;
  delete data.ms;

  if (endDatetime) data.date = endDatetime;

  return { data, startDatetime, endDatetime };
}
