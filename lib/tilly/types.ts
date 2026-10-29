import type { CategoryId, EntryDataByType } from "./schemas";

// Die Eintragstypen werden aus den Zod-Schemas in schemas.ts abgeleitet (einzige Quelle).
export type { CategoryId, EntryDataByType };
export type StoolData = EntryDataByType["stool"];
export type TrainingData = EntryDataByType["training"];
export type WeightData = EntryDataByType["weight"];
export type FoodData = EntryDataByType["food"];
export type VetData = EntryDataByType["vet"];
export type SymptomData = EntryDataByType["symptom"];
export type StressData = EntryDataByType["stress"];
export type KostenData = EntryDataByType["kosten"];
export type TagescheckData = EntryDataByType["tagescheck"];
export type AloneData = EntryDataByType["alone"];

// Fester Futterplan pro Tageszeit (Morgens/Mittags/Abends, siehe DAYTIME_OPTIONS) - fuer
// alles, was nicht ins Schema passt, gibt es weiterhin das freie Notizfeld im Storage
// unter dem kv-Key "food-plan".
export type FoodPlanSlot = { food: string; amount?: number; amountUnit?: string };
export type FoodPlanSlots = Record<string, FoodPlanSlot>;

// Flache Sicht auf einen Eintrag (wie im alten Firebase-Prototyp): id/type/updatedAt
// vom Storage-Layer plus die typspezifischen Felder aus `data` auf einer Ebene.
export type AnyEntry = {
  id: string;
  type: CategoryId;
  updatedAt: number;
  startDatetime?: string;
  endDatetime?: string;
} & Partial<StoolData & TrainingData & WeightData & FoodData & VetData & SymptomData & StressData & KostenData & TagescheckData & AloneData> & {
    date: string;
  };

export type Exercise = {
  id: string;
  name: string;
  verbalCommand: string;
  handSignal: string;
  goal: string;
  notes: string;
  masteryLevel: number;
};
