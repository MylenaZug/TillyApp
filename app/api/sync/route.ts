import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, gte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { dailyPatience, entries, kvStore } from "@/db/schema";
import { checkProtocol, currentSeq, earliestEntryAt, nextSeq, toWireEntry } from "@/lib/server/sync";
import { displayNameFor } from "@/lib/server/uploads";
import {
  SYNC_PROTOCOL_VERSION,
  SYNC_WINDOW_DAYS,
  pushEntrySchema,
  pushKvSchema,
  pushPatienceSchema,
  type RejectedItem,
  type SyncPullResponse,
  type SyncPushResponse,
} from "@/lib/tilly/protocol";
import { parseEntry } from "@/lib/tilly/schemas";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ohne `token`: Eintraege der letzten SYNC_WINDOW_DAYS Tage plus alle Einstellungen.
 * Mit `token`: nur Aenderungen mit hoeherer server_seq (inkl. Loeschungen, unabhaengig vom Datum).
 * Ein Token, das der Server nicht kennt (z.B. nach einem Backup-Restore), fuehrt zu 409.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const outdated = checkProtocol(request);
  if (outdated) return outdated;

  const tokenParam = request.nextUrl.searchParams.get("token");
  const seq = currentSeq();
  let since: number | null = null;
  if (tokenParam !== null) {
    since = Number(tokenParam);
    if (!Number.isInteger(since) || since < 0 || since > seq) {
      return NextResponse.json({ error: "resync" }, { status: 409 });
    }
  }

  const windowStart = since === null ? Date.now() - SYNC_WINDOW_DAYS * DAY_MS : null;
  const entryRows =
    since === null
      ? db
          .select()
          .from(entries)
          .where(and(eq(entries.deleted, 0), gte(entries.endAt, windowStart!)))
          .all()
      : db.select().from(entries).where(gt(entries.serverSeq, since)).all();
  const kvRows = since === null ? db.select().from(kvStore).all() : db.select().from(kvStore).where(gt(kvStore.serverSeq, since)).all();
  const patienceRows =
    since === null
      ? db.select().from(dailyPatience).all()
      : db.select().from(dailyPatience).where(gt(dailyPatience.serverSeq, since)).all();

  const body: SyncPullResponse = {
    protocol: SYNC_PROTOCOL_VERSION,
    token: seq,
    full: since === null,
    windowStart,
    earliestAt: since === null ? earliestEntryAt() : null,
    kv: kvRows,
    entries: entryRows.map(toWireEntry),
    dailyPatience: patienceRows.map((r) => ({ ...r, userName: displayNameFor(r.userEmail) })),
  };
  return NextResponse.json(body);
}

/**
 * Nimmt Aenderungen des Clients an (last push wins). updated_at und server_seq vergibt der
 * Server beim Schreiben. Ungueltige Elemente werden einzeln in `rejected` gemeldet, die
 * uebrigen trotzdem gespeichert.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const outdated = checkProtocol(request);
  if (outdated) return outdated;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
  const rejected: RejectedItem[] = [];
  const idOf = (item: unknown, field: string) => {
    const value = (item as Record<string, unknown> | null)?.[field];
    return typeof value === "string" ? value : "?";
  };

  db.transaction((tx) => {
    for (const item of list(body.kv)) {
      const parsed = pushKvSchema.safeParse(item);
      if (!parsed.success) {
        rejected.push({ kind: "kv", id: idOf(item, "key"), error: parsed.error.message });
        continue;
      }
      // Unveraenderte Werte (Wiederholung, Doppelsendung) vergeben keine neue Sync-Nummer.
      if (tx.select().from(kvStore).where(eq(kvStore.key, parsed.data.key)).get()?.value === parsed.data.value) continue;
      const values = { ...parsed.data, updatedAt: Date.now(), serverSeq: nextSeq(tx) };
      tx.insert(kvStore)
        .values(values)
        .onConflictDoUpdate({ target: kvStore.key, set: { value: values.value, updatedAt: values.updatedAt, serverSeq: values.serverSeq } })
        .run();
    }

    for (const item of list(body.entries)) {
      const shape = pushEntrySchema.safeParse(item);
      if (!shape.success) {
        rejected.push({ kind: "entry", id: idOf(item, "id"), error: shape.error.message });
        continue;
      }
      const { id, type, startAt, endAt, data, deleted } = shape.data;
      const parsed = parseEntry({ type, startAt, endAt, data });
      if (!parsed.ok) {
        rejected.push({ kind: "entry", id, error: parsed.error });
        continue;
      }
      const dataJson = JSON.stringify(parsed.data);
      const existing = tx.select().from(entries).where(eq(entries.id, id)).get();
      if (
        existing &&
        existing.type === type &&
        existing.data === dataJson &&
        existing.startAt === parsed.startAt &&
        existing.endAt === parsed.endAt &&
        existing.deleted === (deleted ? 1 : 0)
      ) {
        continue;
      }
      const values = {
        id,
        type,
        data: dataJson,
        startAt: parsed.startAt,
        endAt: parsed.endAt,
        updatedAt: Date.now(),
        serverSeq: nextSeq(tx),
        deleted: deleted ? 1 : 0,
      };
      const { id: _id, ...set } = values;
      tx.insert(entries).values(values).onConflictDoUpdate({ target: entries.id, set }).run();
    }

    // Geduld gehoert immer dem eingeloggten Account - der Client kann keine fremde E-Mail einschleusen.
    for (const item of list(body.dailyPatience)) {
      const parsed = pushPatienceSchema.safeParse(item);
      if (!parsed.success) {
        rejected.push({ kind: "dailyPatience", id: idOf(item, "date"), error: parsed.error.message });
        continue;
      }
      const existing = tx
        .select()
        .from(dailyPatience)
        .where(and(eq(dailyPatience.userEmail, userEmail), eq(dailyPatience.date, parsed.data.date)))
        .get();
      if (existing?.geduld === parsed.data.geduld) continue;
      const values = { userEmail, ...parsed.data, updatedAt: Date.now(), serverSeq: nextSeq(tx) };
      tx.insert(dailyPatience)
        .values(values)
        .onConflictDoUpdate({
          target: [dailyPatience.userEmail, dailyPatience.date],
          set: { geduld: values.geduld, updatedAt: values.updatedAt, serverSeq: values.serverSeq },
        })
        .run();
    }
  });

  const response: SyncPushResponse = { protocol: SYNC_PROTOCOL_VERSION, token: currentSeq(), rejected };
  return NextResponse.json(response);
}
