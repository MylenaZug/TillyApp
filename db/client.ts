import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dbPath = process.env.DB_PATH || "./tilly.db";

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Die Foto-Tabelle kam nach dem ersten Produktiv-Release dazu. Idempotent anlegen, damit
// bestehende Datenbanken ohne manuelle Migration mitziehen (Schema: siehe db/schema.ts).
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    note TEXT,
    uploaded_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS photos_created_at_idx ON photos (created_at);
`);

export const db = drizzle(sqlite, { schema });
