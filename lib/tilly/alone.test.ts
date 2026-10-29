import { describe, expect, it } from "vitest";
import { aloneDurationMs, localDateTimeToMs, roundToMinute } from "./alone";

describe("Alleine-Zeitpunkte", () => {
  it("rundet Zeitstempel auf volle Minuten und lehnt ungueltige Werte ab", () => {
    expect(roundToMinute(Date.parse("2026-03-05T09:00:31.000Z"))).toBe(Date.parse("2026-03-05T09:01:00.000Z"));
    expect(roundToMinute(Number.NaN)).toBeNull();
  });

  it("parst leere und vollstaendige datetime-local-Werte sicher", () => {
    expect(localDateTimeToMs("")).toBeNull();
    expect(localDateTimeToMs("2026-03-05")).toBeNull();
    expect(localDateTimeToMs("2026-03-05T09:15")).toBe(new Date(2026, 2, 5, 9, 15).getTime());
  });

  it("berechnet die Dauer aus Start und Ende", () => {
    expect(aloneDurationMs(Date.parse("2026-03-05T09:00:00.000Z"), Date.parse("2026-03-06T10:00:00.000Z"))).toBe(25 * 60 * 60_000);
    expect(aloneDurationMs(Date.parse("2026-03-05T10:00:00.000Z"), Date.parse("2026-03-05T09:00:00.000Z"))).toBe(0);
  });
});
