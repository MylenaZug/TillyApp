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

async function pushQueue() {
  const queue = await localDb.getQueue();
  const hasChanges = queue.kv.length || queue.entries.length || queue.dailyPatience.length;
  if (!hasChanges) return;

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(queue),
  });
  if (!res.ok) throw new Error(`sync push failed: ${res.status}`);

  // Erst nach erfolgreichem Push leeren, sonst gehen Aenderungen bei einem Fehler verloren.
  await localDb.setQueue({ kv: [], entries: [], dailyPatience: [] });
}

async function pullChanges() {
  const meta = await localDb.getMeta();
  const res = await fetch(`/api/sync?since=${meta.lastSyncedAt}`, { credentials: "include" });
  if (!res.ok) throw new Error(`sync pull failed: ${res.status}`);
  const data: SyncResponse = await res.json();

  for (const row of data.kv) await localDb.putKv(row);
  for (const row of data.entries) await localDb.putEntry(row);
  for (const row of data.dailyPatience) await localDb.putPatience(row);

  await localDb.setMeta({ lastSyncedAt: data.serverTime });
}

let syncing = false;

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
  const trigger = () => void runSync();
  window.addEventListener("online", trigger);
  window.addEventListener("focus", trigger);
  const interval = setInterval(trigger, 2 * 60 * 1000);
  trigger();
  return () => {
    window.removeEventListener("online", trigger);
    window.removeEventListener("focus", trigger);
    clearInterval(interval);
  };
}
