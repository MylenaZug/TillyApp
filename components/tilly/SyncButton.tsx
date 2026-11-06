"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { SyncInfo } from "@/lib/storage/useSyncStatus";

const FRESH_MS = 5 * 60 * 1000;
const GREEN = [46, 139, 87];
const ORANGE = [230, 126, 34];
const OFFLINE_BLUE = "rgb(52, 87, 213)";

// Gruen direkt nach dem Sync, danach stufenlos bis Orange nach 5 Minuten (dann dauerhaft
// Orange); offline ist der Button blau. Ohne bisherigen Sync gilt der Stand als veraltet.
export function syncColor(status: SyncInfo["status"], lastSyncAt: number | null, now: number) {
  if (status === "offline") return OFFLINE_BLUE;
  const age = lastSyncAt === null ? FRESH_MS : Math.min(Math.max(now - lastSyncAt, 0), FRESH_MS);
  const t = age / FRESH_MS;
  const [r, g, b] = GREEN.map((c, i) => Math.round(c + (ORANGE[i] - c) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

function describe(info: Pick<SyncInfo, "status" | "pending" | "lastSyncAt"> & { outdated?: boolean }, now: number) {
  if (info.outdated) return "App veraltet – bitte neu laden";
  if (info.status === "offline") return "Offline";
  const pending = info.pending > 0 ? `, ${info.pending} ausstehend` : "";
  if (info.lastSyncAt === null) return `Noch nicht synchronisiert${pending}`;
  const minutes = Math.floor((now - info.lastSyncAt) / 60000);
  return `Zuletzt synchronisiert: ${minutes < 1 ? "gerade eben" : `vor ${minutes} Min`}${pending}`;
}

export function SyncButton({ status, pending, lastSyncAt, syncing, outdated, syncNow, userEmail }: SyncInfo & { userEmail: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  const label = `Sync – ${describe({ status, pending, lastSyncAt, outdated }, now)}`;
  return (
    <button
      onClick={() => (outdated ? window.location.reload() : void syncNow())}
      aria-label={label}
      title={`${userEmail} · ${label}`}
      style={{ backgroundColor: syncColor(status, lastSyncAt, now) }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-colors duration-700 active:scale-95"
    >
      <RefreshCw size={20} className={`text-white ${syncing ? "animate-spin" : ""}`} />
    </button>
  );
}
