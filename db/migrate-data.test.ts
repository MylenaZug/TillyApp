// @vitest-environment node
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { DataMigrationError, migrateData } from "./migrate-data";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  migrate(drizzle(db), { migrationsFolder: path.join(process.cwd(), "drizzle") });
});

const insert = (id: string, type: string, data: unknown, updatedAt = 1) =>
  db
    .prepare("INSERT INTO entries (id, type, data, updated_at, deleted) VALUES (?, ?, ?, ?, 0)")
    .run(id, type, typeof data === "string" ? data : JSON.stringify(data), updatedAt);
const row = (id: string) => db.prepare("SELECT * FROM entries WHERE id = ?").get(id) as Record<string, unknown>;

describe("migrateData", () => {
  it("leitet Zeitraum aus data.date ab und bereinigt data", () => {
    insert("t", "tagescheck", { id: "t", type: "tagescheck", updatedAt: 5, date: "2026-10-16T14:07:00.000Z", folgsamkeit: 3, energie: 4 });
    migrateData(db);
    const r = row("t");
    expect(r.start_at).toBe(Date.parse("2026-10-16T14:07:00.000Z"));
    expect(r.end_at).toBe(r.start_at);
    expect(JSON.parse(r.data as string)).toEqual({ folgsamkeit: 3, energie: 4 });
  });

  it.each([
    ["Spalten-Altformat", { startDatetime: "2026-03-05T09:00:20.000Z", endDatetime: "2026-03-05T10:30:20.000Z", note: "x" }],
    ["Altformat mit startedAt/endedAt/ms/date", { date: "2026-03-05T10:30:20.000Z", startedAt: "2026-03-05T09:00:20.000Z", endedAt: "2026-03-05T10:30:20.000Z", ms: 5_400_000, note: "x" }],
    ["nur startedAt und ms", { startedAt: "2026-03-05T09:00:20.000Z", ms: 5_400_000, note: "x" }],
  ])("alone aus %s: volle Minuten, nur note bleibt in data", (_name, data) => {
    insert("a", "alone", data);
    migrateData(db);
    const r = row("a");
    expect(r.start_at).toBe(Date.UTC(2026, 2, 5, 9, 0));
    expect(r.end_at).toBe(Date.UTC(2026, 2, 5, 10, 30));
    expect(JSON.parse(r.data as string)).toEqual({ note: "x" });
  });

  it("wandelt consistency als String in ein Array mit aktuellen Bezeichnungen um", () => {
    insert("s", "stool", { date: "2026-09-19T10:55:00.000Z", note: "", consistency: "Fest", color: "Braun", flags: [], stoolAmount: "Mittel" });
    migrateData(db);
    expect(JSON.parse(row("s").data as string).consistency).toEqual(["Feste Wurst"]);
  });

  it("vergibt server_seq nach updated_at über alle Tabellen und ist idempotent", () => {
    insert("b", "stress", { date: "2026-03-05T10:00:00.000Z", level: 1 }, 20);
    insert("a", "stress", { date: "2026-03-05T10:00:00.000Z", level: 1 }, 10);
    db.prepare("INSERT INTO kv_store (key, value, updated_at) VALUES ('k', 'v', 15)").run();
    db.prepare("INSERT INTO daily_patience (user_email, date, geduld, updated_at) VALUES ('u@x', '2026-03-05', 2, 5)").run();
    migrateData(db);
    expect([row("a").server_seq, row("b").server_seq]).toEqual([2, 4]);
    expect(db.prepare("SELECT server_seq FROM kv_store").get()).toEqual({ server_seq: 3 });
    expect(db.prepare("SELECT server_seq FROM daily_patience").get()).toEqual({ server_seq: 1 });
    expect(db.prepare("SELECT seq FROM sync_state").get()).toEqual({ seq: 4 });

    migrateData(db);
    expect([row("a").server_seq, row("b").server_seq]).toEqual([2, 4]);
    expect(db.prepare("SELECT seq FROM sync_state").get()).toEqual({ seq: 4 });
  });

  it("bricht mit ID-Liste ab und rollt alles zurück, wenn Zeilen nicht umwandelbar sind", () => {
    insert("ok", "stress", { date: "2026-03-05T10:00:00.000Z", level: 1 });
    insert("bad-json", "stress", "{kaputt");
    insert("bad-date", "stress", { level: 1 });
    insert("bad-type", "unbekannt", { date: "2026-03-05T10:00:00.000Z" });
    expect(() => migrateData(db)).toThrow(DataMigrationError);
    try {
      migrateData(db);
    } catch (error) {
      expect((error as DataMigrationError).failures.map((f) => f.id).sort()).toEqual(["bad-date", "bad-json", "bad-type"]);
    }
    expect(row("ok").start_at).toBe(0);
    expect(row("ok").server_seq).toBe(0);
  });
});
