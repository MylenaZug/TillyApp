import { localDb } from "./local-db";
import { SYNC_PROTOCOL_HEADER, SYNC_PROTOCOL_VERSION, type SyncPullResponse, type SyncPushResponse } from "@/lib/tilly/protocol";

type Listener = () => void;
const listeners = new Set<Listener>();

export function onStorageChange(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let lastSyncAt: number | null = null;

// Zeitpunkt (Client-Uhr) des letzten erfolgreichen Syncs in dieser Sitzung.
export function getLastSyncAt() {
  return lastSyncAt;
}

function notify() {
  listeners.forEach((l) => l());
}

export const notifyStorageChange = notify;

// Zaehlt, wie oft sich der lokale Bestand durch einen Pull geaendert hat - die UI liest nur dann neu ein.
let dataVersion = 0;
export function getDataVersion() {
  return dataVersion;
}

let clientOutdated = false;

// true, sobald der Server die Protokollversion dieses Clients ablehnt (426): Die App muss neu
// geladen werden, bis dahin wird nicht mehr synchronisiert.
export function isClientOutdated() {
  return clientOutdated;
}

const PROTOCOL_HEADERS = { [SYNC_PROTOCOL_HEADER]: String(SYNC_PROTOCOL_VERSION) };

function markOutdated() {
  clientOutdated = true;
  notify();
}

export type SyncResult =
  | { status: "ok"; pushed: number; pulled: number }
  | { status: "offline" | "busy" | "outdated" | "failed" };

// Gibt die Anzahl der vom Server angenommenen Aenderungen zurueck.
async function pushQueue(): Promise<number> {
  const queue = await localDb.getQueue();
  if (!queue.kv.length && !queue.entries.length && !queue.dailyPatience.length) return 0;

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...PROTOCOL_HEADERS },
    credentials: "include",
    // updatedAt vergibt der Server; die Geduld gehoert immer dem eingeloggten Account.
    body: JSON.stringify({
      kv: queue.kv.map(({ key, value }) => ({ key, value })),
      entries: queue.entries.map(({ id, type, startAt, endAt, data, deleted }) => ({ id, type, startAt, endAt, data, deleted })),
      dailyPatience: queue.dailyPatience.map(({ date, geduld }) => ({ date, geduld })),
    }),
  });
  if (res.status === 426) {
    markOutdated();
    throw new Error("sync push failed: client outdated");
  }
  if (!res.ok) throw new Error(`sync push failed: ${res.status}`);

  const result: SyncPushResponse | undefined = await res.json?.().catch(() => undefined);
  // Abgelehnte Eintraege wuerden bei jedem Sync erneut abgelehnt - sie bleiben nicht in der Queue.
  const rejected = result?.rejected ?? [];
  if (rejected.length) console.warn("Tilly: Server hat Aenderungen abgelehnt", rejected);

  // Abgelehnte Eintraege bleiben (markiert) in der Queue, damit sie korrigiert oder geloescht werden
  // koennen. Einstellungen und Geduld haben triviale Schemas und werden wie bisher nur geloggt.
  const rejectedEntries = new Map(rejected.filter((r) => r.kind === "entry").map((r) => [r.id, r.error]));
  await localDb.markRejected(
    queue.entries.filter((e) => rejectedEntries.has(e.id)).map((e) => ({ id: e.id, updatedAt: e.updatedAt, error: rejectedEntries.get(e.id)! }))
  );

  // Erst nach erfolgreichem Push leeren, sonst gehen Aenderungen bei einem Fehler verloren.
  const accepted = queue.entries.filter((e) => !rejectedEntries.has(e.id));
  await localDb.ackQueue({ ...queue, entries: accepted });
  return queue.kv.length + accepted.length + queue.dailyPatience.length;
}

// Gibt die Anzahl der empfangenen Zeilen zurueck.
async function pullChanges(allowResync = true): Promise<number> {
  const { token } = await localDb.getMeta();
  const res = await fetch(token === null ? "/api/sync" : `/api/sync?token=${token}`, {
    credentials: "include",
    headers: PROTOCOL_HEADERS,
  });
  if (res.status === 426) {
    markOutdated();
    throw new Error("sync pull failed: client outdated");
  }
  if (res.status === 409 && allowResync) {
    // Token unbekannt (z.B. Server auf Backup zurueckgesetzt): Fenster neu laden.
    await localDb.resetSyncState();
    return pullChanges(false);
  }
  if (!res.ok) throw new Error(`sync pull failed: ${res.status}`);
  const body = (await res.json()) as SyncPullResponse;
  if (await localDb.applyPull(body)) dataVersion++;
  return body.kv.length + body.entries.length + body.dailyPatience.length;
}

let syncing = false;

export async function runSync(): Promise<SyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { status: "offline" };
  if (clientOutdated) return { status: "outdated" };
  if (syncing) return { status: "busy" };
  syncing = true;
  try {
    const pushed = await pushQueue();
    const pulled = await pullChanges();
    lastSyncAt = Date.now();
    notify();
    return { status: "ok", pushed, pulled };
  } catch (err) {
    // Bleibt in der Queue - naechster Trigger (online-Event/Intervall/Fokus) versucht es erneut.
    console.warn("Tilly sync failed, retrying later", err);
    return { status: clientOutdated ? "outdated" : "failed" };
  } finally {
    syncing = false;
  }
}

const DEFERRED_SYNC_MS = 5000;
let deferredTimer: ReturnType<typeof setTimeout> | null = null;

/** Fuer Tipp-Felder: viele Aenderungen in kurzer Zeit werden zu einem einzigen Sync gebuendelt. */
export function scheduleSync(delayMs = DEFERRED_SYNC_MS) {
  if (deferredTimer) clearTimeout(deferredTimer);
  deferredTimer = setTimeout(() => {
    deferredTimer = null;
    void runSync();
  }, delayMs);
}

/** Sendet einen ausstehenden verzoegerten Sync sofort (z.B. beim Verlassen der Seite). */
export function flushScheduledSync() {
  if (!deferredTimer) return;
  clearTimeout(deferredTimer);
  deferredTimer = null;
  void runSync();
}

// Schuetzt die IndexedDB davor, bei Speichermangel vom Browser geraeumt zu werden.
function requestPersistentStorage() {
  void navigator.storage?.persist?.().catch(() => {});
}

export function setupAutoSync() {
  if (typeof window === "undefined") return () => {};
  requestPersistentStorage();
  const trigger = () => void runSync();
  window.addEventListener("online", trigger);
  window.addEventListener("focus", trigger);
  const flush = () => {
    if (document.visibilityState === "hidden") flushScheduledSync();
  };
  document.addEventListener("visibilitychange", flush);
  window.addEventListener("pagehide", flushScheduledSync);
  const interval = setInterval(trigger, 2 * 60 * 1000);
  trigger();
  return () => {
    window.removeEventListener("online", trigger);
    window.removeEventListener("focus", trigger);
    document.removeEventListener("visibilitychange", flush);
    window.removeEventListener("pagehide", flushScheduledSync);
    clearInterval(interval);
  };
}
