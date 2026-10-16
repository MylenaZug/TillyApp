import { readFile, unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { photos } from "@/db/schema";
import { mimeForFilename, uploadsDir } from "@/lib/server/uploads";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [row] = await db.select().from(photos).where(eq(photos.id, id));
  if (!row || row.deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const bytes = await readFile(path.join(uploadsDir(), row.filename)).catch(() => null);
  if (!bytes) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mimeForFilename(row.filename),
      "Cache-Control": "private, max-age=86400",
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [row] = await db.select().from(photos).where(eq(photos.id, id));
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await unlink(path.join(uploadsDir(), row.filename)).catch(() => null);
  await db.delete(photos).where(eq(photos.id, id));

  return NextResponse.json({ ok: true });
}
