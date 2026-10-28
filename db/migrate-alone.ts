import type Database from "better-sqlite3";
import { normalizeAloneData } from "../lib/tilly/alone";

type LegacyEntry = { id: string; data: string; start_datetime: string | null; end_datetime: string | null };

export function migrateAloneEntries(sqlite: Database.Database) {
  const table = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entries'").get();
  if (!table) throw new Error("The entries table does not exist; run the database schema migration first.");

  const migrate = sqlite.transaction(() => {
    const columns = new Set((sqlite.pragma("table_info(entries)") as { name: string }[]).map((column) => column.name));
    if (!columns.has("start_datetime")) sqlite.exec("ALTER TABLE entries ADD COLUMN start_datetime TEXT");
    if (!columns.has("end_datetime")) sqlite.exec("ALTER TABLE entries ADD COLUMN end_datetime TEXT");

    const rows = sqlite
      .prepare("SELECT id, data, start_datetime, end_datetime FROM entries WHERE type = 'alone'")
      .all() as LegacyEntry[];
    const update = sqlite.prepare(
      "UPDATE entries SET data = ?, start_datetime = ?, end_datetime = ? WHERE id = ?",
    );

    for (const row of rows) {
      try {
        const oldData = JSON.parse(row.data) as Record<string, unknown>;
        if (!("startedAt" in oldData || "endedAt" in oldData || "startDatetime" in oldData || "endDatetime" in oldData || "ms" in oldData)) {
          continue;
        }
        const normalized = normalizeAloneData(oldData, row.start_datetime, row.end_datetime);
        update.run(
          JSON.stringify(normalized.data),
          normalized.startDatetime,
          normalized.endDatetime,
          row.id,
        );
      } catch {
        // Leave malformed historical rows untouched so the migration remains non-destructive.
      }
    }
  });

  migrate();
}
