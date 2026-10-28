// @vitest-environment node
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateAloneEntries } from "./migrate-alone";

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = new Database(":memory:");
});

afterEach(() => sqlite.close());

describe("migrateAloneEntries", () => {
  it("moves old timer timestamps from JSON into columns and is safe to rerun", () => {
    sqlite.exec(`
      CREATE TABLE entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
    `);
    sqlite
      .prepare("INSERT INTO entries (id, type, data, updated_at) VALUES (?, ?, ?, ?)")
      .run(
        "alone-1",
        "alone",
        JSON.stringify({
          date: "2026-03-05T10:30:20.000Z",
          startedAt: "2026-03-05T09:00:20.000Z",
          endedAt: "2026-03-05T10:30:20.000Z",
          ms: 5_400_000,
          note: "Notiz bleibt",
        }),
        1,
      );

    migrateAloneEntries(sqlite);
    migrateAloneEntries(sqlite);

    const row = sqlite
      .prepare("SELECT data, start_datetime, end_datetime FROM entries WHERE id = 'alone-1'")
      .get() as { data: string; start_datetime: string; end_datetime: string };
    expect(row.start_datetime).toBe("2026-03-05T09:00:00.000Z");
    expect(row.end_datetime).toBe("2026-03-05T10:30:00.000Z");
    expect(JSON.parse(row.data)).toEqual({ date: row.end_datetime, note: "Notiz bleibt" });
  });

  it("leaves malformed historical data untouched", () => {
    sqlite.exec(`
      CREATE TABLE entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO entries (id, type, data, updated_at) VALUES ('broken', 'alone', '{bad', 1);
    `);

    migrateAloneEntries(sqlite);

    const row = sqlite.prepare("SELECT data FROM entries WHERE id = 'broken'").get() as { data: string };
    expect(row.data).toBe("{bad");
  });
});
