import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

function hasPendingMigrations(sqlite: Database.Database, folder: string): boolean {
  const journal = JSON.parse(fs.readFileSync(path.join(folder, "meta", "_journal.json"), "utf8")) as {
    entries: { when: number }[];
  };
  const hasTable = sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
    .get();
  const last = hasTable
    ? (sqlite.prepare("SELECT MAX(created_at) AS last FROM __drizzle_migrations").get() as { last: number | null })
        .last
    : null;
  return journal.entries.some((e) => last === null || e.when > last);
}

/**
 * Wendet offene Drizzle-Migrationen an (idempotent: schon angewendete werden uebersprungen).
 * Vor offenen Migrationen auf einer nicht leeren DB wird eine Kopie neben der DB abgelegt.
 */
export function runMigrations(sqlite: Database.Database, folder = MIGRATIONS_FOLDER): void {
  if (!hasPendingMigrations(sqlite, folder)) return;

  const dbFile = sqlite.name;
  const hasData = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' LIMIT 1").get();
  if (hasData && dbFile && dbFile !== ":memory:") {
    const backup = `${dbFile}.pre-migrate-${Date.now()}.bak`;
    sqlite.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
  }
  migrate(drizzle(sqlite), { migrationsFolder: folder });
}
