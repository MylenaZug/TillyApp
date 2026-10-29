import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { entries } from "@/db/schema";
import { checkProtocol, toWireEntry } from "@/lib/server/sync";
import { MAX_ENTRIES_PER_RANGE_REQUEST } from "@/lib/tilly/protocol";
import { categoryIdSchema } from "@/lib/tilly/schemas";

export const runtime = "nodejs";

/**
 * Laedt Eintraege, die den Zeitraum [from, to) beruehren (Epoch-ms), z.B. beim Zurueckblaettern
 * im Verlauf. Optional `type` begrenzt auf einen Eintragstyp (z.B. alle Trainings fuer die Uebungen). Geloeschte Eintraege werden nicht geliefert. `truncated` zeigt an, dass das
 * Limit erreicht wurde - der Client sollte dann einen kleineren Zeitraum anfragen.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const outdated = checkProtocol(request);
  if (outdated) return outdated;

  const from = Number(request.nextUrl.searchParams.get("from"));
  const to = Number(request.nextUrl.searchParams.get("to"));
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to <= from) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  const type = request.nextUrl.searchParams.get("type");
  if (type !== null && !categoryIdSchema.safeParse(type).success) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const rows = db
    .select()
    .from(entries)
    .where(and(eq(entries.deleted, 0), lt(entries.startAt, to), gte(entries.endAt, from), type ? eq(entries.type, type) : undefined))
    .orderBy(desc(entries.startAt))
    .limit(MAX_ENTRIES_PER_RANGE_REQUEST + 1)
    .all();
  const truncated = rows.length > MAX_ENTRIES_PER_RANGE_REQUEST;
  return NextResponse.json({
    entries: rows.slice(0, MAX_ENTRIES_PER_RANGE_REQUEST).map(toWireEntry),
    truncated,
  });
}
