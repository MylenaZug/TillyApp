import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SyncPullResponse, WireEntry } from "@/lib/tilly/protocol";
import type { EntryRecord, KvRecord, PatienceRecord, PendingPatience, PendingQueue, SyncMeta } from "./types";

// Objekt-Stores statt einer grossen Map: Eintraege sind ueber Zeit-Indizes abfragbar, und ein
// Sync schreibt nur die geaenderten Zeilen. Die App bleibt offline les- und schreibbar.
const DB_NAME = "tilly";

type QueuedPatience = PendingPatience & { key: string };
type StoredPatience = PatienceRecord & { key: string };

interface TillyDB extends DBSchema {
  kv: { key: string; value: KvRecord };
  entries: { key: string; value: EntryRecord; indexes: { startAt: number; endAt: number } };
  patience: { key: string; value: StoredPatience };
  queueKv: { key: string; value: KvRecord };
  queueEntries: { key: string; value: EntryRecord };
  queuePatience: { key: string; value: QueuedPatience };
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<TillyDB>> | null = null;

function open() {
  dbPromise ??= openDB<TillyDB>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore("kv", { keyPath: "key" });
      const entries = db.createObjectStore("entries", { keyPath: "id" });
      entries.createIndex("startAt", "startAt");
      entries.createIndex("endAt", "endAt");
      db.createObjectStore("patience", { keyPath: "key" });
      db.createObjectStore("queueKv", { keyPath: "key" });
      db.createObjectStore("queueEntries", { keyPath: "id" });
      db.createObjectStore("queuePatience", { keyPath: "key" });
      db.createObjectStore("meta");
    },
  });
  return dbPromise;
}

const patienceKey = (userEmail: string, date: string) => `${userEmail}:${date}`;

