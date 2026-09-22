"use client";

import { useEffect, useState } from "react";
import { getLastSyncedAt, getPendingCount, onStorageChange } from "@/lib/storage";

export type SyncStatus = "offline" | "pending" | "synced";

export function useSyncStatus(userEmail: string): { status: SyncStatus; pending: number; lastSyncedAt: number } {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(0);

  useEffect(() => {
    const refreshStatus = () =>
      void Promise.all([getPendingCount(userEmail), getLastSyncedAt()]).then(([nextPending, nextLastSyncedAt]) => {
        setPending(nextPending);
        setLastSyncedAt(nextLastSyncedAt);
      });
    refreshStatus();
    const unsubscribe = onStorageChange(refreshStatus);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userEmail]);

  const status: SyncStatus = !online ? "offline" : pending > 0 ? "pending" : "synced";
  return { status, pending, lastSyncedAt };
}
