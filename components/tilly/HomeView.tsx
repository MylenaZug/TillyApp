"use client";

import { Heart, RotateCcw, Scale, StickyNote, Zap } from "lucide-react";
import { ADDABLE_CATEGORIES } from "@/lib/tilly/constants";
import { daysAgo, stressLabelFor } from "@/lib/tilly/helpers";
import type { AnyEntry, CategoryId } from "@/lib/tilly/types";
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
  onRequestReset,
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
  onRequestReset: () => void;
}) {
  // Nur der gestrige Eintrag zaehlt: hoher Stress gestern -> heute als Ruhetag vorschlagen
  const yesterdayStress = entries.find((e) => e.type === "stress" && daysAgo(e.date) === 1);
  const showStressAlert = !!yesterdayStress && (yesterdayStress.level || 0) >= 2;
  const stressLabel = yesterdayStress ? stressLabelFor(yesterdayStress.level || 0) : "";

  const showWeightReminder = !entries.some((e) => e.type === "weight" && daysAgo(e.date) === 0);

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

      <div className="mt-3 flex justify-end">
        <button onClick={onRequestReset} className="flex items-center gap-1 text-[11px] text-ink-soft opacity-60">
          <RotateCcw size={11} /> Daten zurücksetzen
        </button>
      </div>
    </div>
  );
}
