// Storage-Layer laeuft auf IndexedDB-Objekt-Stores (idb); fake-indexeddb (via vitest.setup.ts)
// stellt eine In-Memory-IndexedDB fuer diese Tests bereit.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/sync", () => ({
  runSync: vi.fn(),
  onStorageChange: vi.fn(() => () => {}),
  setupAutoSync: vi.fn(() => () => {}),
}));

import {
  deleteEntry,
  getKv,
  getPatience,
  getPendingCount,
  listEntries,
  saveEntry,
  setKv,
  setMyPatience,
} from "@/lib/storage";
import { localDb, resetLocalDb } from "@/lib/storage/local-db";

beforeEach(async () => {
  await resetLocalDb();
});

const DATE = "2026-03-05T10:30:00.000Z";

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
    const entry = await saveEntry(undefined, "food", { food: "Nass", date: DATE, note: "Napf" });

    expect(entry.id).toBeTruthy();
    const listed = await listEntries();
    expect(listed).toHaveLength(1);
    expect(listed[0].type).toBe("food");
  });

  it("aktualisiert einen bestehenden Eintrag statt ihn zu duplizieren", async () => {
    const first = await saveEntry(undefined, "food", { food: "Nass", date: DATE, note: "Napf" });
    await saveEntry(first.id, "food", { food: "Nass", date: DATE, note: "Napf, aktualisiert" });

    const listed = await listEntries();
    expect(listed).toHaveLength(1);
    expect(listed[0].data.note).toBe("Napf, aktualisiert");
  });

  it("speichert Alleine-Zeitpunkte als Epoch-ms (volle Minuten) und nur die Notiz in data", async () => {
    const entry = await saveEntry(undefined, "alone", {
      startDatetime: "2026-03-05T09:00:20.000Z",
      endDatetime: "2026-03-05T10:30:20.000Z",
      note: "x",
    });

    expect(entry.startAt).toBe(Date.UTC(2026, 2, 5, 9, 0));
    expect(entry.endAt).toBe(Date.UTC(2026, 2, 5, 10, 30));
    expect(entry.data).toEqual({ note: "x" });
  });

  it("speichert Punkt-Ereignisse mit end = start und ohne date in data", async () => {
    const entry = await saveEntry(undefined, "stress", { date: DATE, level: 2 });
    expect(entry.startAt).toBe(Date.parse(DATE));
    expect(entry.endAt).toBe(entry.startAt);
    expect(entry.data).toEqual({ level: 2 });
  });

  it("lehnt ungueltige Eintraege ab", async () => {
    await expect(saveEntry(undefined, "stress", { level: 2 })).rejects.toThrow("Eintrag ungueltig");
    await expect(saveEntry(undefined, "stress", { date: DATE, level: "x" })).rejects.toThrow("data.level");
  });

  it("blendet weich geloeschte Eintraege in listEntries aus", async () => {
    const entry = await saveEntry(undefined, "training", { date: DATE, activity: "Sitz", dogStars: 3, trainerStars: 3 });
    await deleteEntry(entry.id);

    expect(await listEntries()).toHaveLength(0);
  });

  it("entfernt einen Eintrag lokal und reiht einen Tombstone fuer den Server ein", async () => {
    const entry = await saveEntry(undefined, "stress", { date: DATE, level: 2 });
    await deleteEntry(entry.id);

    expect(await localDb.getEntry(entry.id)).toBeUndefined();
    const queue = await localDb.getQueue();
    expect(queue.entries).toHaveLength(1);
    expect(queue.entries[0]).toMatchObject({ id: entry.id, deleted: true });
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
    await saveEntry(undefined, "food", { food: "Nass", date: DATE });
    await setMyPatience("a@example.com", "2026-09-18", 3);

    expect(await getPendingCount()).toBe(3);
  });
});
