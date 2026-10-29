// @vitest-environment node
//
// Testet die Sync-Route gegen eine echte In-Memory-SQLite-Datenbank (better-sqlite3),
// mit gemocktem Auth-Modul statt einer echten Google-Session.
import { beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { NextRequest } from "next/server";
import * as schema from "@/db/schema";
import { SYNC_PROTOCOL_HEADER, SYNC_PROTOCOL_VERSION } from "@/lib/tilly/protocol";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const sqlite = new Database(":memory:");
migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
const mockDb = drizzle(sqlite, { schema });
vi.mock("@/db/client", () => ({ db: mockDb }));

const { GET, POST } = await import("@/app/api/sync/route");
const { GET: GET_ENTRIES } = await import("@/app/api/entries/route");

const HEADERS = { "Content-Type": "application/json", [SYNC_PROTOCOL_HEADER]: String(SYNC_PROTOCOL_VERSION) };
const DAY = 24 * 60 * 60 * 1000;
const ME = { user: { email: "a@example.com" } };

const post = (body: unknown, headers: Record<string, string> = HEADERS) =>
  POST(new NextRequest("http://localhost/api/sync", { method: "POST", headers, body: JSON.stringify(body) }));
const get = (query = "", headers: Record<string, string> = HEADERS) =>
  GET(new NextRequest(`http://localhost/api/sync${query}`, { headers }));
const getEntries = (query: string) => GET_ENTRIES(new NextRequest(`http://localhost/api/entries${query}`, { headers: HEADERS }));
const stress = (id: string, at: number, extra: object = {}) => ({
  id,
  type: "stress",
  startAt: at,
  endAt: at,
  data: { level: 3 },
  ...extra,
});

beforeEach(() => {
  sqlite.exec("DELETE FROM kv_store; DELETE FROM entries; DELETE FROM daily_patience; DELETE FROM sync_state;");
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(ME);
});

describe("Zugriff und Protokollversion", () => {
  it("lehnt nicht angemeldete Anfragen ab", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect((await post({})).status).toBe(401);
    expect((await getEntries("?from=0&to=1")).status).toBe(401);
  });

  it("lehnt Clients ohne oder mit falscher Protokollversion mit 426 ab", async () => {
    expect((await get("", {})).status).toBe(426);
    expect((await get("", { [SYNC_PROTOCOL_HEADER]: "2" })).status).toBe(426);
    expect((await post({}, { "Content-Type": "application/json" })).status).toBe(426);
    const res = await GET_ENTRIES(new NextRequest("http://localhost/api/entries?from=0&to=1"));
    expect(res.status).toBe(426);
    expect(await res.json()).toMatchObject({ error: "client_outdated", required: SYNC_PROTOCOL_VERSION });
  });

  it("lehnt einen Body ab, der kein Objekt ist", async () => {
    const res = await POST(new NextRequest("http://localhost/api/sync", { method: "POST", headers: HEADERS, body: "kein json" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/sync", () => {
  it("vergibt updated_at und server_seq serverseitig und ignoriert Client-Werte", async () => {
    const before = Date.now();
    const res = await post({
      entries: [stress("a", before, { updatedAt: 1, serverSeq: 999 }), stress("b", before)],
      kv: [{ key: "note", value: "x", updatedAt: 1, serverSeq: 999 }],
    });
    const body = await res.json();
    expect(body).toMatchObject({ protocol: SYNC_PROTOCOL_VERSION, token: 3, rejected: [] });

    const rows = sqlite.prepare("SELECT id, updated_at, server_seq FROM entries ORDER BY server_seq").all() as {
      id: string;
      updated_at: number;
      server_seq: number;
    }[];
    expect(rows.map((r) => [r.id, r.server_seq])).toEqual([["a", 2], ["b", 3]]);
    expect(rows.every((r) => r.updated_at >= before)).toBe(true);
    expect(sqlite.prepare("SELECT server_seq FROM kv_store").get()).toEqual({ server_seq: 1 });
  });

  it("last push wins: der zuletzt eintreffende Stand gewinnt und bekommt eine neue server_seq", async () => {
    await post({ entries: [stress("a", 1000, { data: { level: 1 } })] });
    await post({ entries: [stress("a", 1000, { data: { level: 5 } })] });
    const row = sqlite.prepare("SELECT data, server_seq FROM entries WHERE id = 'a'").get() as { data: string; server_seq: number };
    expect(JSON.parse(row.data)).toEqual({ level: 5 });
    expect(row.server_seq).toBe(2);
  });

  it("vergibt für unveränderte Daten keine neue server_seq (Eintrag, Einstellung, Geduld)", async () => {
    const payload = { kv: [{ key: "general-note", value: "Hallo" }], entries: [stress("a", 1000)], dailyPatience: [{ date: "2026-09-18", geduld: 3 }] };
    const first = await (await post(payload)).json();
    const second = await (await post(payload)).json();
    expect(second.token).toBe(first.token);

    const changed = await (await post({ kv: [{ key: "general-note", value: "Hallo Welt" }] })).json();
    expect(changed.token).toBe(first.token + 1);
  });

  it("meldet ungültige Einträge in rejected und speichert die übrigen", async () => {
    const res = await post({
      entries: [
        stress("ok", 1000),
        stress("ende-vor-start", 1000, { endAt: 500 }),
        { ...stress("iso", 1000), startAt: "2026-03-05T09:00:00.000Z" },
        { ...stress("falsches-feld", 1000), data: { level: "hoch" } },
        { ...stress("typ", 1000), type: "unbekannt" },
        { nope: true },
      ],
      kv: [{ key: "", value: "x" }],
      dailyPatience: [{ date: "5.3.", geduld: 2 }],
    });
    const body = await res.json();
    expect(body.rejected.map((r: { kind: string; id: string }) => `${r.kind}:${r.id}`).sort()).toEqual([
      "dailyPatience:5.3.",
      "entry:?",
      "entry:ende-vor-start",
      "entry:falsches-feld",
      "entry:iso",
      "entry:typ",
      "kv:",
    ].sort());
    expect(sqlite.prepare("SELECT id FROM entries").all()).toEqual([{ id: "ok" }]);
  });

  it("speichert Löschungen als Tombstone", async () => {
    await post({ entries: [stress("a", 1000)] });
    await post({ entries: [stress("a", 1000, { deleted: true })] });
    expect(sqlite.prepare("SELECT deleted, server_seq FROM entries").get()).toEqual({ deleted: 1, server_seq: 2 });
  });

  it("akzeptiert Tombstones auch mit ungueltigem data", async () => {
    await post({ entries: [stress("a", 1000)] });
    const res = await post({ entries: [stress("a", 1000, { deleted: true, data: { level: "kaputt" } })] });
    expect(res.status).toBe(200);
    expect(sqlite.prepare("SELECT deleted FROM entries").get()).toEqual({ deleted: 1 });
  });

  it("entfernt veraltete Felder aus data (date, ms, startedAt)", async () => {
    await post({ entries: [stress("a", 1000, { data: { level: 2, date: "2026-03-05", ms: 5, startedAt: "x" } })] });
    expect(JSON.parse((sqlite.prepare("SELECT data FROM entries").get() as { data: string }).data)).toEqual({ level: 2 });
  });

  it("ordnet dailyPatience immer der angemeldeten Session zu und haelt Accounts getrennt", async () => {
    mockAuth.mockResolvedValue({ user: { email: "person-a@example.com" } });
    await post({ dailyPatience: [{ date: "2026-09-18", geduld: 4 }] });
    mockAuth.mockResolvedValue({ user: { email: "person-b@example.com" } });
    await post({ dailyPatience: [{ date: "2026-09-18", geduld: 1 }] });

    expect(sqlite.prepare("SELECT user_email, geduld FROM daily_patience ORDER BY user_email").all()).toEqual([
      { user_email: "person-a@example.com", geduld: 4 },
      { user_email: "person-b@example.com", geduld: 1 },
    ]);
  });

  it("ignoriert ein untergeschobenes userEmail-Feld im Payload (kein Mass Assignment)", async () => {
    mockAuth.mockResolvedValue({ user: { email: "real@example.com" } });
    await post({ dailyPatience: [{ userEmail: "attacker@example.com", date: "2026-09-18", geduld: 5 }] });
    expect(sqlite.prepare("SELECT user_email FROM daily_patience").all()).toEqual([{ user_email: "real@example.com" }]);
  });
});

describe("GET /api/sync", () => {
  it("liefert ohne Token nur das 30-Tage-Fenster (ohne Tombstones), alle Einstellungen und das Token", async () => {
    const now = Date.now();
    await post({
      entries: [
        stress("neu", now - DAY),
        stress("alt", now - 40 * DAY),
        stress("geloescht", now - DAY, { deleted: true }),
        { id: "laufend", type: "alone", startAt: now - 41 * DAY, endAt: now - 29 * DAY, data: {} },
      ],
      kv: [{ key: "note", value: "x" }],
    });
    const body = await (await get()).json();
    expect(body.full).toBe(true);
    expect(body.token).toBe(5);
    expect(body.entries.map((e: { id: string }) => e.id).sort()).toEqual(["laufend", "neu"]);
    expect(body.kv).toHaveLength(1);
    expect(body.entries[0]).toMatchObject({ deleted: false, data: expect.any(Object) });
  });

  it("liefert mit Token nur Änderungen danach, auch Tombstones und alte Einträge", async () => {
    await post({ entries: [stress("a", 1000), stress("b", 2000)] });
    const { token } = await (await get()).json();
    await post({ entries: [stress("a", 1000, { deleted: true }), stress("alt", 5)], dailyPatience: [{ date: "2026-09-18", geduld: 3 }] });

    const body = await (await get(`?token=${token}`)).json();
    expect(body.full).toBe(false);
    expect(body.entries.map((e: { id: string; deleted: boolean }) => `${e.id}:${e.deleted}`).sort()).toEqual(["a:true", "alt:false"]);
    expect(body.dailyPatience).toHaveLength(1);
    expect(body.kv).toEqual([]);

    const again = await (await get(`?token=${body.token}`)).json();
    expect(again.entries).toEqual([]);
  });

  it("antwortet bei unbekanntem oder ungültigem Token mit 409 (Resync)", async () => {
    await post({ entries: [stress("a", 1000)] });
    expect((await get("?token=999")).status).toBe(409);
    expect((await get("?token=abc")).status).toBe(409);
    expect((await get("?token=-1")).status).toBe(409);
  });

  it("liefert die Geduld aller Accounts samt Anzeigename", async () => {
    process.env.USER_DISPLAY_NAMES = JSON.stringify({ "a@example.com": "Anna" });
    await post({ dailyPatience: [{ date: "2026-09-18", geduld: 3 }] });
    mockAuth.mockResolvedValue({ user: { email: "ben@example.com" } });
    await post({ dailyPatience: [{ date: "2026-09-18", geduld: 5 }] });

    const body = await (await get()).json();
    const byEmail = Object.fromEntries(body.dailyPatience.map((r: { userEmail: string; userName: string }) => [r.userEmail, r.userName]));
    expect(byEmail).toEqual({ "a@example.com": "Anna", "ben@example.com": "ben" });
    delete process.env.USER_DISPLAY_NAMES;
  });
});

describe("GET /api/entries", () => {
  it("liefert Einträge, die den Zeitraum berühren, absteigend nach Start", async () => {
    await post({
      entries: [
        stress("vorher", 100),
        stress("anfang", 1000),
        stress("mitte", 1500),
        { id: "ueberlappt", type: "alone", startAt: 500, endAt: 1200, data: {} },
        stress("danach", 2000),
        stress("geloescht", 1500, { deleted: true }),
      ],
    });
    const body = await (await getEntries("?from=1000&to=2000")).json();
    expect(body.entries.map((e: { id: string }) => e.id)).toEqual(["mitte", "anfang", "ueberlappt"]);
    expect(body.truncated).toBe(false);
  });

  it("lehnt ungültige Zeiträume ab", async () => {
    expect((await getEntries("")).status).toBe(400);
    expect((await getEntries("?from=5&to=5")).status).toBe(400);
    expect((await getEntries("?from=a&to=5")).status).toBe(400);
  });
});
