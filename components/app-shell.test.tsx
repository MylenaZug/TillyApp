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
  mockUseSyncStatus.mockReturnValue({ status: "synced", pending: 0 });
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
    mockUseSyncStatus.mockReturnValue({ status: "offline", pending: 0 });

    render(<AppShell userEmail="a@example.com" />);

    expect(await screen.findByText("Offline")).toBeInTheDocument();
  });

  it("zeigt die Anzahl ausstehender Aenderungen an", async () => {
    mockUseSyncStatus.mockReturnValue({ status: "pending", pending: 2 });

    render(<AppShell userEmail="a@example.com" />);

    expect(await screen.findByText("2 ausstehend")).toBeInTheDocument();
  });
});
