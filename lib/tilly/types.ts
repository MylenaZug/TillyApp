export type CategoryId =
  | "food"
  | "stool"
  | "training"
  | "stress"
  | "symptom"
  | "weight"
  | "vet"
  | "kosten"
  | "tagescheck";

type BaseEntryData = { date: string; note?: string };

export type StoolData = BaseEntryData & {
  consistency: string;
  stoolAmount: string;
  color: string;
  flags: string[];
};
export type TrainingData = BaseEntryData & { activity: string; dogStars: number; trainerStars: number };
export type WeightData = BaseEntryData & { kg: number; daytime: string };
export type FoodData = BaseEntryData & { food: string; amount?: number; cost?: number };
export type VetData = BaseEntryData & { reason: string; cost?: number };
export type SymptomData = BaseEntryData & { category: string };
export type StressData = BaseEntryData & { level: number };
export type KostenData = BaseEntryData & { category: string; amount: number };
export type TagescheckData = BaseEntryData & { folgsamkeit: number; energie: number; geduld?: number };

export type EntryDataByType = {
  food: FoodData;
  stool: StoolData;
  training: TrainingData;
  stress: StressData;
  symptom: SymptomData;
  weight: WeightData;
  vet: VetData;
  kosten: KostenData;
  tagescheck: TagescheckData;
};

// Flache Sicht auf einen Eintrag (wie im alten Firebase-Prototyp): id/type/updatedAt
// vom Storage-Layer plus die typspezifischen Felder aus `data` auf einer Ebene.
export type AnyEntry = {
  id: string;
  type: CategoryId;
  updatedAt: number;
} & Partial<StoolData & TrainingData & WeightData & FoodData & VetData & SymptomData & StressData & KostenData & TagescheckData> & {
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
