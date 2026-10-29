// Storage-Layer laeuft auf IndexedDB-Objekt-Stores (idb); fake-indexeddb (via vitest.setup.ts)
// stellt eine In-Memory-IndexedDB fuer diese Tests bereit.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/sync", () => ({
  runSync: vi.fn(),
  notifyStorageChange: vi.fn(),
  scheduleSync: vi.fn(),
  onStorageChange: vi.fn(() => () => {}),
  setupAutoSync: vi.fn(() => () => {}),
}));

import {
  deleteEntry,
  fetchEntriesSince,
  getLoadedFrom,
  loadEntries,
  getKv,
  getPatience,
  getPendingCount,
  listEntries,
  saveEntry,
  setKv,
  setMyPatience,
} from "@/lib/storage";
import { runSync, scheduleSync } from "@/lib/storage/sync";
import { localDb, resetLocalDb } from "@/lib/storage/local-db";

beforeEach(async () => {
  await resetLocalDb();
});

const DATE = "2026-03-05T10:30:00.000Z";
const AT = Date.parse(DATE);
const POINT = { startAt: AT, endAt: AT };

describe("kv-Einstellungen", () => {
  it("liefert null fuer einen unbekannten Schluessel", async () => {
    expect(await getKv("missing")).toBeNull();
  });

  it("speichert und liest einen Wert", async () => {
    await setKv("tilly:note", "hallo");
    expect(await getKv("tilly:note")).toBe("hallo");
  });

  it("haelt pro Schluessel nur die zuletzt eingereihte Mutation in der Queue", async () => {
    await setKv("tilly:note", "erste Version");
    await setKv("tilly:note", "zweite Version");

    const queue = await localDb.getQueue();
    const noteMutations = queue.kv.filter((row) => row.key === "tilly:note");

    expect(noteMutations).toHaveLength(1);
    expect(noteMutations[0].value).toBe("zweite Version");
  });
});

describe("Eintraege", () => {
  it("erzeugt eine neue id, wenn keine uebergeben wird", async () => {
    const entry = await saveEntry(undefined, "food", { food: "Nass", note: "Napf" }, POINT);

    expect(entry.id).toBeTruthy();
    const listed = await listEntries();
    expect(listed).toHaveLength(1);
    expect(listed[0].type).toBe("food");
  });

  it("aktualisiert einen bestehenden Eintrag statt ihn zu duplizieren", async () => {
    const first = await saveEntry(undefined, "food", { food: "Nass", note: "Napf" }, POINT);
    await saveEntry(first.id, "food", { food: "Nass", note: "Napf, aktualisiert" }, POINT);

    const listed = await listEntries();
    expect(listed).toHaveLength(1);
    expect(listed[0].data.note).toBe("Napf, aktualisiert");
  });

  it("speichert Alleine-Zeitpunkte als Epoch-ms und nur die Notiz in data", async () => {
    const range = { startAt: Date.UTC(2026, 2, 5, 9, 0), endAt: Date.UTC(2026, 2, 5, 10, 30) };
    const entry = await saveEntry(undefined, "alone", { note: "x" }, range);

    expect(entry.startAt).toBe(range.startAt);
    expect(entry.endAt).toBe(range.endAt);
    expect(entry.data).toEqual({ note: "x" });
  });

  it("speichert Punkt-Ereignisse mit end = start und ohne date in data", async () => {
    const entry = await saveEntry(undefined, "stress", { level: 2 }, POINT);
    expect(entry.startAt).toBe(Date.parse(DATE));
    expect(entry.endAt).toBe(entry.startAt);
    expect(entry.data).toEqual({ level: 2 });
  });

  it("lehnt ungueltige Eintraege ab", async () => {
    await expect(saveEntry(undefined, "stress", { level: 2 }, { startAt: Number.NaN, endAt: Number.NaN })).rejects.toThrow("Eintrag ungueltig");
    await expect(saveEntry(undefined, "stress", { level: "x" }, POINT)).rejects.toThrow("data.level");
  });

  it("blendet weich geloeschte Eintraege in listEntries aus", async () => {
    const entry = await saveEntry(undefined, "training", { activity: "Sitz", dogStars: 3, trainerStars: 3 }, POINT);
    await deleteEntry(entry.id);

    expect(await listEntries()).toHaveLength(0);
  });

  it("entfernt einen Eintrag lokal und reiht einen Tombstone fuer den Server ein", async () => {
    const entry = await saveEntry(undefined, "stress", { level: 2 }, POINT);
    await deleteEntry(entry.id);

    expect(await localDb.getEntry(entry.id)).toBeUndefined();
    const queue = await localDb.getQueue();
    expect(queue.entries).toHaveLength(1);
    expect(queue.entries[0]).toMatchObject({ id: entry.id, deleted: true });
  });

  it("loescht einen abgelehnten Eintrag ohne Tombstone", async () => {
    const entry = await saveEntry(undefined, "stress", { level: 2 }, POINT);
    await localDb.markRejected([{ id: entry.id, updatedAt: (await localDb.getQueuedEntry(entry.id))!.updatedAt, error: "x" }]);
    await deleteEntry(entry.id);

    expect(await localDb.getEntry(entry.id)).toBeUndefined();
    expect(await localDb.getQueuedEntry(entry.id)).toBeUndefined();
    expect(await localDb.listRejected()).toEqual([]);
  });

  it("ignoriert das Loeschen einer lokal unbekannten id", async () => {
    await deleteEntry("unbekannte-id");
    expect((await localDb.getQueue()).entries).toEqual([]);
  });
});

