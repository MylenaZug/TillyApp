import { describe, expect, it } from "vitest";
import { CATEGORY_IDS, parseEntry } from "./schemas";

const T0 = Date.UTC(2026, 2, 5, 9, 0);
const T1 = Date.UTC(2026, 2, 5, 10, 30);
const validData: Record<string, object> = {
  food: { food: "Nass" },
  stool: { consistency: ["fest"], stoolAmount: "normal", color: "braun", flags: [] },
  training: { activity: "Sitz", dogStars: 3, trainerStars: 4 },
  stress: { level: 3 },
  symptom: { category: "Husten" },
  weight: { kg: 9, daytime: "Morgens" },
  vet: { reason: "Impfung" },
  kosten: { category: "Futter", amount: 12 },
  tagescheck: { folgsamkeit: 3, energie: 4 },
  alone: {},
};

describe("parseEntry", () => {
  it.each(CATEGORY_IDS)("%s: gleiche Zeitregeln für jeden Typ", (type) => {
    const data = validData[type];
    expect(parseEntry({ type, startAt: T0, endAt: T0, data })).toMatchObject({ ok: true });
    expect(parseEntry({ type, startAt: T0, endAt: T1, data })).toMatchObject({ ok: true });
    expect(parseEntry({ type, startAt: 1.5, endAt: T1, data })).toMatchObject({ ok: false });
    expect(parseEntry({ type, startAt: T1, endAt: T0, data })).toMatchObject({ ok: false });
    expect(parseEntry({ type, startAt: "2026-03-05T09:00:00.000Z", endAt: T0, data })).toMatchObject({ ok: false });
    expect(parseEntry({ type, startAt: T0, endAt: undefined, data })).toMatchObject({ ok: false });
  });

  it("entfernt unbekannte und veraltete Felder wie date, ms oder startedAt aus data", () => {
    const result = parseEntry({
      type: "stress",
      startAt: T0,
      endAt: T0,
      data: { level: 3, date: "2026-03-05", ms: 1, startedAt: "x" },
    });
    expect(result).toEqual({ ok: true, startAt: T0, endAt: T0, data: { level: 3 } });
  });

  it("lehnt unbekannte Typen und falsche Feldtypen ab", () => {
    expect(parseEntry({ type: "nope", startAt: T0, endAt: T0, data: {} })).toMatchObject({ ok: false });
    expect(
      parseEntry({ type: "weight", startAt: T0, endAt: T0, data: { kg: "9", daytime: "Morgens" } })
    ).toMatchObject({ ok: false, error: expect.stringContaining("data.kg") });
  });
});
