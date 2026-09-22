"use client";

import { clear, createStore, del, entries, get, set } from "idb-keyval";
import type { EntryRecord, KvMutation, PatienceRecord, PendingQueue } from "./types";

type Meta = { lastSyncedAt: number };

const DB_NAME = "tilly-tracker";
const KV_STORE = createStore(DB_NAME, "kv");
const ENTRIES_STORE = createStore(DB_NAME, "entries");
const PATIENCE_STORE = createStore(DB_NAME, "patience");
const QUEUE_KV_STORE = createStore(DB_NAME, "queue-kv");
const QUEUE_ENTRIES_STORE = createStore(DB_NAME, "queue-entries");
const QUEUE_PATIENCE_STORE = createStore(DB_NAME, "queue-patience");
const META_STORE = createStore(DB_NAME, "meta");
const META_KEY = "meta";

type KvMap = Record<string, KvMutation>;
type EntriesMap = Record<string, EntryRecord>;
type PatienceMap = Record<string, PatienceRecord>;

function emptyQueue(): PendingQueue {
  return { kv: [], entries: [], dailyPatience: [] };
}

function toRecord<T>(rows: [IDBValidKey, T][]): Record<string, T> {
  return Object.fromEntries(rows.map(([key, value]) => [String(key), value]));
}

function patienceKey(userEmail: string, date: string) {
  return `${userEmail}:${date}`;
}

function matchesSnapshot<T>(current: T | undefined, snapshot: T) {
  return JSON.stringify(current) === JSON.stringify(snapshot);
}

async function readQueue(): Promise<PendingQueue> {
  const [kv, entryRows, dailyPatience] = await Promise.all([
    entries<KvMutation>(QUEUE_KV_STORE),
    entries<EntryRecord>(QUEUE_ENTRIES_STORE),
    entries<PatienceRecord>(QUEUE_PATIENCE_STORE),
  ]);

  return {
    kv: kv.map(([, row]) => row),
    entries: entryRows.map(([, row]) => row),
    dailyPatience: dailyPatience.map(([, row]) => row),
  };
}

async function clearStores() {
  await Promise.all([
    clear(KV_STORE),
    clear(ENTRIES_STORE),
    clear(PATIENCE_STORE),
    clear(QUEUE_KV_STORE),
    clear(QUEUE_ENTRIES_STORE),
    clear(QUEUE_PATIENCE_STORE),
    clear(META_STORE),
  ]);
}

export const localDb = {
  async clearAll() {
    await clearStores();
  },

  async getAllKv(): Promise<KvMap> {
    return toRecord(await entries<KvMutation>(KV_STORE));
  },
  async putKv(row: KvMutation) {
    await set(row.key, row, KV_STORE);
  },

  async getAllEntries(): Promise<EntriesMap> {
    return toRecord(await entries<EntryRecord>(ENTRIES_STORE));
  },
  async getEntry(id: string): Promise<EntryRecord | undefined> {
    return (await get<EntryRecord>(id, ENTRIES_STORE)) ?? undefined;
  },
  async putEntry(row: EntryRecord) {
    await set(row.id, row, ENTRIES_STORE);
  },

  async getAllPatience(): Promise<PatienceMap> {
    return toRecord(await entries<PatienceRecord>(PATIENCE_STORE));
  },
  async putPatience(row: PatienceRecord) {
    await set(patienceKey(row.userEmail, row.date), row, PATIENCE_STORE);
  },
  async listPatience(date: string): Promise<PatienceRecord[]> {
    const rows = await entries<PatienceRecord>(PATIENCE_STORE);
    return rows.map(([, row]) => row).filter((row) => row.date === date);
  },

  async enqueueKv(row: KvMutation) {
    await set(row.key, row, QUEUE_KV_STORE);
  },
  async enqueueEntry(row: EntryRecord) {
    await set(row.id, row, QUEUE_ENTRIES_STORE);
  },
  async enqueuePatience(row: PatienceRecord) {
    await set(patienceKey(row.userEmail, row.date), row, QUEUE_PATIENCE_STORE);
  },
  async getQueue(): Promise<PendingQueue> {
    return readQueue();
  },
  async getQueueForUser(userEmail: string | null): Promise<PendingQueue> {
    const queue = await readQueue();
    return {
      kv: queue.kv,
      entries: queue.entries,
      dailyPatience: userEmail ? queue.dailyPatience.filter((row) => row.userEmail === userEmail) : [],
    };
  },
  async setQueue(queue: PendingQueue) {
    await Promise.all([clear(QUEUE_KV_STORE), clear(QUEUE_ENTRIES_STORE), clear(QUEUE_PATIENCE_STORE)]);
    await Promise.all([
      ...queue.kv.map((row) => set(row.key, row, QUEUE_KV_STORE)),
      ...queue.entries.map((row) => set(row.id, row, QUEUE_ENTRIES_STORE)),
      ...queue.dailyPatience.map((row) => set(patienceKey(row.userEmail, row.date), row, QUEUE_PATIENCE_STORE)),
    ]);
  },
  async acknowledgeQueue(queue: PendingQueue) {
    await Promise.all([
      ...queue.kv.map(async (row) => {
        const current = await get<KvMutation>(row.key, QUEUE_KV_STORE);
        if (matchesSnapshot(current ?? undefined, row)) await del(row.key, QUEUE_KV_STORE);
      }),
      ...queue.entries.map(async (row) => {
        const current = await get<EntryRecord>(row.id, QUEUE_ENTRIES_STORE);
        if (matchesSnapshot(current ?? undefined, row)) await del(row.id, QUEUE_ENTRIES_STORE);
      }),
      ...queue.dailyPatience.map(async (row) => {
        const key = patienceKey(row.userEmail, row.date);
        const current = await get<PatienceRecord>(key, QUEUE_PATIENCE_STORE);
        if (matchesSnapshot(current ?? undefined, row)) await del(key, QUEUE_PATIENCE_STORE);
      }),
    ]);
  },

  async getMeta(): Promise<Meta> {
    return (await get<Meta>(META_KEY, META_STORE)) || { lastSyncedAt: 0 };
  },
  async setMeta(meta: Meta) {
    await set(META_KEY, meta, META_STORE);
  },
};
