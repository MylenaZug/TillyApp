import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { entries, syncState } from "@/db/schema";
import { SYNC_PROTOCOL_HEADER, SYNC_PROTOCOL_VERSION, type WireEntry } from "@/lib/tilly/protocol";

/** Liefert 426, wenn der Client eine andere Protokollversion spricht (oder keine sendet). */
export function checkProtocol(request: Request): NextResponse | null {
  if (request.headers.get(SYNC_PROTOCOL_HEADER) === String(SYNC_PROTOCOL_VERSION)) return null;
  return NextResponse.json(
    { error: "client_outdated", required: SYNC_PROTOCOL_VERSION },
    { status: 426 }
  );
}

/** Start des aeltesten (nicht geloeschten) Eintrags; null, wenn es keine gibt. */
export function earliestEntryAt(): number | null {
  const row = db.select({ at: sql<number | null>`min(${entries.startAt})` }).from(entries).where(eq(entries.deleted, 0)).get();
  return row?.at ?? null;
}

export function currentSeq(): number {
  return db.select().from(syncState).where(eq(syncState.id, 1)).get()?.seq ?? 0;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Vergibt die naechste Sync-Nummer; muss innerhalb einer Transaktion aufgerufen werden. */
export function nextSeq(tx: Tx): number {
  tx.insert(syncState).values({ id: 1, seq: 0 }).onConflictDoNothing().run();
  const row = tx
    .update(syncState)
    .set({ seq: sql`${syncState.seq} + 1` })
    .where(eq(syncState.id, 1))
    .returning()
    .get();
  return row.seq;
}

export function toWireEntry(row: typeof entries.$inferSelect): WireEntry {
  return {
    id: row.id,
    type: row.type,
    data: JSON.parse(row.data),
    startAt: row.startAt,
    endAt: row.endAt,
    updatedAt: row.updatedAt,
    serverSeq: row.serverSeq,
    deleted: row.deleted === 1,
  };
}
