// Testet das Push-then-Pull-Verhalten von runSync gegen eine echte (fake-indexeddb-
// gestuetzte) lokale Datenbank, aber mit gemocktem fetch statt echtem Server.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDb, resetLocalDb } from "@/lib/storage/local-db";
import { getDataVersion, getLastSyncAt, isClientOutdated, runSync } from "@/lib/storage/sync";
import { SYNC_PROTOCOL_HEADER, SYNC_PROTOCOL_VERSION } from "@/lib/tilly/protocol";

const T = Date.UTC(2026, 2, 5, 9, 0);
const entry = (id: string, updatedAt = 1) => ({ id, type: "stress", data: { level: 3 }, startAt: T, endAt: T, updatedAt, deleted: false });
const pull = (over: object = {}) => ({
  protocol: SYNC_PROTOCOL_VERSION,
  token: 5,
  full: true,
  windowStart: T - 1000,
  earliestAt: null,
  kv: [],
  entries: [],
  dailyPatience: [],
  ...over,
});
const ok = (body: object = {}) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) }) as unknown as Response;

beforeEach(async () => {
  await resetLocalDb();
  vi.stubGlobal("navigator", { onLine: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("runSync", () => {
  it("tut nichts, solange das Geraet offline ist", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await localDb.enqueueKv({ key: "a", value: "1", updatedAt: 1 });

    await runSync();

    expect(fetchMock).not.toHaveBeenCalled();
    expect((await localDb.getQueue()).kv).toHaveLength(1);
  });

  it("pusht die Queue ohne Client-Zeitstempel, leert sie und speichert das Token", async () => {
    await localDb.enqueueKv({ key: "tilly:note", value: "hallo", updatedAt: 10 });
    await localDb.enqueueEntry(entry("e1"));
    await localDb.enqueuePatience({ userEmail: "a@x", date: "2026-03-05", geduld: 2, updatedAt: 3 });
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ rejected: [] })).mockResolvedValueOnce(ok(pull({ token: 7 })));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runSync();
    expect(result).toEqual({ status: "ok", pushed: 3, pulled: 0 });

    const [pushUrl, pushInit] = fetchMock.mock.calls[0];
    expect(pushUrl).toBe("/api/sync");
    expect(pushInit.method).toBe("POST");
    expect(pushInit.headers[SYNC_PROTOCOL_HEADER]).toBe(String(SYNC_PROTOCOL_VERSION));
    expect(JSON.parse(pushInit.body)).toEqual({
      kv: [{ key: "tilly:note", value: "hallo" }],
      entries: [{ id: "e1", type: "stress", startAt: T, endAt: T, data: { level: 3 }, deleted: false }],
      dailyPatience: [{ date: "2026-03-05", geduld: 2 }],
    });
    expect(await localDb.getQueue()).toEqual({ kv: [], entries: [], dailyPatience: [] });
    expect((await localDb.getMeta()).token).toBe(7);
  });

  it("behaelt abgelehnte Eintraege markiert in der Queue und sendet sie nicht erneut", async () => {
    await localDb.enqueueEntry(entry("good"));
    await localDb.enqueueEntry(entry("bad"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ rejected: [{ kind: "entry", id: "bad", error: "ungueltig" }] }))
      .mockResolvedValueOnce(ok(pull()));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await runSync();

    expect((await localDb.getQueue()).entries).toEqual([]);
    const rej = await localDb.listRejected();
    expect(rej.map((e) => [e.id, e.rejection])).toEqual([["bad", "ungueltig"]]);

    await localDb.enqueueEntry(entry("bad", 2));
    expect((await localDb.getQueue()).entries.map((e) => e.id)).toEqual(["bad"]);
    expect(await localDb.listRejected()).toEqual([]);
  });

  it("bestaetigt die Queue nicht, wenn die Push-Antwort nicht lesbar ist", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await localDb.enqueueEntry(entry("e1"));
    const broken = { ok: true, status: 200, json: async () => { throw new Error("connection lost"); } } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(broken));

    expect(await runSync()).toEqual({ status: "failed" });
    expect((await localDb.getQueue()).entries.map((e) => e.id)).toEqual(["e1"]);
  });

  it("setzt earliestAt zurueck, wenn der Server bei einem vollen Sync keinen Eintrag mehr kennt", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok(pull({ earliestAt: T }))));
    await runSync();
    expect((await localDb.getMeta()).earliestAt).toBe(T);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok(pull({ earliestAt: null }))));
    await runSync();
    expect((await localDb.getMeta()).earliestAt).toBeNull();
  });

  it("erhoeht dataVersion nur, wenn ein Pull etwas geaendert hat", async () => {
    const v0 = getDataVersion();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok(pull({ full: false, token: 6 }))));
    await runSync();
    expect(getDataVersion()).toBe(v0);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok(pull({ full: false, token: 7, entries: [{ ...entry("n1"), serverSeq: 7 }] }))));
    await runSync();
    expect(getDataVersion()).toBe(v0 + 1);
  });

  it("meldet Fehlschlag und Offline-Zustand im Ergebnis", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(fail(500)));
    await localDb.enqueueEntry(entry("e1"));
    expect(await runSync()).toEqual({ status: "failed" });

    vi.stubGlobal("navigator", { onLine: false });
    expect(await runSync()).toEqual({ status: "offline" });
  });

  it("holt beim ersten Sync das Fenster und danach nur Aenderungen seit dem Token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(pull({ token: 4, entries: [{ ...entry("a"), serverSeq: 1 }, { ...entry("b"), serverSeq: 2 }] })))
      .mockResolvedValueOnce(ok(pull({ token: 6, full: false, windowStart: null, entries: [{ ...entry("a"), deleted: true, serverSeq: 5 }] })));
    vi.stubGlobal("fetch", fetchMock);

    await runSync();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/sync");
    expect((await localDb.listEntries()).map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect((await localDb.getMeta()).loadedFrom).toBe(T - 1000);

    await runSync();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/sync?token=4");
    expect((await localDb.listEntries()).map((e) => e.id)).toEqual(["b"]);
    expect((await localDb.getMeta()).token).toBe(6);
  });

  it("ueberschreibt lokale, noch nicht gesendete Aenderungen nicht durch gepullte Zeilen", async () => {
    await localDb.putEntry({ ...entry("a"), data: { level: 5 } });
    await localDb.enqueueEntry({ ...entry("a"), data: { level: 5 } });

    await localDb.applyPull(pull({ full: false, entries: [{ ...entry("a"), data: { level: 1 }, serverSeq: 9 }] }) as never);

    expect((await localDb.getEntry("a"))?.data).toEqual({ level: 5 });
  });

  it("ersetzt bei einer Fenster-Antwort alle lokalen Zeilen ausser den noch nicht gesendeten", async () => {
    await localDb.putEntry(entry("alt"));
    await localDb.putEntry(entry("lokal"));
    await localDb.enqueueEntry(entry("lokal"));
    await localDb.applyPull(pull({ entries: [{ ...entry("neu"), serverSeq: 1 }] }) as never);
    expect((await localDb.listEntries()).map((e) => e.id).sort()).toEqual(["lokal", "neu"]);
  });

  it("laedt das Fenster neu, wenn der Server das Token nicht kennt (409)", async () => {
    await localDb.applyPull(pull({ token: 99 }) as never);
    const fetchMock = vi.fn().mockResolvedValueOnce(fail(409)).mockResolvedValueOnce(ok(pull({ token: 3 })));
    vi.stubGlobal("fetch", fetchMock);

    await runSync();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/sync?token=99");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/sync");
    expect((await localDb.getMeta()).token).toBe(3);
  });

  it("laesst die Queue unangetastet, wenn der Push fehlschlaegt", async () => {
    await localDb.enqueueKv({ key: "tilly:note", value: "hallo", updatedAt: 10 });
    const fetchMock = vi.fn().mockResolvedValueOnce(fail(500));
    vi.stubGlobal("fetch", fetchMock);

    await expect(runSync()).resolves.toEqual({ status: "failed" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await localDb.getQueue()).kv).toHaveLength(1);
  });

  it("behaelt Aenderungen, die waehrend des Pushs erneut gemacht wurden", async () => {
    await localDb.enqueueKv({ key: "k", value: "alt", updatedAt: 1 });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        await localDb.enqueueKv({ key: "k", value: "neu", updatedAt: 2 });
        return ok({ rejected: [] });
      })
      .mockResolvedValueOnce(ok(pull()));
    vi.stubGlobal("fetch", fetchMock);

    await runSync();

    expect((await localDb.getQueue()).kv).toEqual([{ key: "k", value: "neu", updatedAt: 2 }]);
  });

  it("stoppt bei 426 (App veraltet) und synchronisiert danach nicht mehr", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(fail(426));
    vi.stubGlobal("fetch", fetchMock);

    await runSync();
    expect(isClientOutdated()).toBe(true);
    await runSync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// setImmediate bleibt echt, damit fake-indexeddb im runSync durchlaeuft.
const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
};

describe("scheduleSync", () => {
  it("bündelt mehrere Aufrufe zu einem Sync und flush sendet sofort", async () => {
    // Frisches Modul: der 426-Test oben setzt "veraltet" dauerhaft.
    vi.resetModules();
    const { flushScheduledSync, scheduleSync } = await import("@/lib/storage/sync");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => pull() });
    vi.stubGlobal("fetch", fetchMock);
    try {
      scheduleSync(1000);
      scheduleSync(1000);
      await vi.advanceTimersByTimeAsync(999);
      expect(fetchMock).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(2);
      await settle();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockClear();
      scheduleSync(60_000);
      flushScheduledSync();
      await settle();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(61_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
