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
const mockListPatience = vi.fn<() => Promise<unknown[]>>();

vi.mock("@/lib/storage", () => ({
  listEntries: () => mockListEntries(),
  saveEntry: (...args: unknown[]) => mockSaveEntry(...args),
  deleteEntry: (...args: unknown[]) => mockDeleteEntry(...args),
  setMyPatience: (...args: unknown[]) => mockSetMyPatience(...args),
  listPatience: () => mockListPatience(),
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
  mockListPatience.mockResolvedValue([]);
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

  it("stuerzt bei fehlerhaftem JSON in einem Eintrag nicht ab und zeigt keinen Platzhalter-Text", async () => {
    mockListEntries.mockResolvedValue([makeEntry({ id: "broken", type: "food", data: "{not-json" })]);
    const user = userEvent.setup();

    render(<AppShell userEmail="a@example.com" />);
    await waitFor(() => expect(mockListEntries).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Verlauf" }));

    // Filter-Chip + Zeile in der Timeline
    expect((await screen.findAllByText("Futter")).length).toBeGreaterThan(1);
    expect(screen.queryByText("Eintrag gespeichert")).not.toBeInTheDocument();
  });

  it("zeigt den Offline-Status aus useSyncStatus an", async () => {
    mockUseSyncStatus.mockReturnValue(syncInfo({ status: "offline" }));

    render(<AppShell userEmail="a@example.com" />);

    expect(await screen.findByRole("button", { name: /Offline/ })).toBeInTheDocument();
    expect(await screen.findByTitle("a@example.com · Sync – Offline")).toBeInTheDocument();
  });

  it("zeigt die Anzahl ausstehender Aenderungen an", async () => {
    mockUseSyncStatus.mockReturnValue(syncInfo({ status: "pending", pending: 2 }));

    render(<AppShell userEmail="a@example.com" />);

    expect(await screen.findByRole("button", { name: /2 ausstehend/ })).toBeInTheDocument();
    expect(await screen.findByTitle(/a@example.com · Sync – .*2 ausstehend/)).toBeInTheDocument();
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

  it("speichert beim Stoppen nur Start und Ende und beendet den Timer", async () => {
    const startedAt = new Date(Date.now() - 90 * 60_000).toISOString();
    mockGetKv.mockImplementation(async (key) => (key === "alone-start" ? startedAt : null));
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);

    await user.click(await screen.findByRole("button", { name: "Stop" }));

    await waitFor(() => expect(mockSaveEntry).toHaveBeenCalled());
    const [id, type, data] = mockSaveEntry.mock.calls[0];
    expect(id).toBeUndefined();
    expect(type).toBe("alone");
    expect(data.startDatetime).toBe(new Date(Math.round(new Date(startedAt).getTime() / 60_000) * 60_000).toISOString());
    expect(data).not.toHaveProperty("date");
    expect(data).not.toHaveProperty("ms");
    expect(new Date(data.endDatetime).getTime() - new Date(data.startDatetime).getTime()).toBe(90 * 60_000);
    expect(mockSetKv).toHaveBeenCalledWith("alone-start", "");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument());
  });

  it("loescht einen Timer unter einer Minute ohne einen Eintrag zu speichern", async () => {
    mockGetKv.mockImplementation(async (key) => (key === "alone-start" ? new Date(Date.now() - 30_000).toISOString() : null));
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);

    await user.click(await screen.findByRole("button", { name: "Stop" }));

    expect(mockSaveEntry).not.toHaveBeenCalled();
    expect(await screen.findByText("Unter 1 Minute nicht gespeichert")).toBeInTheDocument();
    expect(mockSetKv).toHaveBeenCalledWith("alone-start", "");
  });

  it("zeigt die Geduld der anderen eingeklappt und klappt sie auf Wunsch mit Namen auf", async () => {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    mockListPatience.mockResolvedValue([
      { userEmail: "a@example.com", userName: "Anna", date, geduld: 2, updatedAt: 1 },
      { userEmail: "b@example.com", userName: "Ben", date, geduld: 4, updatedAt: 1 },
    ]);
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);

    const toggle = await screen.findByRole("button", { name: "Geduld der anderen" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Ben")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByText("Ben")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4 von 5" })).toBeInTheDocument();
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
  });

  it("zeigt im Verlauf die Geduld mit dem Namen der jeweiligen Person", async () => {
    mockListPatience.mockResolvedValue([
      { userEmail: "a@example.com", userName: "Anna", date: "2026-03-05", geduld: 3, updatedAt: 1 },
      { userEmail: "b@example.com", date: "2026-03-05", geduld: 5, updatedAt: 1 },
    ]);
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);
    await user.click(await screen.findByRole("button", { name: "Verlauf" }));

    expect(await screen.findByText("Geduld · Anna")).toBeInTheDocument();
    expect(screen.getByText("Geduld · b")).toBeInTheDocument();
  });

  it("laedt die Geduld nach einem Sync neu", async () => {
    mockUseSyncStatus.mockReturnValue(syncInfo({ lastSyncAt: 1000 }));
    render(<AppShell userEmail="a@example.com" />);
    await waitFor(() => expect(mockListPatience.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("zeigt fuer andere Nutzer ohne Eintrag heute 0 von 5", async () => {
    mockListPatience.mockResolvedValue([{ userEmail: "b@example.com", userName: "Ben", date: "2020-01-01", geduld: 4, updatedAt: 1 }]);
    const user = userEvent.setup();
    render(<AppShell userEmail="a@example.com" />);

    await user.click(await screen.findByRole("button", { name: "Geduld der anderen" }));

  expect(screen.getByText("Ben")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "0 von 5" })).toBeInTheDocument();
});
});