export const localDb = {
  // ---- kv ----
  async getKv(key: string): Promise<KvRecord | undefined> {
    return (await open()).get("kv", key);
  },
  async putKv(row: KvRecord) {
    await (await open()).put("kv", row);
  },

  // ---- entries ----
  async getEntry(id: string): Promise<EntryRecord | undefined> {
    return (await open()).get("entries", id);
  },
  async listEntries(): Promise<EntryRecord[]> {
    return (await open()).getAll("entries");
  },
  /** Eintraege, die den Zeitraum [from, to) beruehren. */
  async listEntriesInRange(from: number, to: number): Promise<EntryRecord[]> {
    const rows = await (await open()).getAllFromIndex("entries", "endAt", IDBKeyRange.lowerBound(from));
    return rows.filter((row) => row.startAt < to);
  },
  async putEntry(row: EntryRecord) {
    await (await open()).put("entries", row);
  },
  async deleteEntry(id: string) {
    await (await open()).delete("entries", id);
  },

  // ---- patience ----
  async getPatience(userEmail: string, date: string): Promise<PatienceRecord | undefined> {
    return (await open()).get("patience", patienceKey(userEmail, date));
  },
  async listPatience(): Promise<PatienceRecord[]> {
    return (await open()).getAll("patience");
  },
  async putPatience(row: PatienceRecord) {
    await (await open()).put("patience", { ...row, key: patienceKey(row.userEmail, row.date) });
  },

  // ---- Queue (noch nicht gesendete Aenderungen; pro Schluessel gilt die letzte) ----
  async enqueueKv(row: KvRecord) {
    await (await open()).put("queueKv", row);
  },
  async enqueueEntry(row: EntryRecord) {
    await (await open()).put("queueEntries", row);
  },
  async enqueuePatience(row: PendingPatience) {
    await (await open()).put("queuePatience", { ...row, key: patienceKey(row.userEmail, row.date) });
  },
  async getQueue(): Promise<PendingQueue> {
    const db = await open();
    const [kv, entries, patience] = await Promise.all([db.getAll("queueKv"), db.getAll("queueEntries"), db.getAll("queuePatience")]);
    return { kv, entries, dailyPatience: patience.map(({ key: _key, ...rest }) => rest) };
  },
  async getPendingCount(): Promise<number> {
    const db = await open();
    const counts = await Promise.all([db.count("queueKv"), db.count("queueEntries"), db.count("queuePatience")]);
    return counts.reduce((a, b) => a + b, 0);
  },
  /** Entfernt gesendete Aenderungen - ausser sie wurden waehrend des Sendens erneut geaendert. */
  async ackQueue(sent: PendingQueue) {
    const db = await open();
    const tx = db.transaction(["queueKv", "queueEntries", "queuePatience"], "readwrite");
    for (const row of sent.kv) {
      if ((await tx.objectStore("queueKv").get(row.key))?.updatedAt === row.updatedAt) await tx.objectStore("queueKv").delete(row.key);
    }
    for (const row of sent.entries) {
      if ((await tx.objectStore("queueEntries").get(row.id))?.updatedAt === row.updatedAt) await tx.objectStore("queueEntries").delete(row.id);
    }
    for (const row of sent.dailyPatience) {
      const key = patienceKey(row.userEmail, row.date);
      if ((await tx.objectStore("queuePatience").get(key))?.updatedAt === row.updatedAt) await tx.objectStore("queuePatience").delete(key);
    }
    await tx.done;
  },

  // ---- Sync-Zustand ----
  async getMeta(): Promise<SyncMeta> {
    const db = await open();
    return {
      token: ((await db.get("meta", "token")) as number | undefined) ?? null,
      loadedFrom: ((await db.get("meta", "loadedFrom")) as number | undefined) ?? null,
    };
  },
  async resetSyncState() {
    const db = await open();
    await db.delete("meta", "token");
  },

  /**
   * Speichert nachgeladene Eintraege (ohne noch nicht gesendete lokale Aenderungen zu ueberschreiben)
   * und setzt optional `loadedFrom` nach vorne.
   */
  async putLoadedEntries(rows: WireEntry[], loadedFrom?: number) {
    const db = await open();
    const tx = db.transaction(["entries", "queueEntries", "meta"], "readwrite");
    const queued = new Set(await tx.objectStore("queueEntries").getAllKeys());
    for (const row of rows) {
      if (queued.has(row.id) || row.deleted) continue;
      await tx.objectStore("entries").put({
        id: row.id,
        type: row.type,
        data: row.data,
        startAt: row.startAt,
        endAt: row.endAt,
        updatedAt: row.updatedAt,
        deleted: false,
      });
    }
    if (loadedFrom !== undefined) {
      const current = (await tx.objectStore("meta").get("loadedFrom")) as number | undefined;
      if (current === undefined || loadedFrom < current) await tx.objectStore("meta").put(loadedFrom, "loadedFrom");
    }
    await tx.done;
  },

  /**
   * Uebernimmt eine Pull-Antwort in einer Transaktion. Zeilen mit noch nicht gesendeten lokalen
   * Aenderungen werden nicht ueberschrieben. Bei einer Fenster-Antwort (`full`) werden alle
   * uebrigen lokalen Zeilen ersetzt.
   */
  async applyPull(response: SyncPullResponse) {
    const db = await open();
    const tx = db.transaction(["kv", "entries", "patience", "queueKv", "queueEntries", "queuePatience", "meta"], "readwrite");
    const [queuedKv, queuedEntries, queuedPatience] = await Promise.all([
      tx.objectStore("queueKv").getAllKeys(),
      tx.objectStore("queueEntries").getAllKeys(),
      tx.objectStore("queuePatience").getAllKeys(),
    ]);
    const keepKv = new Set(queuedKv);
    const keepEntries = new Set(queuedEntries);
    const keepPatience = new Set(queuedPatience);

    if (response.full) {
      for (const key of await tx.objectStore("kv").getAllKeys()) if (!keepKv.has(key)) await tx.objectStore("kv").delete(key);
      for (const key of await tx.objectStore("entries").getAllKeys()) if (!keepEntries.has(key)) await tx.objectStore("entries").delete(key);
      for (const key of await tx.objectStore("patience").getAllKeys()) if (!keepPatience.has(key)) await tx.objectStore("patience").delete(key);
    }

    for (const row of response.kv) {
      if (!keepKv.has(row.key)) await tx.objectStore("kv").put({ key: row.key, value: row.value, updatedAt: row.updatedAt });
    }
    for (const row of response.entries) {
      if (keepEntries.has(row.id)) continue;
      if (row.deleted) await tx.objectStore("entries").delete(row.id);
      else {
        await tx.objectStore("entries").put({
          id: row.id,
          type: row.type,
          data: row.data,
          startAt: row.startAt,
          endAt: row.endAt,
          updatedAt: row.updatedAt,
          deleted: false,
        });
      }
    }
    for (const row of response.dailyPatience) {
      const key = patienceKey(row.userEmail, row.date);
      if (!keepPatience.has(key)) {
        await tx.objectStore("patience").put({
          key,
          userEmail: row.userEmail,
          userName: row.userName,
          date: row.date,
          geduld: row.geduld,
          updatedAt: row.updatedAt,
        });
      }
    }

    await tx.objectStore("meta").put(response.token, "token");
    if (response.full && response.windowStart !== null) await tx.objectStore("meta").put(response.windowStart, "loadedFrom");
    await tx.done;
  },
};

/** Nur fuer Tests: schliesst die Verbindung und loescht die gesamte lokale Datenbank. */
export async function resetLocalDb() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
  await deleteDB(DB_NAME);
}
