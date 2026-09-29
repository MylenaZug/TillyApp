"use client";

import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import {
  CATEGORIES_WITH_TIME,
  DAYTIME_OPTIONS,
  FOOD_AMOUNT_UNITS,
  KOSTEN_CATEGORIES,
  STOOL_AMOUNTS,
  STOOL_COLORS,
  STOOL_CONSISTENCY,
  STOOL_FLAGS,
  SYMPTOM_CATEGORIES,
  catMeta,
} from "@/lib/tilly/constants";
import { dateOnlyToISO, nowLocalISO, toLocalDateValue, toLocalInputValue } from "@/lib/tilly/helpers";
import type { AnyEntry, CategoryId, Exercise, FoodPlanSlots } from "@/lib/tilly/types";
import { CatIcon, Chip, FieldLabel, PrimaryButton, StarRow, TextArea, TextInput } from "./ui";

const SHARK_ICON = { filled: "/icons/tilly/rating-shark-filled.png", empty: "/icons/tilly/rating-shark-empty.png" };

export function EntryForm({
  categoryId,
  existing,
  trainingTypes,
  foodTypes,
  exercises,
  symptomTypes,
  foodPlan,
  onFoodPlanChange,
  foodPlanSlots,
  onFoodPlanSlotsChange,
  foodPlanStatus,
  onSave,
  onDelete,
  onCancel,
}: {
  categoryId: CategoryId;
  existing: AnyEntry | null;
  trainingTypes: string[];
  foodTypes: string[];
  exercises: Exercise[];
  symptomTypes: string[];
  foodPlan: string;
  onFoodPlanChange: (value: string) => void;
  foodPlanSlots: FoodPlanSlots;
  onFoodPlanSlotsChange: (slots: FoodPlanSlots) => void;
  foodPlanStatus: string;
  onSave: (data: Record<string, unknown>) => void;
  onDelete: (() => void) | null;
  onCancel: () => void;
}) {
  const meta = catMeta(categoryId);
  const [date, setDate] = useState(existing ? existing.date : nowLocalISO());

  const existingConsistency = existing?.consistency as unknown as string | string[] | undefined;
  const [consistency, setConsistency] = useState<string[]>(
    existingConsistency ? (Array.isArray(existingConsistency) ? existingConsistency : [existingConsistency]) : [STOOL_CONSISTENCY[0]],
  );
  const [stoolAmount, setStoolAmount] = useState(existing?.stoolAmount || STOOL_AMOUNTS[1]);
  const [color, setColor] = useState(existing?.color || STOOL_COLORS[0].label);
  const [flags, setFlags] = useState<string[]>(existing?.flags || []);

  const [activity, setActivity] = useState(existing?.activity || "");
  // Uebungen aus der Uebungsbibliothek stehen automatisch mit zur Auswahl - waechst die
  // Bibliothek, waechst auch diese Liste, ohne dass hier etwas gepflegt werden muss.
  const combinedTrainingTypes = [...new Set([...(exercises || []).map((ex) => ex.name), ...trainingTypes])];
  const [dogStars, setDogStars] = useState(existing?.dogStars || 0);
  const [trainerStars, setTrainerStars] = useState(existing?.trainerStars || 0);

  const [kg, setKg] = useState(existing?.kg !== undefined ? String(existing.kg) : "");
  const [daytime, setDaytime] = useState(existing?.daytime || DAYTIME_OPTIONS[0]);

  const [food, setFood] = useState(existing?.food || "");
  const [amount, setAmount] = useState(existing?.amount !== undefined ? String(existing.amount) : "");
  const [amountUnit, setAmountUnit] = useState(existing?.amountUnit || FOOD_AMOUNT_UNITS[0]);
  const [foodDaytime, setFoodDaytime] = useState(existing?.daytime || "");

  const [reason, setReason] = useState(existing?.reason || "");
  const symptomOptions = [...new Set([...SYMPTOM_CATEGORIES.filter((c) => c !== "Anderes"), ...(symptomTypes || [])])];
  const symptomIsKnown = existing ? symptomOptions.includes(existing.category ?? "") : true;
  const [symptomCategory, setSymptomCategory] = useState(
    existing ? (symptomIsKnown ? existing.category ?? "" : "Anderes") : symptomOptions[0],
  );
  const [customSymptom, setCustomSymptom] = useState(existing && !symptomIsKnown ? existing.category ?? "" : "");

  const [level, setLevel] = useState(existing?.level || 0);

  const [kostenCategory, setKostenCategory] = useState(existing?.category || KOSTEN_CATEGORIES[0]);
  const [kostenAmount, setKostenAmount] = useState(existing?.amount !== undefined ? String(existing.amount) : "");

  const [folgsamkeit, setFolgsamkeit] = useState(existing?.folgsamkeit || 0);
  const [energie, setEnergie] = useState(existing?.energie || 0);

  const [note, setNote] = useState(existing?.note || "");

  const canSave =
    (categoryId === "stool" && consistency.length > 0) ||
    (categoryId === "training" && activity.trim().length > 0) ||
    (categoryId === "weight" && kg.trim().length > 0 && !Number.isNaN(Number(kg))) ||
    (categoryId === "food" && food.trim().length > 0) ||
    categoryId === "vet" ||
    categoryId === "symptom" ||
    (categoryId === "stress" && level > 0) ||
    (categoryId === "kosten" && kostenAmount.trim().length > 0 && !Number.isNaN(Number(kostenAmount))) ||
    categoryId === "tagescheck";

  const handleSave = () => {
    const base = { date, note: note.trim() };
    let data: Record<string, unknown> = base;
    if (categoryId === "stool") data = { ...base, consistency, color, flags, stoolAmount };
    if (categoryId === "training") data = { ...base, activity: activity.trim(), dogStars, trainerStars };
    if (categoryId === "weight") data = { ...base, kg: Number(kg), daytime };
    if (categoryId === "food")
      data = {
        ...base,
        food: food.trim(),
        amount: amount !== "" ? Number(amount) : undefined,
        amountUnit,
        daytime: foodDaytime || undefined,
      };
    if (categoryId === "vet") data = { ...base, reason: reason.trim() };
    if (categoryId === "symptom")
      data = { ...base, category: symptomCategory === "Anderes" && customSymptom.trim() ? customSymptom.trim() : symptomCategory };
    if (categoryId === "stress") data = { ...base, level };
    if (categoryId === "kosten") data = { ...base, category: kostenCategory, amount: Number(kostenAmount) };
    if (categoryId === "tagescheck") data = { ...base, folgsamkeit, energie };
    onSave(data);
  };

  const toggleFlag = (f: string) => setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  const toggleConsistency = (c: string) =>
    setConsistency((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const updateFoodPlanSlot = (daytimeKey: string, patch: Partial<{ food: string; amount?: number; amountUnit: string }>) => {
    const current = foodPlanSlots[daytimeKey] || { food: "", amountUnit: FOOD_AMOUNT_UNITS[0] };
    onFoodPlanSlotsChange({ ...foodPlanSlots, [daytimeKey]: { ...current, ...patch } });
  };

  return (
    <div className="pb-4">
      <div className="mb-4 flex items-center justify-between pt-1">
        <button onClick={onCancel} className="p-1">
          <X size={22} className="text-ink-soft" />
        </button>
        <div className="flex items-center gap-2 font-semibold text-ink">
          <CatIcon cat={meta} size={16} /> {meta.label}
        </div>
        <div className="w-6" />
      </div>

      <div className="space-y-4">
        <div>
          <FieldLabel>{CATEGORIES_WITH_TIME.includes(categoryId) ? "Zeitpunkt" : "Tag"}</FieldLabel>
          {CATEGORIES_WITH_TIME.includes(categoryId) ? (
            <TextInput type="datetime-local" value={toLocalInputValue(date)} onChange={(e) => setDate(new Date(e.target.value).toISOString())} />
          ) : (
            <TextInput type="date" value={toLocalDateValue(date)} onChange={(e) => setDate(dateOnlyToISO(e.target.value))} />
          )}
        </div>

        {categoryId === "stool" && (
          <>
            <div>
              <FieldLabel>Konsistenz</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {STOOL_CONSISTENCY.map((c) => (
                  <Chip key={c} active={consistency.includes(c)} onClick={() => toggleConsistency(c)} colorClass={meta.text} activeBgClass={meta.bg}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Menge</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {STOOL_AMOUNTS.map((a) => (
                  <Chip key={a} active={stoolAmount === a} onClick={() => setStoolAmount(a)} colorClass={meta.text} activeBgClass={meta.bg}>
                    {a}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {categoryId === "training" && (
          <>
            <div>
              <FieldLabel>Was wurde trainiert?</FieldLabel>
              <TextInput value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="z. B. Rückruf" />
              {combinedTrainingTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {combinedTrainingTypes.map((t) => (
                    <Chip key={t} active={activity === t} onClick={() => setActivity(t)} colorClass={meta.text} activeBgClass={meta.bg}>
                      {t}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-hairline bg-bg px-3 py-1">
              <StarRow label="Tilly" value={dogStars} onChange={setDogStars} colorClass="text-gold" />
              <div className="h-px bg-hairline" />
              <StarRow label="Trainer:in" value={trainerStars} onChange={setTrainerStars} colorClass="text-teal" />
            </div>
          </>
        )}

        {categoryId === "weight" && (
          <>
            <div>
              <FieldLabel>Gewicht (kg)</FieldLabel>
              <TextInput type="number" step="0.1" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="z. B. 24.5" />
            </div>
            <div>
              <FieldLabel>Tageszeit</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DAYTIME_OPTIONS.map((d) => (
                  <Chip key={d} active={daytime === d} onClick={() => setDaytime(d)} colorClass={meta.text} activeBgClass={meta.bg}>
                    {d}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {categoryId === "food" && (
          <>
            <div>
              <FieldLabel>Futter</FieldLabel>
              <TextInput value={food} onChange={(e) => setFood(e.target.value)} placeholder="z. B. Nassfutter Huhn" />
              {foodTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {foodTypes.slice(0, 8).map((t) => (
                    <Chip key={t} active={food === t} onClick={() => setFood(t)} colorClass={meta.text} activeBgClass={meta.bg}>
                      {t}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Menge</FieldLabel>
              <div className="mb-2 flex flex-wrap gap-2">
                {FOOD_AMOUNT_UNITS.map((u) => (
                  <Chip key={u} active={amountUnit === u} onClick={() => setAmountUnit(u)} colorClass={meta.text} activeBgClass={meta.bg}>
                    {u}
                  </Chip>
                ))}
              </div>
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step={amountUnit === "Gramm" ? "1" : "0.25"}
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || Number(v) >= 0) setAmount(v);
                }}
                placeholder={amountUnit === "Gramm" ? "z. B. 200" : "z. B. 1"}
              />
            </div>
            <div>
              <FieldLabel>Tageszeit (optional)</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DAYTIME_OPTIONS.map((d) => (
                  <Chip
                    key={d}
                    active={foodDaytime === d}
                    onClick={() => setFoodDaytime((cur) => (cur === d ? "" : d))}
                    colorClass={meta.text}
                    activeBgClass={meta.bg}
                  >
                    {d}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-hairline bg-bg p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <FieldLabel>Futterplan</FieldLabel>
                <span className="min-w-11 text-right text-[11px] text-ink-soft">
                  {foodPlanStatus === "saving" ? "speichert…" : foodPlanStatus === "saved" ? "gespeichert" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {DAYTIME_OPTIONS.map((d) => {
                  const slot = foodPlanSlots[d] || { food: "", amount: undefined, amountUnit: FOOD_AMOUNT_UNITS[0] };
                  return (
                    <div key={d}>
                      <div className="mb-1 text-xs font-medium text-ink-soft">{d}</div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <TextInput
                            value={slot.food}
                            onChange={(e) => updateFoodPlanSlot(d, { food: e.target.value })}
                            placeholder="z. B. Nassfutter Huhn"
                          />
                        </div>
                        <div className="w-24">
                          <TextInput
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step={(slot.amountUnit || FOOD_AMOUNT_UNITS[0]) === "Gramm" ? "1" : "0.25"}
                            value={slot.amount ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || Number(v) >= 0) updateFoodPlanSlot(d, { amount: v !== "" ? Number(v) : undefined });
                            }}
                            placeholder="Menge"
                          />
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {FOOD_AMOUNT_UNITS.map((u) => (
                          <Chip
                            key={u}
                            active={(slot.amountUnit || FOOD_AMOUNT_UNITS[0]) === u}
                            onClick={() => updateFoodPlanSlot(d, { amountUnit: u })}
                            colorClass={meta.text}
                            activeBgClass={meta.bg}
                          >
                            {u}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 border-t border-hairline pt-3">
                <FieldLabel>Sonstiges / Ausnahmen</FieldLabel>
                <TextArea
                  value={foodPlan}
                  onChange={(e) => onFoodPlanChange(e.target.value)}
                  placeholder="z. B. Montags zusätzlich ein Kauartikel, im Urlaub anderes Futter…"
                  rows={2}
                />
              </div>
            </div>
          </>
        )}

        {categoryId === "vet" && (
          <div>
            <FieldLabel>Grund</FieldLabel>
            <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z. B. Jahresimpfung" />
          </div>
        )}

        {categoryId === "symptom" && (
          <div>
            <FieldLabel>Kategorie</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {[...symptomOptions, "Anderes"].map((c) => (
                <Chip
                  key={c}
                  active={symptomCategory === c}
                  onClick={() => setSymptomCategory(c)}
                  colorClass={meta.text}
                  activeBgClass={meta.bg}
                  activeTextClass={meta.activeText}
                >
                  {c}
                </Chip>
              ))}
            </div>
            {symptomCategory === "Anderes" && (
              <div className="mt-2">
                <TextInput value={customSymptom} onChange={(e) => setCustomSymptom(e.target.value)} placeholder="Eigene Bezeichnung eingeben…" />
              </div>
            )}
          </div>
        )}

        {categoryId === "stress" && (
          <div>
            <FieldLabel>Wie gestresst war Tilly heute? (eigene Einschätzung)</FieldLabel>
            <div className="space-y-2">
              {[
                { value: 1, label: "Mäßig" },
                { value: 2, label: "Hoch" },
                { value: 3, label: "Zuviel" },
              ].map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    level === l.value ? `${meta.soft} ${meta.border}` : "border-hairline bg-bg"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      level === l.value ? `${meta.bg} text-white` : "bg-hairline text-ink-soft"
                    }`}
                  >
                    {l.value}
                  </span>
                  <span className="text-sm text-ink">{l.label}</span>
                  {level === l.value && <Check size={16} className={`ml-auto ${meta.text}`} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {categoryId === "kosten" && (
          <>
            <div>
              <FieldLabel>Wofür?</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {KOSTEN_CATEGORIES.map((c) => (
                  <Chip key={c} active={kostenCategory === c} onClick={() => setKostenCategory(c)} colorClass={meta.text} activeBgClass={meta.bg}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Betrag (€)</FieldLabel>
              <TextInput
                type="number"
                step="0.01"
                inputMode="decimal"
                value={kostenAmount}
                onChange={(e) => setKostenAmount(e.target.value)}
                placeholder="z. B. 24.90"
              />
            </div>
            <div>
              <FieldLabel>Wofür genau? (optional)</FieldLabel>
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Leine, Spielzeug, Zeckenschutz…" />
            </div>
          </>
        )}

        {categoryId === "tagescheck" && (
          <div className="rounded-xl border border-hairline bg-bg px-3 py-1">
            <StarRow label="Folgsamkeit" value={folgsamkeit} onChange={setFolgsamkeit} colorClass="text-gold" />
            <div className="h-px bg-hairline" />
            <StarRow label="Sharklevel" value={energie} onChange={setEnergie} colorClass="text-amber" icon={SHARK_ICON} />
          </div>
        )}

        {categoryId !== "food" && categoryId !== "kosten" && categoryId !== "weight" && (
          <div className="space-y-4">
            {categoryId === "stool" && (
              <>
                <div>
                  <FieldLabel>Farbe</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {STOOL_COLORS.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => setColor(c.label)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs text-ink ${
                          color === c.label ? "border-ink" : "border-hairline"
                        }`}
                      >
                        <span className="inline-block h-3 w-3 rounded-full" style={{ background: c.hex }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Auffälligkeiten</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {STOOL_FLAGS.map((f) => (
                      <Chip key={f} active={flags.includes(f)} onClick={() => toggleFlag(f)} colorClass="text-rust" activeBgClass="bg-rust">
                        {f}
                      </Chip>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <FieldLabel>Notiz (optional)</FieldLabel>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Weitere Beobachtungen…" />
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <PrimaryButton onClick={handleSave} disabled={!canSave} bgClass={meta.bg}>
            {existing ? "Änderungen speichern" : "Eintrag speichern"}
          </PrimaryButton>
          {existing && onDelete && (
            <button onClick={onDelete} className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-rust">
              <Trash2 size={14} /> Eintrag löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
