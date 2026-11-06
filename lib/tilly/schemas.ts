import { z } from "zod";

export const CATEGORY_IDS = [
  "food",
  "stool",
  "training",
  "stress",
  "symptom",
  "weight",
  "vet",
  "kosten",
  "tagescheck",
  "alone",
] as const;

export const categoryIdSchema = z.enum(CATEGORY_IDS);

// Zeitpunkte sind durchgaengig Epoch-Millisekunden (DB, API, Client); umgewandelt wird nur in der UI.
export const epochMsSchema = z.number().int().nonnegative();
const noteSchema = z.string().optional();

// Datum und Zeitraum liegen nicht in `data`, sondern im gemeinsamen Rahmen (entrySchema).
const baseEntry = { note: noteSchema };

export const stoolDataSchema = z.object({
  ...baseEntry,
  consistency: z.array(z.string()),
  stoolAmount: z.string(),
  color: z.string(),
  flags: z.array(z.string()),
});
export const trainingDataSchema = z.object({
  ...baseEntry,
  activity: z.string(),
  dogStars: z.number(),
  trainerStars: z.number(),
});
export const weightDataSchema = z.object({ ...baseEntry, kg: z.number(), daytime: z.string() });
export const foodDataSchema = z.object({
  ...baseEntry,
  food: z.string(),
  amount: z.number().optional(),
  amountUnit: z.string().optional(),
  daytime: z.string().optional(),
});
export const vetDataSchema = z.object({ ...baseEntry, reason: z.string() });
export const symptomDataSchema = z.object({ ...baseEntry, category: z.string() });
export const stressDataSchema = z.object({ ...baseEntry, level: z.number() });
export const kostenDataSchema = z.object({ ...baseEntry, category: z.string(), amount: z.number() });
export const tagescheckDataSchema = z.object({ ...baseEntry, folgsamkeit: z.number(), energie: z.number() });
// Start und Ende sind volle Zeitpunkte; Datum und Dauer werden daraus abgeleitet, nicht gespeichert.
export const aloneDataSchema = z.object({ note: noteSchema });

export const entryDataSchemas = {
  food: foodDataSchema,
  stool: stoolDataSchema,
  training: trainingDataSchema,
  stress: stressDataSchema,
  symptom: symptomDataSchema,
  weight: weightDataSchema,
  vet: vetDataSchema,
  kosten: kostenDataSchema,
  tagescheck: tagescheckDataSchema,
  alone: aloneDataSchema,
} satisfies Record<(typeof CATEGORY_IDS)[number], z.ZodType>;

export type CategoryId = z.infer<typeof categoryIdSchema>;
export type EntryDataByType = { [K in keyof typeof entryDataSchemas]: z.infer<(typeof entryDataSchemas)[K]> };

// Gemeinsamer Rahmen fuer ALLE Eintragstypen: Zeitraum (bei Punkt-Ereignissen Ende = Start)
// plus typspezifische Daten. Die Zeitregeln gelten damit einheitlich fuer jeden Typ.
export const entryTimeSchema = z
  .object({ startAt: epochMsSchema, endAt: epochMsSchema })
  .refine((v) => v.endAt >= v.startAt, { message: "Ende darf nicht vor dem Start liegen", path: ["endAt"] });

export type ParsedEntry =
  | { ok: true; startAt: number; endAt: number; data: EntryDataByType[CategoryId] }
  | { ok: false; error: string };

const formatIssues = (issues: z.core.$ZodIssue[]) =>
  issues.map((i) => `${i.path.join(".") || "entry"}: ${i.message}`).join("; ");

/** Validiert Zeitraum und typspezifische `data` eines Eintrags (entfernt unbekannte Felder). */
export function parseEntry(input: { type: string; startAt: unknown; endAt: unknown; data: unknown }): ParsedEntry {
  const type = categoryIdSchema.safeParse(input.type);
  if (!type.success) return { ok: false, error: `Unbekannter Typ: ${input.type}` };
  const time = entryTimeSchema.safeParse(input);
  if (!time.success) return { ok: false, error: formatIssues(time.error.issues) };
  const data = entryDataSchemas[type.data].safeParse(input.data);
  if (!data.success) return { ok: false, error: formatIssues(data.error.issues.map((i) => ({ ...i, path: ["data", ...i.path] }))) };
  return { ok: true, startAt: time.data.startAt, endAt: time.data.endAt, data: data.data as EntryDataByType[CategoryId] };
}
