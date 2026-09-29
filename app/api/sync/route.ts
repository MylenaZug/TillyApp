import { NextRequest, NextResponse } from "next/server";
import { gt, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { dailyPatience, entries, kvStore } from "@/db/schema";

type KvMutation = { key: string; value: string; updatedAt: number };
type EntryMutation = { id: string; type: string; data: string; updatedAt: number; deleted?: 0 | 1 };
type PatienceMutation = { date: string; geduld: number; updatedAt: number };

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = Number(request.nextUrl.searchParams.get("since") || 0);

  const [kvRows, entryRows, patienceRows] = await Promise.all([
    db.select().from(kvStore).where(gt(kvStore.updatedAt, since)),
    db.select().from(entries).where(gt(entries.updatedAt, since)),
    db.select().from(dailyPatience).where(gt(dailyPatience.updatedAt, since)),
  ]);

  return NextResponse.json({
    serverTime: Date.now(),
    kv: kvRows,
    entries: entryRows,
    dailyPatience: patienceRows,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const kv: KvMutation[] = Array.isArray(body.kv) ? body.kv : [];
  const entryMutations: EntryMutation[] = Array.isArray(body.entries) ? body.entries : [];
  // Geduld gehoert immer dem eingeloggten Account - der Client kann keine fremde E-Mail einschleusen.
  const patience: PatienceMutation[] = Array.isArray(body.dailyPatience) ? body.dailyPatience : [];

  for (const row of kv) {
    await db
      .insert(kvStore)
      .values(row)
      .onConflictDoUpdate({
        target: kvStore.key,
        set: { value: row.value, updatedAt: row.updatedAt },
        where: sql`${kvStore.updatedAt} < ${row.updatedAt}`,
      });
  }

  for (const row of entryMutations) {
    const values = { id: row.id, type: row.type, data: row.data, updatedAt: row.updatedAt, deleted: row.deleted ?? 0 };
    await db
      .insert(entries)
      .values(values)
      .onConflictDoUpdate({
        target: entries.id,
        set: { type: values.type, data: values.data, updatedAt: values.updatedAt, deleted: values.deleted },
        where: sql`${entries.updatedAt} < ${row.updatedAt}`,
      });
  }

  for (const row of patience) {
    await db
      .insert(dailyPatience)
      .values({ userEmail, date: row.date, geduld: row.geduld, updatedAt: row.updatedAt })
      .onConflictDoUpdate({
        target: [dailyPatience.userEmail, dailyPatience.date],
        set: { geduld: row.geduld, updatedAt: row.updatedAt },
        where: sql`${dailyPatience.updatedAt} < ${row.updatedAt}`,
      });
  }

  return NextResponse.json({ serverTime: Date.now() });
}
