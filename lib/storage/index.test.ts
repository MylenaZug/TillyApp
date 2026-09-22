// Storage-Layer laeuft komplett auf idb-keyval; fake-indexeddb (via vitest.setup.ts)
// stellt eine In-Memory-IndexedDB fuer diese Tests bereit.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/sync", () => ({
  runSync: vi.fn(),
  onStorageChange: vi.fn(() => () => {}),
  setupAutoSync: vi.fn(() => () => {}),
  setSyncUser: vi.fn(),
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
import { localDb } from "@/lib/storage/local-db";

beforeEach(async () => {
  await localDb.clearAll();
});

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
    const entry = await saveEntry(undefined, "food", { note: "Napf" });

    expect(entry.id).toBeTruthy();
    const listed = await listEntries();
    expect(listed).toHaveLength(1);
    expect(listed[0].type).toBe("food");
  });

  it("aktualisiert einen bestehenden Eintrag statt ihn zu duplizieren", async () => {
    const first = await saveEntry(undefined, "food", { note: "Napf" });
    await saveEntry(first.id, "food", { note: "Napf, aktualisiert" });

    const listed = await listEntries();
    expect(listed).toHaveLength(1);
    expect(JSON.parse(listed[0].data).note).toBe("Napf, aktualisiert");
  });

  it("blendet weich geloeschte Eintraege in listEntries aus", async () => {
    const entry = await saveEntry(undefined, "training", { activity: "Sitz" });
    await deleteEntry(entry.id);

    expect(await listEntries()).toHaveLength(0);
  });

  it("legt auch fuer eine nie lokal gespeicherte id einen Tombstone an", async () => {
    await deleteEntry("unbekannte-id");

    const map = await localDb.getAllEntries();
    expect(map["unbekannte-id"]).toMatchObject({ deleted: 1, type: "", data: "{}" });
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

  it("haelt die Besitzer-E-Mail auch in der Queue pro Person und Tag getrennt", async () => {
    await setMyPatience("a@example.com", "2026-09-18", 4);
    await setMyPatience("b@example.com", "2026-09-18", 2);

    const queue = await localDb.getQueue();
    expect(queue.dailyPatience).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userEmail: "a@example.com", date: "2026-09-18", geduld: 4 }),
        expect.objectContaining({ userEmail: "b@example.com", date: "2026-09-18", geduld: 2 }),
      ])
    );
  });
});

describe("ausstehende Aenderungen", () => {
  it("zaehlt kv-, Eintrags- und Geduld-Mutationen zusammen", async () => {
    await setKv("tilly:note", "x");
    await saveEntry(undefined, "food", {});
    await setMyPatience("a@example.com", "2026-09-18", 3);

    expect(await getPendingCount()).toBe(3);
  });
});
