// @vitest-environment node
//
// Testet die Sync-Route gegen eine echte In-Memory-SQLite-Datenbank (better-sqlite3),
// mit gemocktem Auth-Modul statt einer echten Google-Session.
import { beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { NextRequest } from "next/server";
import * as schema from "@/db/schema";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const sqlite = new Database(":memory:");
sqlite.exec(`
  CREATE TABLE kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE entries (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    start_datetime TEXT,
    end_datetime TEXT,
    updated_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE daily_patience (
    user_email TEXT NOT NULL,
    date TEXT NOT NULL,
    geduld INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_email, date)
  );
`);
const mockDb = drizzle(sqlite, { schema });
vi.mock("@/db/client", () => ({ db: mockDb }));

const { GET, POST } = await import("@/app/api/sync/route");

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  sqlite.exec("DELETE FROM kv_store; DELETE FROM entries; DELETE FROM daily_patience;");
  mockAuth.mockReset();
});

describe("GET /api/sync", () => {
  it("lehnt nicht angemeldete Anfragen ab", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/api/sync"));

    expect(res.status).toBe(401);
  });

  it("liefert nur Zeilen, die nach dem uebergebenen Zeitstempel geaendert wurden", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });
    sqlite.exec("INSERT INTO kv_store (key, value, updated_at) VALUES ('old', 'v', 100), ('new', 'v', 200)");

    const res = await GET(new NextRequest("http://localhost/api/sync?since=150"));
    const body = await res.json();

    expect(body.kv).toHaveLength(1);
    expect(body.kv[0].key).toBe("new");
  });

  it("liefert die Geduld aller Accounts samt Anzeigename", async () => {
    process.env.USER_DISPLAY_NAMES = JSON.stringify({ "a@example.com": "Anna" });
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });
    sqlite.exec(
      "INSERT INTO daily_patience (user_email, date, geduld, updated_at) VALUES ('a@example.com', '2026-09-18', 3, 10), ('ben@example.com', '2026-09-18', 5, 10)",
    );

    const body = await (await GET(new NextRequest("http://localhost/api/sync"))).json();

    const byEmail = Object.fromEntries(body.dailyPatience.map((r: { userEmail: string; userName: string }) => [r.userEmail, r.userName]));
    expect(byEmail).toEqual({ "a@example.com": "Anna", "ben@example.com": "ben" });
    delete process.env.USER_DISPLAY_NAMES;
  });
});

describe("POST /api/sync", () => {
  it("lehnt nicht angemeldete Anfragen ab", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(jsonRequest("http://localhost/api/sync", {}));

    expect(res.status).toBe(401);
  });

  it("lehnt einen Body ab, der kein Objekt ist", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });

    const res = await POST(
      new NextRequest("http://localhost/api/sync", { method: "POST", body: "kein json" })
    );

    expect(res.status).toBe(400);
  });

  it("wendet Last-Write-Wins an und ignoriert ein aelteres Update", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });

    await POST(jsonRequest("http://localhost/api/sync", { kv: [{ key: "note", value: "neu", updatedAt: 200 }] }));
    // Das aeltere Update darf die neuere Zeile nicht ueberschreiben.
    await POST(jsonRequest("http://localhost/api/sync", { kv: [{ key: "note", value: "alt", updatedAt: 50 }] }));

    const row = sqlite.prepare("SELECT value FROM kv_store WHERE key = 'note'").get() as { value: string };
    expect(row.value).toBe("neu");
  });

  it("migriert alte Alleine-Eintraege beim Sync in die eigenen Zeitspalten", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });
    await POST(
      jsonRequest("http://localhost/api/sync", {
        entries: [
          {
            id: "alone-legacy",
            type: "alone",
            data: JSON.stringify({
              date: "2026-03-05T10:30:20.000Z",
              startedAt: "2026-03-05T09:00:20.000Z",
              endedAt: "2026-03-05T10:30:20.000Z",
              ms: 5_400_000,
            }),
            updatedAt: 10,
          },
        ],
      }),
    );

    const row = sqlite
      .prepare("SELECT data, start_datetime, end_datetime FROM entries WHERE id = 'alone-legacy'")
      .get() as { data: string; start_datetime: string; end_datetime: string };
    expect(row.start_datetime).toBe("2026-03-05T09:00:00.000Z");
    expect(row.end_datetime).toBe("2026-03-05T10:30:00.000Z");
    expect(JSON.parse(row.data)).toEqual({ date: row.end_datetime });
  });

  it("ordnet dailyPatience immer der angemeldeten Session zu und haelt Accounts getrennt", async () => {
    mockAuth.mockResolvedValue({ user: { email: "person-a@example.com" } });
    await POST(
      jsonRequest("http://localhost/api/sync", {
        dailyPatience: [{ date: "2026-09-18", geduld: 4, updatedAt: 10 }],
      })
    );

    mockAuth.mockResolvedValue({ user: { email: "person-b@example.com" } });
    await POST(
      jsonRequest("http://localhost/api/sync", {
        dailyPatience: [{ date: "2026-09-18", geduld: 1, updatedAt: 10 }],
      })
    );

    const rows = sqlite.prepare("SELECT user_email, geduld FROM daily_patience ORDER BY user_email").all();
    expect(rows).toEqual([
      { user_email: "person-a@example.com", geduld: 4 },
      { user_email: "person-b@example.com", geduld: 1 },
    ]);
  });

  it("ignoriert ein untergeschobenes userEmail-Feld im Payload (kein Mass Assignment)", async () => {
    mockAuth.mockResolvedValue({ user: { email: "real@example.com" } });

    await POST(
      jsonRequest("http://localhost/api/sync", {
        dailyPatience: [{ userEmail: "attacker@example.com", date: "2026-09-18", geduld: 5, updatedAt: 1 }],
      })
    );

    const rows = sqlite.prepare("SELECT user_email FROM daily_patience").all();
    expect(rows).toEqual([{ user_email: "real@example.com" }]);
  });
});
