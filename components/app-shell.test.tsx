// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EntryRecord } from "@/lib/storage/types";

const mockListEntries = vi.fn<() => Promise<EntryRecord[]>>();
const mockSaveEntry = vi.fn();
const mockSetMyPatience = vi.fn();
const mockGetPatience = vi.fn<(userEmail: string, date: string) => Promise<number>>();
const mockUseSyncStatus = vi.fn();

vi.mock("@/lib/storage", () => ({
  listEntries: () => mockListEntries(),
  saveEntry: (...args: unknown[]) => mockSaveEntry(...args),
  setMyPatience: (...args: unknown[]) => mockSetMyPatience(...args),
  getPatience: (userEmail: string, date: string) => mockGetPatience(userEmail, date),
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
  mockSaveEntry.mockResolvedValue(makeEntry({}));
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

  it("zeigt einen Hinweistext, wenn noch keine Eintraege vorhanden sind", async () => {
    render(<AppShell userEmail="a@example.com" />);

    expect(await screen.findByText("Noch keine Einträge.")).toBeInTheDocument();
  });

  it("stuerzt bei fehlerhaftem JSON in einem Eintrag nicht ab", async () => {
    mockListEntries.mockResolvedValue([makeEntry({ id: "broken", type: "food", data: "{not-json" })]);

    render(<AppShell userEmail="a@example.com" />);

    expect(await screen.findByText("Eintrag gespeichert")).toBeInTheDocument();
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
