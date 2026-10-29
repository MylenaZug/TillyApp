import { localDb } from "./local-db";
import { notifyStorageChange, runSync, scheduleSync } from "./sync";
import type { EntryRecord, KvRecord, PatienceRecord } from "./types";
import { legacyRange } from "@/lib/tilly/legacy";
import { SYNC_PROTOCOL_HEADER, SYNC_PROTOCOL_VERSION, type WireEntry } from "@/lib/tilly/protocol";
import { parseEntry } from "@/lib/tilly/schemas";

export { flushScheduledSync, getLastSyncAt, isClientOutdated, onStorageChange, runSync, setupAutoSync } from "./sync";

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

/** `deferSync`: fuer Tipp-Felder - lokal sofort, Netz erst nach einer Ruhepause (oder beim Verlassen der Seite). */
export async function setKv(key: string, value: string, options?: { deferSync?: boolean }) {
  const row: KvRecord = { key, value, updatedAt: now() };
  await localDb.putKv(row);
  await localDb.enqueueKv(row);
  if (options?.deferSync) scheduleSync();
  else void runSync();
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

/** true, wenn lokal alles bis zum aeltesten Eintrag des Servers vorliegt. */
export async function isHistoryComplete(): Promise<boolean> {
  const { loadedFrom, earliestAt } = await localDb.getMeta();
  return loadedFrom !== null && (earliestAt === null || loadedFrom <= earliestAt);
}

/** Fruehester Zeitpunkt, ab dem Eintraege lokal vollstaendig vorliegen (null: noch nicht synchronisiert). */
export async function getLoadedFrom(): Promise<number | null> {
  return (await localDb.getMeta()).loadedFrom;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Laedt Eintraege vom Server nach, die vor dem lokal vorhandenen Fenster liegen. Gibt false
 * zurueck, wenn das nicht geklappt hat (z.B. offline) - die App arbeitet dann mit dem Stand weiter.
 * Ohne `type` rueckt das Fenster nach vorne; mit `type` werden nur Eintraege dieses Typs aus dem
 * ganzen Zeitraum zusaetzlich abgelegt (Fenster bleibt unveraendert).
 */
export async function loadEntries(options: { from: number; type?: string }): Promise<boolean> {
  const { loadedFrom } = await localDb.getMeta();
  if (loadedFrom === null && !options.type) return false;
  const to = options.type ? Date.now() + DAY_MS : loadedFrom!;
  let from = Math.max(0, options.from);
  const { earliestAt } = await localDb.getMeta();
  // Nicht ueber den aeltesten Eintrag des Servers hinaus blaettern.
  if (!options.type && earliestAt !== null && from < earliestAt) from = earliestAt;
  if (to <= from) return true;
  try {
    const query = new URLSearchParams({ from: String(from), to: String(to) });
    if (options.type) query.set("type", options.type);
    const res = await fetch(`/api/entries?${query}`, { credentials: "include", headers: { [SYNC_PROTOCOL_HEADER]: String(SYNC_PROTOCOL_VERSION) } });
    if (!res.ok) return false;
    const body = (await res.json()) as { entries: WireEntry[]; truncated: boolean; earliestAt: number | null };
    // Bei abgeschnittener Antwort reicht das Fenster nur bis zum aeltesten gelieferten Eintrag.
    const covered = body.truncated ? Math.min(...body.entries.map((e) => e.startAt)) : from;
    await localDb.putLoadedEntries(body.entries, options.type ? undefined : covered, body.earliestAt);
    notifyStorageChange();
    return !body.truncated;
  } catch {
    return false;
  }
}

/**
 * Holt alle Eintraege ab `from` direkt vom Server (seitenweise), ohne sie lokal zu speichern -
 * fuer Auswertungen ueber das lokale Fenster hinaus. Wirft bei Fehlern (z.B. offline).
 */
export async function fetchEntriesSince(from: number): Promise<EntryRecord[]> {
  const result = new Map<string, EntryRecord>();
  let to = Date.now() + DAY_MS;
  for (;;) {
    const query = new URLSearchParams({ from: String(Math.max(0, from)), to: String(to) });
    const res = await fetch(`/api/entries?${query}`, { credentials: "include", headers: { [SYNC_PROTOCOL_HEADER]: String(SYNC_PROTOCOL_VERSION) } });
    if (!res.ok) throw new Error(`entries fetch failed: ${res.status}`);
    const body = (await res.json()) as { entries: WireEntry[]; truncated: boolean };
    for (const e of body.entries) result.set(e.id, { ...e, deleted: false });
    const oldest = Math.min(...body.entries.map((e) => e.startAt));
    if (!body.truncated || oldest >= to) break;
    to = oldest;
  }
  return [...result.values()];
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
