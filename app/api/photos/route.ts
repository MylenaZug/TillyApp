import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { photos } from "@/db/schema";
import { ensureUploadsDir, extForMime } from "@/lib/server/uploads";

const MAX_BYTES = 20 * 1024 * 1024;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db.select().from(photos).where(eq(photos.deleted, 0)).orderBy(desc(photos.createdAt));
  return NextResponse.json({ photos: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const note = typeof form.get("note") === "string" ? String(form.get("note")).slice(0, 500) : "";

  const dir = await ensureUploadsDir();
  const id = randomUUID();
  const filename = `${id}.${extForMime(file.type)}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const row = { id, filename, note: note || null, uploadedBy: userEmail, createdAt: Date.now(), deleted: 0 };
  await db.insert(photos).values(row);

  return NextResponse.json({ photo: row });
}
