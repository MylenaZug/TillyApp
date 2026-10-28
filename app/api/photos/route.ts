import { unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";
import sharp from "sharp";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { photos } from "@/db/schema";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  THUMB_SIZE,
  displayNameFor,
  ensureUploadsDirs,
  extForFormat,
  thumbFilename,
  thumbsDir,
} from "@/lib/server/uploads";

export const runtime = "nodejs";

type PhotoRow = typeof photos.$inferSelect;

// Die E-Mail-Adresse des Uploaders geht nicht an den Client, nur der Anzeigename.
function toClient(row: PhotoRow, currentEmail: string) {
  return {
    id: row.id,
    note: row.note,
    uploadedBy: displayNameFor(row.uploadedBy),
    createdAt: row.createdAt,
    mine: row.uploadedBy === currentEmail,
  };
}

const PAGE_SIZE = 48;

// Cursor-Paginierung ueber created_at: ?before=<ms> liefert die naechsten aelteren Fotos.
export async function GET(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const before = Number(request.nextUrl.searchParams.get("before"));
  const where = Number.isFinite(before) && before > 0 ? and(eq(photos.deleted, 0), lt(photos.createdAt, before)) : eq(photos.deleted, 0);
  const rows = await db
    .select()
    .from(photos)
    .where(where)
    .orderBy(desc(photos.createdAt))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  return NextResponse.json({ photos: rows.slice(0, PAGE_SIZE).map((r) => toClient(r, email)), hasMore });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_UPLOAD_BYTES + 100 * 1024) {
    return NextResponse.json({ error: "file too large (max 5 MB)" }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "unsupported type" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "file too large (max 5 MB)" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Der Dateiinhalt wird tatsaechlich dekodiert: ein umbenanntes Nicht-Bild scheitert hier.
  let ext: string | undefined;
  let thumb: Buffer;
  try {
    ext = extForFormat((await sharp(bytes).metadata()).format);
    thumb = await sharp(bytes, { failOn: "error" })
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "invalid image" }, { status: 415 });
  }
  if (!ext) {
    return NextResponse.json({ error: "unsupported type" }, { status: 415 });
  }

  const note = typeof form.get("note") === "string" ? String(form.get("note")).slice(0, 500) : "";

  const dir = await ensureUploadsDirs();
  const id = randomUUID();
  const filename = `${id}.${ext}`;
  const thumbPath = path.join(thumbsDir(), thumbFilename(id));
  const filePath = path.join(dir, filename);

  try {
    await writeFile(filePath, bytes);
    await writeFile(thumbPath, thumb);
    const row = { id, filename, note: note || null, uploadedBy: userEmail, createdAt: Date.now(), deleted: 0 };
    await db.insert(photos).values(row);
    return NextResponse.json({ photo: toClient(row, userEmail) });
  } catch {
    await Promise.all([unlink(filePath).catch(() => null), unlink(thumbPath).catch(() => null)]);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}
