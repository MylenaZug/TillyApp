"use client";

import { clear, createStore, del, entries, get, set } from "idb-keyval";
import type { EntryRecord, KvMutation, PatienceRecord, PendingQueue } from "./types";

type Meta = { lastSyncedAt: number };

const KV_STORE = createStore("tilly-tracker-kv", "keyval");
const ENTRIES_STORE = createStore("tilly-tracker-entries", "keyval");
const PATIENCE_STORE = createStore("tilly-tracker-patience", "keyval");
const QUEUE_KV_STORE = createStore("tilly-tracker-queue-kv", "keyval");
const QUEUE_ENTRIES_STORE = createStore("tilly-tracker-queue-entries", "keyval");
const QUEUE_PATIENCE_STORE = createStore("tilly-tracker-queue-patience", "keyval");
const META_STORE = createStore("tilly-tracker-meta", "keyval");
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
    entries(QUEUE_KV_STORE) as Promise<[IDBValidKey, KvMutation][]>,
    entries(QUEUE_ENTRIES_STORE) as Promise<[IDBValidKey, EntryRecord][]>,
    entries(QUEUE_PATIENCE_STORE) as Promise<[IDBValidKey, PatienceRecord][]>,
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
    return toRecord((await entries(KV_STORE)) as [IDBValidKey, KvMutation][]);
  },
  async putKv(row: KvMutation) {
    await set(row.key, row, KV_STORE);
  },

  async getAllEntries(): Promise<EntriesMap> {
    return toRecord((await entries(ENTRIES_STORE)) as [IDBValidKey, EntryRecord][]);
  },
  async getEntry(id: string): Promise<EntryRecord | undefined> {
    return (await get<EntryRecord>(id, ENTRIES_STORE)) ?? undefined;
  },
  async putEntry(row: EntryRecord) {
    await set(row.id, row, ENTRIES_STORE);
  },

  async getAllPatience(): Promise<PatienceMap> {
    return toRecord((await entries(PATIENCE_STORE)) as [IDBValidKey, PatienceRecord][]);
  },
  async putPatience(row: PatienceRecord) {
    await set(patienceKey(row.userEmail, row.date), row, PATIENCE_STORE);
  },
  async listPatience(date: string): Promise<PatienceRecord[]> {
    const rows = (await entries(PATIENCE_STORE)) as [IDBValidKey, PatienceRecord][];
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
