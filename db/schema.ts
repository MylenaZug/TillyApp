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
  updatedAt: integer("updated_at").notNull(),
});

// Ein Datensatz pro Aktivitaet (food/stool/training/stress/symptom/weight/vet/kosten/tagescheck).
// "data" enthaelt die typspezifischen Felder als JSON; granular statt ein grosser Blob,
// damit Offline-Aenderungen pro Eintrag gemerged werden koennen statt die ganze Liste zu ueberschreiben.
export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  data: text("data").notNull(),
  startDatetime: text("start_datetime"),
  endDatetime: text("end_datetime"),
  updatedAt: integer("updated_at").notNull(),
  deleted: integer("deleted").notNull().default(0),
});

// "Meine Geduld" aus dem Tagescheck ist pro Person, nicht geteilt - anders als
// Folgsamkeit und Sharklevel/Energie, die weiterhin gemeinsam in `entries` liegen.
export const dailyPatience = sqliteTable(
  "daily_patience",
  {
    userEmail: text("user_email").notNull(),
    date: text("date").notNull(),
    geduld: integer("geduld").notNull(),
    updatedAt: integer("updated_at").notNull(),
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
