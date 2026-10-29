// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncButton, syncColor } from "@/components/tilly/SyncButton";

const NOW = 1_000_000_000;
const MIN = 60_000;

describe("syncColor", () => {
  it("ist direkt nach dem Sync gruen", () => {
    expect(syncColor("synced", NOW, NOW)).toBe("rgb(46, 139, 87)");
  });

  it("geht stufenlos nach Orange und liegt nach 2,5 Minuten in der Mitte", () => {
    expect(syncColor("synced", NOW - 2.5 * MIN, NOW)).toBe("rgb(138, 133, 61)");
  });

  it("ist nach 5 Minuten und danach dauerhaft orange", () => {
    expect(syncColor("synced", NOW - 5 * MIN, NOW)).toBe("rgb(230, 126, 34)");
    expect(syncColor("synced", NOW - 60 * MIN, NOW)).toBe("rgb(230, 126, 34)");
  });

  it("ist orange, solange noch nie synchronisiert wurde", () => {
    expect(syncColor("synced", null, NOW)).toBe("rgb(230, 126, 34)");
  });

  it("faellt bei einer Uhr in der Zukunft nicht aus dem Farbverlauf", () => {
    expect(syncColor("synced", NOW + MIN, NOW)).toBe("rgb(46, 139, 87)");
  });

  it("ist offline immer blau, egal wie frisch der letzte Sync war", () => {
    expect(syncColor("offline", NOW, NOW)).toBe("rgb(52, 87, 213)");
    expect(syncColor("offline", null, NOW)).toBe("rgb(52, 87, 213)");
  });
});

describe("SyncButton", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const base = { status: "synced" as const, pending: 0, lastSyncAt: Date.now(), syncing: false, outdated: false, dataVersion: 0, rejected: {}, syncNow: vi.fn(), userEmail: "a@example.com" };

  it("beschreibt den Zustand fuer Screenreader", () => {
    let { rerender, unmount } = render(<SyncButton {...base} />);
    expect(screen.getByRole("button", { name: "Sync – Zuletzt synchronisiert: gerade eben" })).toBeInTheDocument();

    unmount();
    ({ rerender, unmount } = render(<SyncButton {...base} lastSyncAt={Date.now() - 3 * MIN} pending={2} />));
    expect(screen.getByRole("button", { name: /vor 3 Min, 2 ausstehend/ })).toBeInTheDocument();

    rerender(<SyncButton {...base} lastSyncAt={null} />);
    expect(screen.getByRole("button", { name: /Noch nicht synchronisiert/ })).toBeInTheDocument();

    rerender(<SyncButton {...base} status="offline" />);
    expect(screen.getByRole("button", { name: "Sync – Offline" })).toBeInTheDocument();
  });

  it("loest bei Klick syncNow aus", async () => {
    const syncNow = vi.fn();
    render(<SyncButton {...base} syncNow={syncNow} />);
    await userEvent.click(screen.getByRole("button"));
    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it("aktualisiert die Farbe mit der Zeit ohne neuen Sync", async () => {
    vi.useFakeTimers();
    const { act } = await import("@testing-library/react");
    const lastSyncAt = Date.now();
    render(<SyncButton {...base} lastSyncAt={lastSyncAt} />);
    const button = screen.getByRole("button");
    expect(button.style.backgroundColor).toBe("rgb(46, 139, 87)");

    act(() => {
      vi.advanceTimersByTime(6 * MIN);
    });
    expect(button.style.backgroundColor).toBe("rgb(230, 126, 34)");
  });
});
