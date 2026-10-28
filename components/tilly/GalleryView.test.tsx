// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PhotoMeta } from "@/lib/photos/client";

const mockList = vi.fn();
const mockUpload = vi.fn();
const mockDelete = vi.fn();
const mockUpdateNote = vi.fn();
const mockCompress = vi.fn();

vi.mock("@/lib/photos/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/photos/client")>()),
  listPhotos: (...a: unknown[]) => mockList(...a),
  uploadPhoto: (...a: unknown[]) => mockUpload(...a),
  deletePhoto: (...a: unknown[]) => mockDelete(...a),
  updatePhotoNote: (...a: unknown[]) => mockUpdateNote(...a),
  compressImage: (...a: unknown[]) => mockCompress(...a),
}));

const { GalleryView } = await import("@/components/tilly/GalleryView");

let intersect: (isIntersecting: boolean) => void = () => {};

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        intersect = (isIntersecting) => cb([{ isIntersecting }]);
      }
      observe() {}
      disconnect() {}
    },
  );
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  mockCompress.mockImplementation(async (f: File) => f);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const photo = (id: string, createdAt: number, o: Partial<PhotoMeta> = {}): PhotoMeta => ({
  id,
  note: null,
  uploadedBy: "Anna",
  createdAt,
  mine: false,
  ...o,
});
const thumbs = () => Array.from(document.querySelectorAll<HTMLButtonElement>("section button"));
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe("GalleryView", () => {
  it("zeigt einen Hinweis, solange noch keine Fotos vorhanden sind", async () => {
    mockList.mockResolvedValue({ photos: [], hasMore: false });
    render(<GalleryView />);
    expect(await screen.findByText(/Noch keine Fotos/)).toBeInTheDocument();
  });

  it("zeigt eine Fehlermeldung, wenn das Laden scheitert", async () => {
    mockList.mockRejectedValue(new Error("offline"));
    render(<GalleryView />);
    expect(await screen.findByText(/Fotos konnten nicht geladen werden/)).toBeInTheDocument();
  });

  it("gruppiert nach Monat in der gelieferten Reihenfolge (neueste zuerst)", async () => {
    mockList.mockResolvedValue({
      photos: [photo("a", at(2026, 3, 5)), photo("b", at(2026, 3, 1)), photo("c", at(2026, 2, 20))],
      hasMore: false,
    });
    render(<GalleryView />);
    const march = await screen.findByText("März 2026");
    const feb = screen.getByText("Februar 2026");
    expect(march.compareDocumentPosition(feb) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(march.closest("section")!).getAllByRole("button")).toHaveLength(2);
    expect(within(feb.closest("section")!).getAllByRole("button")).toHaveLength(1);
  });

  it("laedt beim Scrollen die naechste Seite nach, ohne Duplikate", async () => {
    mockList
      .mockResolvedValueOnce({ photos: [photo("a", at(2026, 3, 5)), photo("b", at(2026, 3, 1))], hasMore: true })
      .mockResolvedValueOnce({ photos: [photo("b", at(2026, 3, 1)), photo("c", at(2026, 2, 20))], hasMore: false });
    render(<GalleryView />);
    await screen.findByText("März 2026");

    intersect(true);

    await screen.findByText("Februar 2026");
    expect(mockList).toHaveBeenLastCalledWith(at(2026, 3, 1));
    expect(thumbs()).toHaveLength(3);
  });

  it("laedt nicht nach, wenn der Marker nicht sichtbar ist", async () => {
    mockList.mockResolvedValue({ photos: [photo("a", at(2026, 3, 5))], hasMore: true });
    render(<GalleryView />);
    await screen.findByText("März 2026");
    intersect(false);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("zeigt Uploader und erlaubt Loeschen und Notiz nur bei eigenen Fotos", async () => {
    mockList.mockResolvedValue({
      photos: [photo("fremd", at(2026, 3, 5), { note: "von Anna" }), photo("mein", at(2026, 3, 4), { mine: true, uploadedBy: "Ich" })],
      hasMore: false,
    });
    const user = userEvent.setup();
    render(<GalleryView />);
    await screen.findByText("März 2026");

    await user.click(thumbs()[0]);
    expect(screen.getByText("Hochgeladen von Anna")).toBeInTheDocument();
    expect(screen.queryByText("Löschen")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notiz bearbeiten" })).not.toBeInTheDocument();

    await user.click(screen.getByText("Hochgeladen von Anna").closest("div[class*='absolute']")!);
    await user.click(thumbs()[1]);
    expect(screen.getByText("Hochgeladen von Ich")).toBeInTheDocument();
    expect(screen.getByText("Löschen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notiz bearbeiten" })).toBeInTheDocument();
  });

  it("aendert die Notiz nachtraeglich", async () => {
    mockList.mockResolvedValue({ photos: [photo("mein", at(2026, 3, 4), { mine: true, note: "alt" })], hasMore: false });
    mockUpdateNote.mockResolvedValue("neu");
    const user = userEvent.setup();
    render(<GalleryView />);
    await screen.findByText("März 2026");
    await user.click(thumbs()[0]);
    await user.click(screen.getByRole("button", { name: "Notiz bearbeiten" }));
    const field = screen.getByPlaceholderText("Notiz…");
    await user.clear(field);
    await user.type(field, "neu");
    await user.click(screen.getByRole("button", { name: /Speichern/ }));

    await waitFor(() => expect(mockUpdateNote).toHaveBeenCalledWith("mein", "neu"));
    expect(await screen.findAllByText("neu")).toHaveLength(2);
  });

  it("loescht ein eigenes Foto sofort aus der Liste", async () => {
    mockList.mockResolvedValue({ photos: [photo("mein", at(2026, 3, 4), { mine: true })], hasMore: false });
    mockDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<GalleryView />);
    await screen.findByText("März 2026");
    await user.click(thumbs()[0]);
    await user.click(screen.getByText("Löschen"));

    expect(mockDelete).toHaveBeenCalledWith("mein");
    await waitFor(() => expect(thumbs()).toHaveLength(0));
  });

  it("laedt die Liste neu und zeigt einen Fehler, wenn das Loeschen scheitert", async () => {
    mockList.mockResolvedValue({ photos: [photo("mein", at(2026, 3, 4), { mine: true })], hasMore: false });
    mockDelete.mockRejectedValue(new Error("x"));
    const user = userEvent.setup();
    render(<GalleryView />);
    await screen.findByText("März 2026");
    await user.click(thumbs()[0]);
    await user.click(screen.getByText("Löschen"));

    expect(await screen.findByText("Löschen fehlgeschlagen.")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(thumbs()).toHaveLength(1));
  });

  describe("Upload", () => {
    const select = (file: File) => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
    };

    it("laedt ein ausgewaehltes Foto mit Notiz hoch und aktualisiert die Liste", async () => {
      mockList.mockResolvedValue({ photos: [], hasMore: false });
      mockUpload.mockResolvedValue(photo("neu", Date.now()));
      const user = userEvent.setup();
      render(<GalleryView />);
      await screen.findByText(/Noch keine Fotos/);

      select(new File(["x"], "a.jpg", { type: "image/jpeg" }));
      await user.type(await screen.findByPlaceholderText("Notiz (optional)…"), "Pfote");
      await user.click(screen.getByRole("button", { name: "Hochladen" }));

      await waitFor(() => expect(mockUpload).toHaveBeenCalled());
      expect(mockUpload.mock.calls[0][1]).toBe("Pfote");
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
      expect(screen.queryByText("Foto hochladen")).not.toBeInTheDocument();
    });

    it("lehnt Fotos ueber 5 MB schon im Browser ab", async () => {
      mockList.mockResolvedValue({ photos: [], hasMore: false });
      mockCompress.mockResolvedValue(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]));
      render(<GalleryView />);
      await screen.findByText(/Noch keine Fotos/);

      select(new File(["x"], "gross.jpg", { type: "image/jpeg" }));

      expect(await screen.findByText("Das Foto ist größer als 5 MB.")).toBeInTheDocument();
      expect(screen.queryByText("Foto hochladen")).not.toBeInTheDocument();
    });

    it("zeigt den Serverfehler und behaelt das Foto zum erneuten Versuch", async () => {
      mockList.mockResolvedValue({ photos: [], hasMore: false });
      mockUpload.mockRejectedValue(new Error("Bitte erneut anmelden"));
      const user = userEvent.setup();
      render(<GalleryView />);
      await screen.findByText(/Noch keine Fotos/);

      select(new File(["x"], "a.jpg", { type: "image/jpeg" }));
      await user.click(await screen.findByRole("button", { name: "Hochladen" }));

      expect(await screen.findByText("Bitte erneut anmelden")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hochladen" })).toBeEnabled();
    });
  });
});
