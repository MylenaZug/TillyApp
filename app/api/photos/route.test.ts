// @vitest-environment node
//
// Testet die Foto-Routen gegen In-Memory-SQLite und ein temporaeres Upload-Verzeichnis,
// mit gemocktem Auth-Modul.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdtempSync, readdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import * as schema from "@/db/schema";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const uploads = mkdtempSync(path.join(tmpdir(), "tilly-uploads-"));
process.env.UPLOADS_DIR = uploads;
process.env.USER_DISPLAY_NAMES = JSON.stringify({ "a@example.com": "Anna" });

const sqlite = new Database(":memory:");
sqlite.exec(`
  CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    note TEXT,
    uploaded_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  );
`);
vi.mock("@/db/client", () => ({ db: drizzle(sqlite, { schema }) }));

const { GET, POST } = await import("@/app/api/photos/route");
const { GET: GET_ONE, DELETE, PATCH } = await import("@/app/api/photos/[id]/route");

async function png() {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: "#c0392b" } }).png().toBuffer();
}

function uploadRequest(bytes: Buffer | Uint8Array, type: string) {
  const form = new FormData();
  form.append("photo", new File([new Uint8Array(bytes)], "x", { type }));
  form.append("note", "hallo");
  return new NextRequest("http://localhost/api/photos", { method: "POST", body: form });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  sqlite.exec("DELETE FROM photos");
  mockAuth.mockReset();
});
afterAll(() => rmSync(uploads, { recursive: true, force: true }));

describe("/api/photos", () => {
  it("lehnt nicht angemeldete Anfragen ab", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await GET(new NextRequest("http://localhost/api/photos"))).status).toBe(401);
    expect((await POST(uploadRequest(await png(), "image/png"))).status).toBe(401);
    expect((await GET_ONE(new NextRequest("http://localhost/api/photos/x"), ctx("x"))).status).toBe(401);
    expect((await DELETE(new Request("http://localhost"), ctx("x"))).status).toBe(401);
  });

  it("speichert Foto samt Thumbnail, Uploader und Zeitstempel", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });
    const before = Date.now();

    const res = await POST(uploadRequest(await png(), "image/png"));
    const { photo } = await res.json();

    expect(res.status).toBe(200);
    expect(photo.uploadedBy).toBe("Anna");
    expect(photo.mine).toBe(true);
    expect(photo.createdAt).toBeGreaterThanOrEqual(before);
    expect(JSON.stringify(photo)).not.toContain("a@example.com");
    expect(readdirSync(path.join(uploads, "thumbs"))).toEqual([`${photo.id}.jpg`]);

    const thumb = await GET_ONE(new NextRequest(`http://localhost/api/photos/${photo.id}?size=thumb`), ctx(photo.id));
    expect(thumb.headers.get("content-type")).toBe("image/jpeg");
    const meta = await sharp(Buffer.from(await thumb.arrayBuffer())).metadata();
    expect(meta.width).toBe(400);

    const full = await GET_ONE(new NextRequest(`http://localhost/api/photos/${photo.id}`), ctx(photo.id));
    expect(full.headers.get("content-type")).toBe("image/png");
  });

  it("lehnt Nicht-Bild-MIME-Typen, getarnte Dateien und zu grosse Dateien ab", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });

    expect((await POST(uploadRequest(Buffer.from("hi"), "text/plain"))).status).toBe(415);
    expect((await POST(uploadRequest(Buffer.from("<svg/>"), "image/svg+xml"))).status).toBe(415);
    expect((await POST(uploadRequest(Buffer.from("not an image"), "image/png"))).status).toBe(415);
    expect((await POST(uploadRequest(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png"))).status).toBe(413);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM photos").get()).toEqual({ n: 0 });
  });

  it("erlaubt das Loeschen nur dem Uploader", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });
    const { photo } = await (await POST(uploadRequest(await png(), "image/png"))).json();

    mockAuth.mockResolvedValue({ user: { email: "b@example.com" } });
    expect((await DELETE(new Request("http://localhost"), ctx(photo.id))).status).toBe(403);
    const list = await (await GET(new NextRequest("http://localhost/api/photos"))).json();
    expect(list.photos[0].mine).toBe(false);

    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });
    expect((await DELETE(new Request("http://localhost"), ctx(photo.id))).status).toBe(200);
    expect((await (await GET(new NextRequest("http://localhost/api/photos"))).json()).photos).toHaveLength(0);
  });

  it("erlaubt Notiz-Aenderungen nur dem Uploader", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });
    const { photo } = await (await POST(uploadRequest(await png(), "image/png"))).json();
    const patch = (note: unknown) =>
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ note }), headers: { "Content-Type": "application/json" } });

    const ok = await PATCH(patch("  neu  "), ctx(photo.id));
    expect(await ok.json()).toEqual({ note: "neu" });
    expect((await PATCH(patch(42), ctx(photo.id))).status).toBe(400);

    mockAuth.mockResolvedValue({ user: { email: "b@example.com" } });
    expect((await PATCH(patch("x"), ctx(photo.id))).status).toBe(403);
  });

  it("liefert Fotos seitenweise, neueste zuerst", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });
    const insert = sqlite.prepare("INSERT INTO photos VALUES (?, ?, NULL, 'a@example.com', ?, 0)");
    for (let i = 1; i <= 50; i++) insert.run(`id${i}`, `id${i}.png`, i * 1000);

    const first = await (await GET(new NextRequest("http://localhost/api/photos"))).json();
    expect(first.photos).toHaveLength(48);
    expect(first.photos[0].id).toBe("id50");
    expect(first.hasMore).toBe(true);

    const last = first.photos[first.photos.length - 1].createdAt;
    const second = await (await GET(new NextRequest(`http://localhost/api/photos?before=${last}`))).json();
    expect(second.photos.map((p: { id: string }) => p.id)).toEqual(["id2", "id1"]);
    expect(second.hasMore).toBe(false);
  });
});
