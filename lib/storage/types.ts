export type KvRecord = { key: string; value: string; updatedAt: number };

// Zeitpunkte sind Epoch-ms; geloeschte Eintraege liegen lokal nicht vor, nur als Tombstone in der Queue.
export type EntryRecord = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  startAt: number;
  endAt: number;
  updatedAt: number;
  deleted: boolean;
  // Nur in der Queue: Grund, warum der Server den Eintrag abgelehnt hat. Er wird dann nicht erneut gesendet.
  rejection?: string;
};

export type PatienceRecord = {
  userEmail: string;
  userName?: string;
  date: string;
  geduld: number;
  updatedAt: number;
};

export type PendingPatience = { userEmail: string; date: string; geduld: number; updatedAt: number };

export type PendingQueue = {
  kv: KvRecord[];
  entries: EntryRecord[];
  dailyPatience: PendingPatience[];
};

export type SyncMeta = {
  // Sync-Token des Servers (server_seq); null = noch nie synchronisiert.
  token: number | null;
  // Fruehester Zeitpunkt, ab dem Eintraege lokal vollstaendig vorliegen (aelteres wird nachgeladen).
  loadedFrom: number | null;
  // Aeltester Eintrag auf dem Server; null = unbekannt oder keine Eintraege.
  earliestAt: number | null;
};
