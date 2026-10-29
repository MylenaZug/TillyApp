import { z } from "zod";

// Wird bei jeder inkompatiblen Aenderung der Sync-API erhoeht. Der Client sendet sie als Header,
// der Server lehnt abweichende Versionen mit 426 ab (Client muss dann neu geladen werden).
export const SYNC_PROTOCOL_VERSION = 3;
export const SYNC_PROTOCOL_HEADER = "x-tilly-protocol";

// Beim ersten Sync werden nur Eintraege der letzten Tage geladen, aeltere bei Bedarf nachgeladen.
export const SYNC_WINDOW_DAYS = 30;
export const MAX_ENTRIES_PER_RANGE_REQUEST = 5000;

export type WireKv = { key: string; value: string; updatedAt: number; serverSeq: number };
export type WireEntry = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  startAt: number;
  endAt: number;
  updatedAt: number;
  serverSeq: number;
  deleted: boolean;
};
export type WirePatience = { userEmail: string; userName: string; date: string; geduld: number; updatedAt: number; serverSeq: number };

export type SyncPullResponse = {
  protocol: number;
  // Nummer der letzten Aenderung auf dem Server; beim naechsten Pull als ?token= mitschicken.
  token: number;
  // true: Fenster-Antwort ohne Token, der Client ersetzt seinen Bestand; false: Delta seit dem Token.
  full: boolean;
  windowStart: number | null;
  // Start des aeltesten Eintrags auf dem Server (nur bei full); damit weiss der Client, wann nichts Aelteres mehr kommt.
  earliestAt: number | null;
  kv: WireKv[];
  entries: WireEntry[];
  dailyPatience: WirePatience[];
};

export type RejectedItem = { kind: "kv" | "entry" | "dailyPatience"; id: string; error: string };
export type SyncPushResponse = { protocol: number; token: number; rejected: RejectedItem[] };

// updatedAt und serverSeq vergibt der Server; vom Client gesendete Werte werden ignoriert.
export const pushKvSchema = z.object({ key: z.string().min(1).max(200), value: z.string() });
export const pushEntrySchema = z.object({
  id: z.string().min(1).max(100),
  type: z.string(),
  startAt: z.unknown(),
  endAt: z.unknown(),
  data: z.unknown(),
  deleted: z.boolean().optional(),
});
export const pushPatienceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  geduld: z.number().int().min(0),
});
