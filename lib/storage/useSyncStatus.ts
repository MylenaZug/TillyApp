"use client";

import { useCallback, useEffect, useState } from "react";
import { getDataVersion, getLastSyncAt, getPendingCount, getRejectedEntries, isClientOutdated, onStorageChange, runSync, setupAutoSync } from "@/lib/storage";

export type SyncStatus = "offline" | "pending" | "synced";

export type SyncInfo = {
  status: SyncStatus;
  pending: number;
  lastSyncAt: number | null;
  syncing: boolean;
  // Steigt, wenn ein Pull lokale Daten geaendert hat.
  dataVersion: number;
  // Vom Server abgelehnte Eintraege: id -> Fehlertext.
  rejected: Record<string, string>;
  // Der Server lehnt diese App-Version ab (426): Neu laden erforderlich.
  outdated: boolean;
  syncNow: () => Promise<void>;
};

export function useSyncStatus(): SyncInfo {
  const [pending, setPending] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(getLastSyncAt());
  const [syncing, setSyncing] = useState(false);
  const [dataVersion, setDataVersion] = useState(getDataVersion());
  const [rejected, setRejected] = useState<Record<string, string>>({});
  const [online, setOnline] = useState(true);
  const [outdated, setOutdated] = useState(isClientOutdated());

  useEffect(() => {
    const refreshPending = () => {
      void getPendingCount().then(setPending);
      void getRejectedEntries().then((next) => setRejected((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next)));
      setLastSyncAt(getLastSyncAt());
      setDataVersion(getDataVersion());
      setOutdated(isClientOutdated());
    };
    refreshPending();
    const unsubscribe = onStorageChange(refreshPending);

    const handleOnline = () => {
      setOnline(true);
      void runSync();
    };
    const handleOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const stopAutoSync = setupAutoSync();

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopAutoSync();
    };
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      await runSync();
    } finally {
      setSyncing(false);
    }
  }, []);

  const status: SyncStatus = !online ? "offline" : pending > 0 ? "pending" : "synced";
  return { status, pending, lastSyncAt, syncing, dataVersion, rejected, outdated, syncNow };
}
