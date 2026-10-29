import { readFile, unlink } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { photos } from "@/db/schema";
import { mimeForFilename, thumbFilename, thumbsDir, uploadsDir } from "@/lib/server/uploads";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [row] = await db.select().from(photos).where(eq(photos.id, id));
  if (!row || row.deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const wantsThumb = request.nextUrl.searchParams.get("size") === "thumb";
  let bytes: Buffer | null = null;
  let mime = mimeForFilename(row.filename);
  if (wantsThumb) {
    bytes = await readFile(path.join(thumbsDir(), thumbFilename(row.id))).catch(() => null);
    if (bytes) mime = "image/jpeg";
  }
  if (!bytes) {
    bytes = await readFile(path.join(uploadsDir(), row.filename)).catch(() => null);
    mime = mimeForFilename(row.filename);
  }
  if (!bytes) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Nur wer ein Foto hochgeladen hat, darf es loeschen.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [row] = await db.select().from(photos).where(eq(photos.id, id));
  if (!row || row.deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (row.uploadedBy !== email) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.update(photos).set({ deleted: 1 }).where(eq(photos.id, id));
  await Promise.all([
    unlink(path.join(uploadsDir(), row.filename)).catch(() => null),
    unlink(path.join(thumbsDir(), thumbFilename(row.id))).catch(() => null),
  ]);

  return NextResponse.json({ ok: true });
}

// Notiz nachtraeglich aendern - wie beim Loeschen nur durch den Uploader.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { note?: unknown } | null;
  if (!body || typeof body.note !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const [row] = await db.select().from(photos).where(eq(photos.id, id));
  if (!row || row.deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (row.uploadedBy !== email) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const note = body.note.trim().slice(0, 500) || null;
  await db.update(photos).set({ note }).where(eq(photos.id, id));
  return NextResponse.json({ note });
}
