// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EntryRecord } from "@/lib/storage/types";

const mockListEntries = vi.fn<() => Promise<EntryRecord[]>>();
const mockSaveEntry = vi.fn();
const mockDeleteEntry = vi.fn();
const mockSetMyPatience = vi.fn();
const mockGetPatience = vi.fn<(userEmail: string, date: string) => Promise<number>>();
const mockGetKv = vi.fn<(key: string) => Promise<string | null>>();
const mockSetKv = vi.fn();
const mockUseSyncStatus = vi.fn();

vi.mock("@/lib/storage", () => ({
  listEntries: () => mockListEntries(),
  saveEntry: (...args: unknown[]) => mockSaveEntry(...args),
  deleteEntry: (...args: unknown[]) => mockDeleteEntry(...args),
  setMyPatience: (...args: unknown[]) => mockSetMyPatience(...args),
  getPatience: (userEmail: string, date: string) => mockGetPatience(userEmail, date),
  getKv: (key: string) => mockGetKv(key),
  setKv: (...args: unknown[]) => mockSetKv(...args),
}));
vi.mock("@/lib/storage/useSyncStatus", () => ({
  useSyncStatus: () => mockUseSyncStatus(),
}));

const syncInfo = (o: object) => ({ status: "synced", pending: 0, lastSyncAt: Date.now(), syncing: false, syncNow: vi.fn(), ...o });

const { default: AppShell } = await import("@/components/app-shell");

function makeEntry(overrides: Partial<EntryRecord>): EntryRecord {
  return { id: "1", type: "food", data: "{}", updatedAt: Date.now(), deleted: 0, ...overrides };
}

