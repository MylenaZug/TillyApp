import { describe, expect, it } from "vitest";
import type { AnyEntry } from "@/lib/tilly/types";
import {
  combineLocalDateTime,
  dateOnlyToISO,
  entrySummary,
  formatDuration,
  toLocalDateValue,
  toLocalTimeValue,
} from "@/lib/tilly/helpers";

const alone = (o: object) => ({ id: "1", type: "alone", date: "2026-01-01T10:00:00.000Z", ...o }) as unknown as AnyEntry;

describe("formatDuration", () => {
  it("zeigt Minuten unter einer Stunde und Stunden plus Minuten darueber", () => {
    expect(formatDuration(0)).toBe("0 Min");
    expect(formatDuration(59_999)).toBe("0 Min");
    expect(formatDuration(45 * 60_000)).toBe("45 Min");
    expect(formatDuration(90 * 60_000)).toBe("1 Std 30 Min");
  });

  it("behandelt negative Werte als 0", () => {
    expect(formatDuration(-5000)).toBe("0 Min");
  });
});

describe("entrySummary fuer Alleine-Eintraege", () => {
  const start = new Date(2026, 0, 1, 9, 0).toISOString();
  const end = new Date(2026, 0, 1, 10, 30).toISOString();

  it("zeigt Dauer und Uhrzeiten von-bis", () => {
    expect(entrySummary(alone({ startedAt: start, endedAt: end, ms: 90 * 60_000 }))).toBe("1 Std 30 Min · 09:00–10:30 Uhr");
  });

  it("akzeptiert eine Dauer von 0 als gueltigen Wert", () => {
    expect(entrySummary(alone({ startedAt: start, endedAt: start, ms: 0 }))).toContain("0 Min");
  });

  it("faellt bei fehlenden Feldern auf den Fallback-Text zurueck", () => {
    expect(entrySummary(alone({ endedAt: end, ms: 1000 }))).toBe("Eintrag gespeichert");
    expect(entrySummary(alone({ startedAt: start, ms: 1000 }))).toBe("Eintrag gespeichert");
    expect(entrySummary(alone({ startedAt: start, endedAt: end }))).toBe("Eintrag gespeichert");
  });
});

describe("Datum/Uhrzeit-Helfer", () => {
  it("zerlegt und fuehrt lokale Zeit verlustfrei wieder zusammen", () => {
    const iso = combineLocalDateTime("2026-03-05", "07:45");
    expect(toLocalDateValue(iso)).toBe("2026-03-05");
    expect(toLocalTimeValue(iso)).toBe("07:45");
  });

  it("nimmt 00:00 an, wenn keine Uhrzeit angegeben ist", () => {
    expect(toLocalTimeValue(combineLocalDateTime("2026-03-05", ""))).toBe("00:00");
  });

  it("legt reine Datumswerte auf 12:00 lokal, damit Zeitzonen den Tag nicht verschieben", () => {
    const iso = dateOnlyToISO("2026-03-05");
    expect(toLocalDateValue(iso)).toBe("2026-03-05");
    expect(toLocalTimeValue(iso)).toBe("12:00");
  });
});
