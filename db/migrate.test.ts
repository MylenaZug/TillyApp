// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "./migrate";

let dir: string;
let file: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "tilly-migrate-"));
  file = path.join(dir, "test.db");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const columns = (db: Database.Database, table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
const backups = () => fs.readdirSync(dir).filter((f) => f.endsWith(".bak"));

describe("runMigrations", () => {
  it("legt auf einer leeren DB alle Tabellen an, ohne Backup", () => {
    const db = new Database(file);
    runMigrations(db, path.join(process.cwd(), "drizzle"));
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
      (t) => t.name
    );
    expect(tables).toEqual(expect.arrayContaining(["entries", "kv_store", "daily_patience", "photos"]));
    expect(backups()).toHaveLength(0);
    db.close();
  });

  it("migriert eine Produktiv-DB (Stand 606ec27) ohne Datenverlust und ist idempotent", () => {
    const db = new Database(file);
    const folder = path.join(process.cwd(), "drizzle");
    // Baseline wie auf Produktion: 0000 angewendet, photos vom alten db/client.ts angelegt.
    const baseline = fs.readFileSync(path.join(folder, "0000_sad_xavin.sql"), "utf8");
    db.exec(baseline.replace(/--> statement-breakpoint/g, ""));
    db.exec(`CREATE TABLE photos (id TEXT PRIMARY KEY, filename TEXT NOT NULL, note TEXT,
      uploaded_by TEXT NOT NULL, created_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)`);
    db.exec(`CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC)`);
    db.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('x', 1789814697992)").run();
    db.prepare("INSERT INTO entries (id, type, data, updated_at, deleted) VALUES ('a', 'alone', '{}', 1, 0)").run();

    runMigrations(db, folder);
    expect(columns(db, "entries")).toEqual(expect.arrayContaining(["start_datetime", "end_datetime"]));
    expect(db.prepare("SELECT COUNT(*) AS n FROM entries").get()).toEqual({ n: 1 });
    expect(backups()).toHaveLength(1);

    const backup = new Database(path.join(dir, backups()[0]), { readonly: true });
    expect(backup.prepare("SELECT COUNT(*) AS n FROM entries").get()).toEqual({ n: 1 });
    backup.close();

    runMigrations(db, folder);
    expect(backups()).toHaveLength(1);
    db.close();
  });
});
