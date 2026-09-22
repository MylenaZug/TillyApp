import { localDb } from "./local-db";
import type { SyncResponse } from "./types";

type Listener = () => void;
const listeners = new Set<Listener>();

export function onStorageChange(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

let activeUserEmail: string | null = null;

export function setSyncUser(userEmail: string | null) {
  activeUserEmail = userEmail;
}

async function pushQueue() {
  const queue = await localDb.getQueueForUser(activeUserEmail);
  const hasChanges = queue.kv.length || queue.entries.length || queue.dailyPatience.length;
  if (!hasChanges) return;

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(queue),
  });
  if (!res.ok) throw new Error(`sync push failed: ${res.status}`);

  await localDb.acknowledgeQueue(queue);
}

async function pullChanges() {
  const meta = await localDb.getMeta();
  const res = await fetch(`/api/sync?since=${meta.lastSyncedAt}`, { credentials: "include" });
  if (!res.ok) throw new Error(`sync pull failed: ${res.status}`);
  const data: SyncResponse = await res.json();

  for (const row of data.kv) await localDb.putKv(row);
  for (const row of data.entries) await localDb.putEntry(row);
  for (const row of data.dailyPatience) await localDb.putPatience(row);

  await localDb.setMeta({
    lastSyncedAt: data.serverTime,
    lastSyncedAtByUser: activeUserEmail
      ? { ...meta.lastSyncedAtByUser, [activeUserEmail]: data.serverTime }
      : meta.lastSyncedAtByUser,
  });
}

let syncing = false;
let autoSyncTeardown: (() => void) | null = null;
let autoSyncSubscribers = 0;

export async function runSync() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (syncing) return;
  syncing = true;
  try {
    await pushQueue();
    await pullChanges();
    notify();
  } catch (err) {
    // Bleibt in der Queue - naechster Trigger (online-Event/Intervall/Fokus) versucht es erneut.
    console.warn("Tilly sync failed, retrying later", err);
  } finally {
    syncing = false;
  }
}

export function setupAutoSync() {
  if (typeof window === "undefined") return () => {};
  autoSyncSubscribers += 1;

  if (!autoSyncTeardown) {
    const trigger = () => void runSync();
    window.addEventListener("online", trigger);
    window.addEventListener("focus", trigger);
    const interval = setInterval(trigger, 2 * 60 * 1000);
    trigger();
    autoSyncTeardown = () => {
      window.removeEventListener("online", trigger);
      window.removeEventListener("focus", trigger);
      clearInterval(interval);
    };
  }

  return () => {
    autoSyncSubscribers = Math.max(0, autoSyncSubscribers - 1);
    if (autoSyncSubscribers === 0 && autoSyncTeardown) {
      autoSyncTeardown();
      autoSyncTeardown = null;
    }
  };
}
