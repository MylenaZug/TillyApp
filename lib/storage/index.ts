import { localDb } from "./local-db";
import { onStorageChange, runSync } from "./sync";
import type { EntryRecord, KvMutation, PatienceRecord } from "./types";

export { onStorageChange, runSync, setupAutoSync } from "./sync";

function now() {
  return Date.now();
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function enqueue(mutate: (queue: Awaited<ReturnType<typeof localDb.getQueue>>) => void) {
  const queue = await localDb.getQueue();
  mutate(queue);
  await localDb.setQueue(queue);
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
  await enqueue((q) => {
    q.kv = q.kv.filter((r) => r.key !== key);
    q.kv.push(row);
  });
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
  await enqueue((q) => {
    q.entries = q.entries.filter((r) => r.id !== row.id);
    q.entries.push(row);
  });
  return row;
}

export async function deleteEntry(id: string) {
  const map = await localDb.getAllEntries();
  const existing = map[id];
  const row: EntryRecord = {
    id,
    type: existing?.type || "",
    data: existing?.data || "{}",
    updatedAt: now(),
    deleted: 1,
  };
  await localDb.putEntry(row);
  await enqueue((q) => {
    q.entries = q.entries.filter((r) => r.id !== id);
    q.entries.push(row);
  });
}

// ---- Geduld pro Google-Account (nicht geteilt, anders als Folgsamkeit/Sharklevel in entries) ----

export async function getPatience(userEmail: string, date: string): Promise<number> {
  const map = await localDb.getAllPatience();
  return map[`${userEmail}:${date}`]?.geduld ?? 0;
}

export async function setMyPatience(userEmail: string, date: string, geduld: number) {
  const row: PatienceRecord = { userEmail, date, geduld, updatedAt: now() };
  await localDb.putPatience(row);
  await enqueue((q) => {
    q.dailyPatience = q.dailyPatience.filter((r) => r.date !== date);
    q.dailyPatience.push({ date, geduld, updatedAt: row.updatedAt });
  });
}

export async function getPendingCount(): Promise<number> {
  const q = await localDb.getQueue();
  return q.kv.length + q.entries.length + q.dailyPatience.length;
}
