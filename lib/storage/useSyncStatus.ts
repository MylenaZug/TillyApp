"use client";

import { useEffect, useState } from "react";
import { getPendingCount, onStorageChange, runSync, setupAutoSync } from "@/lib/storage";

export type SyncStatus = "offline" | "pending" | "synced";

export function useSyncStatus(): { status: SyncStatus; pending: number } {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const refreshPending = () => void getPendingCount().then(setPending);
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

  const status: SyncStatus = !online ? "offline" : pending > 0 ? "pending" : "synced";
  return { status, pending };
}
