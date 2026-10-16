"use client";

import { useEffect, useState } from "react";
import { Check, Heart, Scale, StickyNote, Timer, UtensilsCrossed, Zap } from "lucide-react";
import { ADDABLE_CATEGORIES, DAYTIME_OPTIONS, catMeta } from "@/lib/tilly/constants";
import { daysAgo, entrySummary, formatDuration, stressLabelFor } from "@/lib/tilly/helpers";
import type { AnyEntry, CategoryId, FoodPlanSlots } from "@/lib/tilly/types";
import { CatIcon, Rating, TextArea } from "./ui";

const PATIENCE_ICON = { filled: "/icons/tilly/rating-patience-filled.png", empty: "/icons/tilly/rating-patience-empty.png" };
const SHARK_ICON = { filled: "/icons/tilly/rating-shark-filled.png", empty: "/icons/tilly/rating-shark-empty.png" };

export function HomeView({
  entries,
  onOpenAdd,
  folgsamkeit,
  energie,
  patience,
  onUpdateFolgsamkeit,
  onUpdateEnergie,
  onUpdatePatience,
  generalNote,
  onNoteChange,
  noteStatus,
  foodPlanSlots,
  onConfirmFoodSlot,
  aloneStart,
  onStartAlone,
  onStopAlone,
}: {
  entries: AnyEntry[];
  onOpenAdd: (categoryId: CategoryId) => void;
  folgsamkeit: number;
  energie: number;
  patience: number;
  onUpdateFolgsamkeit: (value: number) => void;
  onUpdateEnergie: (value: number) => void;
  onUpdatePatience: (value: number) => void;
  generalNote: string;
  onNoteChange: (value: string) => void;
  noteStatus: string;
  foodPlanSlots: FoodPlanSlots;
  onConfirmFoodSlot: (daytime: string) => void;
  aloneStart: string | null;
  onStartAlone: () => void;
  onStopAlone: () => void;
}) {
  // Nur der gestrige Eintrag zaehlt: hoher Stress gestern -> heute als Ruhetag vorschlagen
  const yesterdayStress = entries.find((e) => e.type === "stress" && daysAgo(e.date) === 1);
  const showStressAlert = !!yesterdayStress && (yesterdayStress.level || 0) >= 2;
  const stressLabel = yesterdayStress ? stressLabelFor(yesterdayStress.level || 0) : "";

  const showWeightReminder = !entries.some((e) => e.type === "weight" && daysAgo(e.date) === 0);

  const todayFoodEntries = entries.filter((e) => e.type === "food" && daysAgo(e.date) === 0);
  const foodSlotsToday = DAYTIME_OPTIONS.filter((d) => foodPlanSlots[d]?.food?.trim());

  // Erzwingt jede Sekunde einen Re-Render, waehrend der Alleine-Timer laeuft, damit die
  // Anzeige live mitzaehlt - der Tick-Wert selbst wird nicht gelesen.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!aloneStart) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [aloneStart]);
  const aloneElapsedMs = aloneStart ? Date.now() - new Date(aloneStart).getTime() : 0;
  const aloneLast = [...entries].filter((e) => e.type === "alone").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return (
    <div>
      {showStressAlert && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-soft px-4 py-3">
          <Zap size={16} className="text-amber" />
          <span className="text-sm text-amber">
            Gestern war Tillys Stresslevel „{stressLabel}" – heute vielleicht einen Ruhetag einlegen?
          </span>
        </div>
      )}

      {showWeightReminder && (
        <button
          onClick={() => onOpenAdd("weight")}
          className="mb-4 flex w-full items-center gap-2 rounded-2xl bg-teal-soft px-4 py-3 text-left"
        >
          <Scale size={16} className="shrink-0 text-teal" />
          <span className="text-sm text-teal">Tilly wurde heute noch nicht gewogen – jetzt eintragen?</span>
        </button>
      )}

      {foodSlotsToday.length > 0 && (
        <div className="mb-4 rounded-2xl border border-hairline bg-card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <UtensilsCrossed size={15} className="text-sage" /> Futter heute
          </div>
          <div className="space-y-2">
            {foodSlotsToday.map((d) => {
              const slot = foodPlanSlots[d];
              const done = todayFoodEntries.some((e) => e.daytime === d);
              return (
                <div key={d} className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-bg px-3 py-2">
                  <div>
                    <div className="text-xs font-medium text-ink-soft">{d}</div>
                    <div className="text-sm text-ink">
                      {slot.food}
                      {slot.amount ? ` · ${slot.amount} ${slot.amountUnit || "Gramm"}` : ""}
                    </div>
                  </div>
                  {done ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-sage">
                      <Check size={14} /> erledigt
                    </span>
                  ) : (
                    <button
                      onClick={() => onConfirmFoodSlot(d)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-white ${catMeta("food").bg}`}
                    >
                      Bestätigen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-hairline bg-card p-4">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Heart size={15} className="text-rose" /> Heute
        </div>
        <Rating label="Folgsamkeit" value={folgsamkeit} onChange={onUpdateFolgsamkeit} colorClass="text-gold" />
        <div className="h-px bg-hairline" />
        <Rating label="Meine Geduld" value={patience} onChange={onUpdatePatience} icon={PATIENCE_ICON} colorClass="text-rose" />
        <div className="h-px bg-hairline" />
        <Rating label="Sharklevel" value={energie} onChange={onUpdateEnergie} icon={SHARK_ICON} colorClass="text-amber" />
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2.5">
        {ADDABLE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpenAdd(c.id)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-card py-4 transition-transform active:scale-[0.95]"
          >
            <CatIcon cat={c} size={22} />
            <span className="text-center text-xs font-medium leading-tight text-ink">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 rounded-2xl border border-hairline bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <StickyNote size={15} className="text-ink-soft" /> Notizen
          </div>
          <span className="min-w-11 text-right text-[11px] text-ink-soft">
            {noteStatus === "saving" ? "speichert…" : noteStatus === "saved" ? "gespeichert" : ""}
          </span>
        </div>
        <TextArea
          value={generalNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Für alles, was sonst nirgends reinpasst – z. B. Erinnerungen für einander…"
          rows={3}
        />
      </div>

      <div className="mt-2 rounded-2xl border border-hairline bg-card p-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Timer size={15} className="text-plum" /> {catMeta("alone").label}
        </div>
        {aloneStart ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl font-bold tabular-nums text-ink">{formatDuration(aloneElapsedMs)}</div>
            <button onClick={onStopAlone} className="shrink-0 rounded-full bg-plum px-4 py-2 text-sm font-medium text-white">
              Stop
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-ink-soft">
              {aloneLast ? `Zuletzt: ${entrySummary(aloneLast)}` : "Noch nicht erfasst"}
            </div>
            <button onClick={onStartAlone} className="shrink-0 rounded-full bg-plum px-4 py-2 text-sm font-medium text-white">
              Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
