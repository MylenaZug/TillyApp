import { describe, expect, it } from "vitest";
import { aloneDurationMs, localDateTimeToIso, roundToMinute } from "./alone";

describe("Alleine-Zeitpunkte", () => {
  it("rundet valide Zeitstempel auf volle Minuten und lehnt ungueltige Werte ab", () => {
    expect(roundToMinute("2026-03-05T09:00:31.000Z")).toBe("2026-03-05T09:01:00.000Z");
    expect(roundToMinute("ungueltig")).toBeNull();
  });

  it("parst leere und vollstaendige datetime-local-Werte sicher", () => {
    expect(localDateTimeToIso("")).toBeNull();
    expect(localDateTimeToIso("2026-03-05")).toBeNull();
    expect(localDateTimeToIso("2026-03-05T09:15")).toBe(new Date(2026, 2, 5, 9, 15).toISOString());
  });

  it("berechnet die Dauer aus den separaten Zeitpunkten", () => {
    expect(aloneDurationMs("2026-03-05T09:00:00.000Z", "2026-03-06T10:00:00.000Z")).toBe(25 * 60 * 60_000);
    expect(aloneDurationMs("2026-03-05T10:00:00.000Z", "2026-03-05T09:00:00.000Z")).toBe(0);
  });
});