describe("Geduld pro Person", () => {
  it("ist 0, solange nichts erfasst wurde", async () => {
    expect(await getPatience("a@example.com", "2026-09-18")).toBe(0);
  });

  it("haelt Werte pro Person und Tag getrennt", async () => {
    await setMyPatience("a@example.com", "2026-09-18", 4);
    await setMyPatience("b@example.com", "2026-09-18", 2);

    expect(await getPatience("a@example.com", "2026-09-18")).toBe(4);
    expect(await getPatience("b@example.com", "2026-09-18")).toBe(2);
  });

  it("laesst einen Wert nicht in einen anderen Tag durchsickern", async () => {
    await setMyPatience("a@example.com", "2026-09-18", 4);

    expect(await getPatience("a@example.com", "2026-09-19")).toBe(0);
  });
});

describe("ausstehende Aenderungen", () => {
  it("zaehlt kv-, Eintrags- und Geduld-Mutationen zusammen", async () => {
    await setKv("tilly:note", "x");
    await saveEntry(undefined, "food", { food: "Nass" }, POINT);
    await setMyPatience("a@example.com", "2026-09-18", 3);

    expect(await getPendingCount()).toBe(3);
  });
});

describe("Nachladen vom Server", () => {
  const wire = (id: string, startAt: number) => ({ id, type: "food", data: {}, startAt, endAt: startAt, updatedAt: 1, deleted: false });
  const respond = (pages: object[]) => {
    const fetchMock = vi.fn();
    pages.forEach((p) => fetchMock.mockResolvedValueOnce({ ok: true, json: async () => p }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("fetchEntriesSince blaettert durch abgeschnittene Antworten, ohne lokal zu speichern", async () => {
    respond([
      { entries: [wire("b", 2000)], truncated: true },
      { entries: [wire("a", 1000)], truncated: false },
    ]);

    const list = await fetchEntriesSince(0);

    expect(list.map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(await listEntries()).toEqual([]);
  });

  it("blaettert an der Seitengrenze inklusive gleicher Startzeitpunkte", async () => {
    const fetchMock = respond([
      { entries: [wire("b", 2000), wire("c", 2000)], truncated: true },
      { entries: [wire("c", 2000), wire("d", 2000), wire("a", 1000)], truncated: false },
    ]);

    const list = await fetchEntriesSince(0);

    expect(list.map((e) => e.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(String(fetchMock.mock.calls[1][0])).toContain("to=2001");
  });

  it("loadEntries speichert bei abgeschnittener Antwort ein Fenster inklusive der Grenze", async () => {
    await localDb.applyPull({ protocol: 3, token: 1, full: true, windowStart: 5000, earliestAt: 1000, entries: [], kv: [], dailyPatience: [] });
    respond([{ entries: [wire("x", 3000)], truncated: true }]);

    expect(await loadEntries({ from: 1000 })).toBe(false);
    expect(await getLoadedFrom()).toBe(3001);
  });

  it("loadEntries ohne bekanntes Fenster tut nichts", async () => {
    const fetchMock = respond([]);
    expect(await loadEntries({ from: 0 })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loadEntries speichert Eintraege und rueckt loadedFrom vor", async () => {
    await localDb.applyPull({ protocol: 3, token: 1, full: true, windowStart: 5000, earliestAt: 1000, entries: [], kv: [], dailyPatience: [] });
    respond([{ entries: [wire("old", 1500)], truncated: false }]);

    expect(await loadEntries({ from: 1000 })).toBe(true);

    expect((await listEntries()).map((e) => e.id)).toEqual(["old"]);
    expect(await getLoadedFrom()).toBe(1000);
  });

  it("verwirft eine veraltete History-Antwort, wenn inzwischen ein neuerer Sync angewendet wurde", async () => {
    await localDb.applyPull({ protocol: 3, token: 1, full: true, windowStart: 5000, earliestAt: 1000, entries: [], kv: [], dailyPatience: [] });

    let resolveFetch!: (response: { ok: boolean; json: () => Promise<object> }) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; })));
    const loading = loadEntries({ from: 1000 });
    await vi.waitFor(() => expect(resolveFetch).toBeTypeOf("function"));

    await localDb.applyPull({
      protocol: 3,
      token: 2,
      full: false,
      windowStart: null,
      earliestAt: 1000,
      entries: [{ ...wire("entry", 1500), updatedAt: 2, serverSeq: 2, data: { note: "new" } }],
      kv: [],
      dailyPatience: [],
    });
    resolveFetch({
      ok: true,
      json: async () => ({ entries: [{ ...wire("entry", 1500), updatedAt: 1, serverSeq: 1, data: { note: "old" } }], truncated: false, earliestAt: 1000 }),
    });

    expect(await loading).toBe(false);
    expect((await listEntries()).find((entry) => entry.id === "entry")?.data.note).toBe("new");
  });
});

describe("setKv mit deferSync", () => {
  it("sendet nicht sofort, sondern plant den Sync", async () => {
    vi.mocked(runSync).mockClear();
    vi.mocked(scheduleSync).mockClear();

    await setKv("general-note", "Hallo", { deferSync: true });
    expect(scheduleSync).toHaveBeenCalledTimes(1);
    expect(runSync).not.toHaveBeenCalled();
    expect(await getKv("general-note")).toBe("Hallo");

    await setKv("food-types", "[]");
    expect(runSync).toHaveBeenCalledTimes(1);
  });
});
