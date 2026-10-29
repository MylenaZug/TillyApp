import { localDb } from "./local-db";
import { onStorageChange, runSync } from "./sync";
import type { EntryRecord, KvRecord, PatienceRecord } from "./types";
import { legacyRange } from "@/lib/tilly/legacy";
import { parseEntry } from "@/lib/tilly/schemas";

export { getLastSyncAt, isClientOutdated, onStorageChange, runSync, setupAutoSync } from "./sync";

function now() {
  return Date.now();
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---- kv (Einstellungen: Trainingsarten, Futterarten, Notiz, Futterplan, ...) ----

export async function getKv(key: string): Promise<string | null> {
  return (await localDb.getKv(key))?.value ?? null;
}

export async function setKv(key: string, value: string) {
  const row: KvRecord = { key, value, updatedAt: now() };
  await localDb.putKv(row);
  await localDb.enqueueKv(row);
  void runSync();
}

// ---- entries (Futter/Stuhlgang/Training/Stress/Symptom/Gewicht/Tierarzt/Kosten/Tagescheck/Alleine) ----

export async function listEntries(): Promise<EntryRecord[]> {
  return localDb.listEntries();
}

/**
 * Speichert einen Eintrag lokal und reiht ihn fuer den Sync ein. Der Zeitraum kommt aus `range`
 * oder (bis die Formulare ihn direkt liefern) aus data.date bzw. startDatetime/endDatetime.
 */
export async function saveEntry(
  id: string | undefined,
  type: string,
  data: Record<string, unknown>,
  range?: { startAt: number; endAt: number }
): Promise<EntryRecord> {
  const times = range ?? legacyRange(type, data);
  const parsed = parseEntry({ type, startAt: times.startAt, endAt: times.endAt, data });
  if (!parsed.ok) throw new Error(`Eintrag ungueltig: ${parsed.error}`);
  const row: EntryRecord = {
    id: id || uid(),
    type,
    data: parsed.data as Record<string, unknown>,
    startAt: parsed.startAt,
    endAt: parsed.endAt,
    updatedAt: now(),
    deleted: false,
  };
  await localDb.putEntry(row);
  await localDb.enqueueEntry(row);
  void runSync();
  return row;
}

export async function deleteEntry(id: string) {
  const existing = await localDb.getEntry(id);
  if (!existing) return;
  await localDb.deleteEntry(id);
  await localDb.enqueueEntry({ ...existing, updatedAt: now(), deleted: true });
  void runSync();
}

// ---- Geduld pro Google-Account (nicht geteilt, anders als Folgsamkeit/Sharklevel in entries) ----

export async function getPatience(userEmail: string, date: string): Promise<number> {
  return (await localDb.getPatience(userEmail, date))?.geduld ?? 0;
}

export async function setMyPatience(userEmail: string, date: string, geduld: number) {
  const row: PatienceRecord = { userEmail, date, geduld, updatedAt: now() };
  await localDb.putPatience(row);
  await localDb.enqueuePatience(row);
  void runSync();
}

export async function listPatience(): Promise<PatienceRecord[]> {
  return localDb.listPatience();
}

export async function getPendingCount(): Promise<number> {
  return localDb.getPendingCount();
}