beforeEach(() => {
  mockListEntries.mockResolvedValue([]);
  mockGetPatience.mockResolvedValue(0);
  mockGetKv.mockResolvedValue(null);
  mockSetKv.mockResolvedValue(undefined);
  mockSaveEntry.mockResolvedValue(makeEntry({}));
  mockDeleteEntry.mockResolvedValue(undefined);
  mockUseSyncStatus.mockReturnValue(syncInfo({}));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AppShell", () => {
  it("laedt den eigenen Geduld-Wert des angemeldeten Nutzers beim Start", async () => {
    mockGetPatience.mockResolvedValue(3);

    render(<AppShell userEmail="a@example.com" />);

    await waitFor(() => expect(mockGetPatience).toHaveBeenCalledWith("a@example.com", expect.any(String)));
    const rating = screen.getByRole("radiogroup", { name: "Meine Geduld" });
    expect(within(rating).getAllByRole("button", { pressed: true })).toHaveLength(3);
  });

  it("speichert einen neuen Geduld-Wert ueber setMyPatience, nicht als Tagescheck-Feld", async () => {
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);
    await waitFor(() => expect(mockGetPatience).toHaveBeenCalled());

    const rating = screen.getByRole("radiogroup", { name: "Meine Geduld" });
    await user.click(within(rating).getByRole("button", { name: "Meine Geduld: 4" }));

    expect(mockSetMyPatience).toHaveBeenCalledWith("a@example.com", expect.any(String), 4);
    expect(mockSaveEntry).not.toHaveBeenCalled();
  });

  it("speichert Folgsamkeit als gemeinsamen Tagescheck-Eintrag", async () => {
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);
    await waitFor(() => expect(mockListEntries).toHaveBeenCalled());

    const rating = screen.getByRole("radiogroup", { name: "Folgsamkeit" });
    await user.click(within(rating).getByRole("button", { name: "Folgsamkeit: 5" }));

    expect(mockSaveEntry).toHaveBeenCalledWith(
      undefined,
      "tagescheck",
      expect.objectContaining({ folgsamkeit: 5 }),
    );
  });

  it("zeigt einen Hinweistext im Verlauf, wenn noch keine Eintraege vorhanden sind", async () => {
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);
    await waitFor(() => expect(mockListEntries).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Verlauf" }));

    expect(await screen.findByText("Keine Einträge in dieser Kategorie.")).toBeInTheDocument();
  });

  it("stuerzt bei fehlerhaftem JSON in einem Eintrag nicht ab und zeigt einen Fallback-Text", async () => {
    mockListEntries.mockResolvedValue([makeEntry({ id: "broken", type: "food", data: "{not-json" })]);
    const user = userEvent.setup();

    render(<AppShell userEmail="a@example.com" />);
    await waitFor(() => expect(mockListEntries).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Verlauf" }));

    expect((await screen.findAllByText("Eintrag gespeichert")).length).toBeGreaterThan(0);
  });

  it("zeigt den Offline-Status aus useSyncStatus an", async () => {
    mockUseSyncStatus.mockReturnValue(syncInfo({ status: "offline" }));

    render(<AppShell userEmail="a@example.com" />);

    expect(await screen.findByRole("button", { name: /Offline/ })).toBeInTheDocument();
  });

  it("zeigt die Anzahl ausstehender Aenderungen an", async () => {
    mockUseSyncStatus.mockReturnValue(syncInfo({ status: "pending", pending: 2 }));

    render(<AppShell userEmail="a@example.com" />);

    expect(await screen.findByRole("button", { name: /2 ausstehend/ })).toBeInTheDocument();
  });

  it("loest den Sync ueber den Sync-Button aus", async () => {
    const syncNow = vi.fn();
    mockUseSyncStatus.mockReturnValue(syncInfo({ syncNow }));
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);

    await user.click(await screen.findByRole("button", { name: /^Sync/ }));

    expect(syncNow).toHaveBeenCalled();
  });

  it("hat die Navigation Uebungen, Galerie, Verlauf, Auswertung und Tilly-Foto als Home", async () => {
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);
    await waitFor(() => expect(mockListEntries).toHaveBeenCalled());

    for (const name of ["Übungen", "Galerie", "Verlauf", "Auswertung"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: "Verlauf" }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("radiogroup", { name: "Meine Geduld" })).toBeInTheDocument();
  });
  it("bricht beim Klick auf das Tilly-Foto im Eintragsformular ab, ohne zu speichern", async () => {
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);
    await user.click(await screen.findByText("Stuhlgang"));
    expect(screen.queryByRole("radiogroup", { name: "Meine Geduld" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start" }));

    expect(await screen.findByRole("radiogroup", { name: "Meine Geduld" })).toBeInTheDocument();
    expect(mockSaveEntry).not.toHaveBeenCalled();
  });

  it("zeigt die Alleine-Karte ueber den Notizen, solange kein Timer laeuft", async () => {
    render(<AppShell userEmail="a@example.com" />);
    const alone = await screen.findByText("Tilly allein zu Haus");
    const notes = screen.getByText("Notizen");
    expect(alone.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("schiebt die Alleine-Karte bei laufendem Timer ganz nach oben", async () => {
    mockGetKv.mockImplementation(async (key) => (key === "alone-start" ? new Date(Date.now() - 5 * 60_000).toISOString() : null));
    render(<AppShell userEmail="a@example.com" />);
    const stop = await screen.findByRole("button", { name: "Stop" });
    const heute = screen.getByText("Heute");
    expect(stop.compareDocumentPosition(heute) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("speichert beim Stoppen Start, Ende und Dauer und beendet den Timer", async () => {
    const startedAt = new Date(Date.now() - 90 * 60_000).toISOString();
    mockGetKv.mockImplementation(async (key) => (key === "alone-start" ? startedAt : null));
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);

    await user.click(await screen.findByRole("button", { name: "Stop" }));

    await waitFor(() => expect(mockSaveEntry).toHaveBeenCalled());
    const [id, type, data] = mockSaveEntry.mock.calls[0];
    expect(id).toBeUndefined();
    expect(type).toBe("alone");
    expect(data.startedAt).toBe(startedAt);
    expect(data.ms).toBeGreaterThanOrEqual(90 * 60_000);
    expect(data.endedAt).toBe(data.date);
    expect(mockSetKv).toHaveBeenCalledWith("alone-start", "");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument());
  });
});
