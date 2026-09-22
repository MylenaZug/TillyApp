import { localDb } from "./local-db";
import { onStorageChange, runSync, setSyncUser } from "./sync";
import type { EntryRecord, KvMutation, PatienceRecord } from "./types";

export { onStorageChange, runSync, setSyncUser, setupAutoSync } from "./sync";

function now() {
  return Date.now();
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function triggerSync() {
  void runSync();
}

// ---- kv (Einstellungen: Trainingsarten, Futterarten, Notiz, Futterplan, ...) ----

export async function getKv(key: string): Promise<string | null> {
  const map = await localDb.getAllKv();
  return map[key]?.value ?? null;
}

export async function setKv(key: string, value: string) {
  const row: KvMutation = { key, value, updatedAt: now() };
  await localDb.putKv(row);
  await localDb.enqueueKv(row);
  await triggerSync();
}

// ---- entries (Futter/Stuhlgang/Training/Stress/Symptom/Gewicht/Tierarzt/Kosten/Tagescheck) ----

export async function listEntries(): Promise<EntryRecord[]> {
  const map = await localDb.getAllEntries();
  return Object.values(map).filter((e) => !e.deleted);
}

export async function saveEntry(id: string | undefined, type: string, data: unknown): Promise<EntryRecord> {
  const row: EntryRecord = {
    id: id || uid(),
    type,
    data: JSON.stringify(data),
    updatedAt: now(),
    deleted: 0,
  };
  await localDb.putEntry(row);
  await localDb.enqueueEntry(row);
  await triggerSync();
  return row;
}

export async function deleteEntry(id: string) {
  const existing = await localDb.getEntry(id);
  const row: EntryRecord = {
    id,
    type: existing?.type || "",
    data: existing?.data || "{}",
    updatedAt: now(),
    deleted: 1,
  };
  await localDb.putEntry(row);
  await localDb.enqueueEntry(row);
  await triggerSync();
}

// ---- Geduld pro Google-Account (nicht geteilt, anders als Folgsamkeit/Sharklevel in entries) ----

export async function getPatience(userEmail: string, date: string): Promise<number> {
  const map = await localDb.getAllPatience();
  return map[`${userEmail}:${date}`]?.geduld ?? 0;
}

export async function listPatience(date: string): Promise<PatienceRecord[]> {
  return localDb.listPatience(date);
}

export async function setMyPatience(userEmail: string, date: string, geduld: number) {
  const row: PatienceRecord = { userEmail, date, geduld, updatedAt: now() };
  setSyncUser(userEmail);
  await localDb.putPatience(row);
  await localDb.enqueuePatience(row);
  await triggerSync();
}

export async function getPendingCount(userEmail?: string | null): Promise<number> {
  const q = userEmail === undefined ? await localDb.getQueue() : await localDb.getQueueForUser(userEmail ?? null);
  return q.kv.length + q.entries.length + q.dailyPatience.length;
}

export async function getLastSyncedAt(userEmail?: string): Promise<number> {
  const meta = await localDb.getMeta();
  return userEmail ? meta.lastSyncedAtByUser[userEmail] ?? 0 : meta.lastSyncedAt;
}
