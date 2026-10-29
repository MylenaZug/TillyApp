import type Database from "better-sqlite3";
import { parseEntry } from "../lib/tilly/schemas";

type LegacyRow = { id: string; type: string; data: string; start_at: number; end_at: number };

const MINUTE_MS = 60_000;
const roundToMinute = (ms: number) => Math.round(ms / MINUTE_MS) * MINUTE_MS;
const toMs = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};
const firstMs = (...values: unknown[]) => {
  for (const value of values) {
    const ms = toMs(value);
    if (ms !== null) return ms;
  }
  return null;
};

/** Leitet Start und Ende aus dem Altformat ab (data.date bzw. startedAt/endedAt bei alone). */
export function legacyRange(type: string, data: Record<string, unknown>): { startAt: number | null; endAt: number | null } {
  if (type === "alone") {
    const start = firstMs(data.startDatetime, data.startedAt, data.date);
    const end = firstMs(data.endDatetime, data.endedAt) ?? (start !== null && typeof data.ms === "number" ? start + data.ms : null);
    return {
      startAt: start === null ? null : roundToMinute(start),
      endAt: end === null ? null : roundToMinute(end),
    };
  }
  const start = firstMs(data.date);
  return { startAt: start, endAt: start };
}

export class DataMigrationError extends Error {
  constructor(public readonly failures: { id: string; type: string; error: string }[]) {
    super(
      `Datenmigration abgebrochen, ${failures.length} Eintrag/Einträge nicht umwandelbar: ` +
        failures.map((f) => `${f.id} (${f.type}): ${f.error}`).join(" | ")
    );
  }
}

/**
 * Ueberfuehrt Altdaten in das aktuelle Schema (idempotent, alles in einer Transaktion):
 * 1. entries mit start_at = 0: Zeitraum aus dem Altformat ableiten, data per Zod bereinigen.
 *    Nicht umwandelbare Zeilen brechen die gesamte Migration (Rollback) mit ID-Liste ab.
 * 2. server_seq = 0 in allen Tabellen: Nummern nach altem updated_at vergeben.
 */
export function migrateData(sqlite: Database.Database): void {
  sqlite.transaction(() => {
    const rows = sqlite
      .prepare("SELECT id, type, data, start_at, end_at FROM entries WHERE start_at = 0")
      .all() as LegacyRow[];
    const update = sqlite.prepare("UPDATE entries SET data = ?, start_at = ?, end_at = ? WHERE id = ?");
    const failures: { id: string; type: string; error: string }[] = [];

    for (const row of rows) {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(row.data);
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("data ist kein Objekt");
      } catch (error) {
        failures.push({ id: row.id, type: row.type, error: (error as Error).message });
        continue;
      }
      const { startAt, endAt } = legacyRange(row.type, data);
      const parsed = parseEntry({ type: row.type, startAt, endAt, data });
      if (!parsed.ok) {
        failures.push({ id: row.id, type: row.type, error: parsed.error });
        continue;
      }
      update.run(JSON.stringify(parsed.data), parsed.startAt, parsed.endAt, row.id);
    }
    if (failures.length > 0) throw new DataMigrationError(failures);

    sqlite.prepare("INSERT OR IGNORE INTO sync_state (id, seq) VALUES (1, 0)").run();
    let seq = (sqlite.prepare("SELECT seq FROM sync_state WHERE id = 1").get() as { seq: number }).seq;
    const pending = [
      { table: "entries", key: "id", select: "id" },
      { table: "kv_store", key: "key", select: "key" },
      { table: "daily_patience", key: "user_email || '|' || date", select: "user_email || '|' || date" },
    ].flatMap(({ table, key }) =>
      (
        sqlite
          .prepare(`SELECT ${key} AS k, updated_at FROM ${table} WHERE server_seq = 0`)
          .all() as { k: string; updated_at: number }[]
      ).map((r) => ({ table, k: r.k, updatedAt: r.updated_at }))
    );
    pending.sort((a, b) => a.updatedAt - b.updatedAt || a.k.localeCompare(b.k));
    const setters = {
      entries: sqlite.prepare("UPDATE entries SET server_seq = ? WHERE id = ?"),
      kv_store: sqlite.prepare("UPDATE kv_store SET server_seq = ? WHERE key = ?"),
      daily_patience: sqlite.prepare("UPDATE daily_patience SET server_seq = ? WHERE user_email || '|' || date = ?"),
    };
    for (const item of pending) setters[item.table as keyof typeof setters].run(++seq, item.k);
    sqlite.prepare("UPDATE sync_state SET seq = ? WHERE id = 1").run(seq);
  })();
}
