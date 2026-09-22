export type KvMutation = { key: string; value: string; updatedAt: number };

export type EntryRecord = {
  id: string;
  type: string;
  data: string;
  updatedAt: number;
  deleted: 0 | 1;
};

export type PatienceRecord = {
  userEmail: string;
  date: string;
  geduld: number;
  updatedAt: number;
};

export type SyncResponse = {
  serverTime: number;
  kv: KvMutation[];
  entries: EntryRecord[];
  dailyPatience: PatienceRecord[];
};

export type PendingQueue = {
  kv: KvMutation[];
  entries: EntryRecord[];
  dailyPatience: { date: string; geduld: number; updatedAt: number }[];
};
