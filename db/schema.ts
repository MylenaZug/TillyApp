import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

/**
 * Einzige Modell-Definition fuer die App - Typen hieraus werden sowohl in den
 * API-Routes als auch in der UI verwendet (kein separates Frontend/Backend-Schema).
 */

// Kleinere, selten geaenderte Einstellungen (Trainingsarten, Futterarten, Uebungen,
// allgemeine Notiz, Symptomarten, Futterplan). Last-write-wins reicht hier aus.
export const kvStore = sqliteTable("kv_store", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  // updated_at und server_seq vergibt ausschliesslich der Server beim Schreiben.
  updatedAt: integer("updated_at").notNull(),
  serverSeq: integer("server_seq").notNull().default(0),
});

// Ein Zaehler (Zeile id = 1) fuer alle synchronisierten Tabellen: jede Aenderung bekommt die
// naechste server_seq. Der Client merkt sich die letzte gesehene Nummer als Sync-Token.
export const syncState = sqliteTable("sync_state", {
  id: integer("id").primaryKey(),
  seq: integer("seq").notNull().default(0),
});

// Ein Datensatz pro Aktivitaet (food/stool/training/stress/symptom/weight/vet/kosten/tagescheck).
// "data" enthaelt die typspezifischen Felder als JSON; granular statt ein grosser Blob,
// damit Offline-Aenderungen pro Eintrag gemerged werden koennen statt die ganze Liste zu ueberschreiben.
// Alle Eintragstypen haben einen Zeitraum in Epoch-ms (start_at/end_at; bei Punkt-Ereignissen
// end_at = start_at) - so laesst sich per SQL effizient nach Zeitfenstern filtern.
// Der Default 0 existiert nur, damit die Spalten per ALTER TABLE nachgeruestet werden koennen;
// die Datenmigration (db/migrate-data.ts) ersetzt ihn, die API validiert (lib/tilly/schemas.ts).
export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    data: text("data").notNull(),
    startAt: integer("start_at").notNull().default(0),
    endAt: integer("end_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
    serverSeq: integer("server_seq").notNull().default(0),
    deleted: integer("deleted").notNull().default(0),
  },
  (table) => ({
    startAtIdx: index("entries_start_at_idx").on(table.startAt),
    endAtIdx: index("entries_end_at_idx").on(table.endAt),
    serverSeqIdx: index("entries_server_seq_idx").on(table.serverSeq),
  })
);

// "Meine Geduld" aus dem Tagescheck ist pro Person, nicht geteilt - anders als
// Folgsamkeit und Sharklevel/Energie, die weiterhin gemeinsam in `entries` liegen.
export const dailyPatience = sqliteTable(
  "daily_patience",
  {
    userEmail: text("user_email").notNull(),
    date: text("date").notNull(),
    geduld: integer("geduld").notNull(),
    updatedAt: integer("updated_at").notNull(),
    serverSeq: integer("server_seq").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userEmail, table.date] }),
  })
);

// Die Bilddatei selbst liegt nicht in der DB, sondern unter UPLOADS_DIR auf der Platte
// (siehe app/api/photos) - hier nur Metadaten, damit die Galerie schnell laden kann.
export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    filename: text("filename").notNull(),
    note: text("note"),
    uploadedBy: text("uploaded_by").notNull(),
    createdAt: integer("created_at").notNull(),
    deleted: integer("deleted").notNull().default(0),
  },
  (table) => ({
    createdAtIdx: index("photos_created_at_idx").on(table.createdAt),
  })
);

export type KvRow = typeof kvStore.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type DailyPatienceRow = typeof dailyPatience.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
