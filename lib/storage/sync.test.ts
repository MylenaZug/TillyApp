// Testet das Push-then-Pull-Verhalten von runSync gegen eine echte (fake-indexeddb-
// gestuetzte) lokale Queue, aber mit gemocktem fetch statt echtem Server.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDb } from "@/lib/storage/local-db";
import { runSync, setSyncUser } from "@/lib/storage/sync";

beforeEach(async () => {
  await localDb.clearAll();
  setSyncUser("a@example.com");
  vi.stubGlobal("navigator", { onLine: true });
});

afterEach(() => {
  setSyncUser(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("runSync", () => {
  it("tut nichts, solange das Geraet offline ist", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await localDb.setQueue({ kv: [{ key: "a", value: "1", updatedAt: 1 }], entries: [], dailyPatience: [] });

    await runSync();

    expect(fetchMock).not.toHaveBeenCalled();
    const queue = await localDb.getQueue();
    expect(queue.kv).toHaveLength(1);
  });

  it("pusht die Queue, leert sie bei Erfolg und wendet die gepullten Aenderungen an", async () => {
    await localDb.setQueue({ kv: [{ key: "tilly:note", value: "hallo", updatedAt: 10 }], entries: [], dailyPatience: [] });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serverTime: 999,
          kv: [{ key: "tilly:note", value: "hallo", updatedAt: 10 }],
          entries: [],
          dailyPatience: [],
        }),
      } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    await runSync();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [pushUrl, pushInit] = fetchMock.mock.calls[0];
    expect(pushUrl).toBe("/api/sync");
    expect(pushInit.method).toBe("POST");

    expect(await localDb.getQueue()).toEqual({ kv: [], entries: [], dailyPatience: [] });
    expect((await localDb.getMeta()).lastSyncedAt).toBe(999);
  });

  it("sendet bei dailyPatience nur Mutationen des aktiven Accounts", async () => {
    await localDb.setQueue({
      kv: [],
      entries: [],
      dailyPatience: [
        { userEmail: "a@example.com", date: "2026-09-18", geduld: 4, updatedAt: 10 },
        { userEmail: "b@example.com", date: "2026-09-18", geduld: 2, updatedAt: 11 },
      ],
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ serverTime: 999, kv: [], entries: [], dailyPatience: [] }),
      } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    await runSync();

    const [, pushInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(pushInit.body as string)).toEqual({
      kv: [],
      entries: [],
      dailyPatience: [{ userEmail: "a@example.com", date: "2026-09-18", geduld: 4, updatedAt: 10 }],
    });
    expect(await localDb.getQueue()).toEqual({
      kv: [],
      entries: [],
      dailyPatience: [{ userEmail: "b@example.com", date: "2026-09-18", geduld: 2, updatedAt: 11 }],
    });
  });

  it("laesst die Queue unangetastet, wenn der Push fehlschlaegt", async () => {
    await localDb.setQueue({ kv: [{ key: "tilly:note", value: "hallo", updatedAt: 10 }], entries: [], dailyPatience: [] });
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(runSync()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const queue = await localDb.getQueue();
    expect(queue.kv).toHaveLength(1);
  });

  it("ueberspringt einen zweiten gleichzeitigen Aufruf, waehrend ein Sync noch laeuft", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ serverTime: 5, kv: [], entries: [], dailyPatience: [] }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    await localDb.setQueue({ kv: [{ key: "tilly:note", value: "x", updatedAt: 1 }], entries: [], dailyPatience: [] });

    const first = runSync();
    const second = runSync();
    await Promise.all([first, second]);

    // Ohne den syncing-Guard wuerde der zweite Aufruf weitere 2 fetch-Calls ausloesen.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("bestaetigt nur den gepushten Snapshot und behaelt neuere Queue-Eintraege", async () => {
    await localDb.setQueue({ kv: [{ key: "tilly:note", value: "alt", updatedAt: 10 }], entries: [], dailyPatience: [] });

    let resolvePush: ((value: Response) => void) | undefined;
    const pushResponse = new Promise<Response>((resolve) => {
      resolvePush = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => pushResponse)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ serverTime: 999, kv: [], entries: [], dailyPatience: [] }),
      } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const syncPromise = runSync();
    await Promise.resolve();
    await localDb.enqueueKv({ key: "tilly:note", value: "neu", updatedAt: 20 });
    resolvePush?.({ ok: true } as Response);
    await syncPromise;

    expect(await localDb.getQueue()).toEqual({
      kv: [{ key: "tilly:note", value: "neu", updatedAt: 20 }],
      entries: [],
      dailyPatience: [],
    });
  });
});
