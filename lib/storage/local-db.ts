import { get, set } from "idb-keyval";
import type { EntryRecord, KvMutation, PatienceRecord, PendingQueue } from "./types";

// Alles liegt in IndexedDB (idb-keyval), damit die App auch ohne Verbindung
// vollstaendig lesbar/beschreibbar bleibt. Sync gleicht das nur im Hintergrund ab.
const KV_KEY = "tilly:kv";
const ENTRIES_KEY = "tilly:entries";
const PATIENCE_KEY = "tilly:patience";
const QUEUE_KEY = "tilly:queue";
const META_KEY = "tilly:meta";

type KvMap = Record<string, KvMutation>;
type EntriesMap = Record<string, EntryRecord>;
type PatienceMap = Record<string, PatienceRecord>; // Schluessel: `${userEmail}:${date}`
type Meta = { lastSyncedAt: number };

function emptyQueue(): PendingQueue {
  return { kv: [], entries: [], dailyPatience: [] };
}

async function readMap<T>(key: string): Promise<Record<string, T>> {
  return (await get(key)) || {};
}

export const localDb = {
  async getAllKv(): Promise<KvMap> {
    return readMap<KvMutation>(KV_KEY);
  },
  async putKv(row: KvMutation) {
    const map = await readMap<KvMutation>(KV_KEY);
    map[row.key] = row;
    await set(KV_KEY, map);
  },

  async getAllEntries(): Promise<EntriesMap> {
    return readMap<EntryRecord>(ENTRIES_KEY);
  },
  async putEntry(row: EntryRecord) {
    const map = await readMap<EntryRecord>(ENTRIES_KEY);
    map[row.id] = row;
    await set(ENTRIES_KEY, map);
  },

  async getAllPatience(): Promise<PatienceMap> {
    return readMap<PatienceRecord>(PATIENCE_KEY);
  },
  async putPatience(row: PatienceRecord) {
    const map = await readMap<PatienceRecord>(PATIENCE_KEY);
    map[`${row.userEmail}:${row.date}`] = row;
    await set(PATIENCE_KEY, map);
  },

  async getQueue(): Promise<PendingQueue> {
    // Immer ein frisches Objekt zurueckgeben - sonst wuerde ein geteiltes Literal
    // ueber mehrere Aufrufe hinweg in-place mutiert (z.B. durch enqueue()).
    return (await get(QUEUE_KEY)) || emptyQueue();
  },
  async setQueue(queue: PendingQueue) {
    await set(QUEUE_KEY, queue);
  },

  async getMeta(): Promise<Meta> {
    return (await get(META_KEY)) || { lastSyncedAt: 0 };
  },
  async setMeta(meta: Meta) {
    await set(META_KEY, meta);
  },
};
