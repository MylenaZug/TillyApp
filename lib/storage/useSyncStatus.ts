"use client";

import { useEffect, useState } from "react";
import { getLastSyncedAt, getPendingCount, onStorageChange, runSync, setSyncUser, setupAutoSync } from "@/lib/storage";

export type SyncStatus = "offline" | "pending" | "synced";

export function useSyncStatus(userEmail: string): { status: SyncStatus; pending: number; lastSyncedAt: number } {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(0);

  useEffect(() => {
    setSyncUser(userEmail);
    const refreshStatus = () =>
      void Promise.all([getPendingCount(userEmail), getLastSyncedAt()]).then(([nextPending, nextLastSyncedAt]) => {
        setPending(nextPending);
        setLastSyncedAt(nextLastSyncedAt);
      });
    refreshStatus();
    const unsubscribe = onStorageChange(refreshStatus);

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
  }, [userEmail]);

  const status: SyncStatus = !online ? "offline" : pending > 0 ? "pending" : "synced";
  return { status, pending, lastSyncedAt };
}
