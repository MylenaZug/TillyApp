"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, GripVertical, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { MASTERY_LABELS } from "@/lib/tilly/constants";
import { starGlyphs, uid } from "@/lib/tilly/helpers";
import type { Exercise } from "@/lib/tilly/types";
import { FieldLabel, PrimaryButton, StarRow, TextArea, TextInput } from "./ui";

function ExerciseField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-[11px] uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="whitespace-pre-line text-[13px] text-ink">{value}</div>
    </div>
  );
}

function ExerciseForm({
  existing,
  onSave,
  onCancel,
  onDelete,
}: {
  existing: Exercise | null;
  onSave: (exercise: Exercise) => void;
  onCancel: () => void;
  onDelete: (() => void) | null;
}) {
  const [name, setName] = useState(existing?.name || "");
  const [verbalCommand, setVerbalCommand] = useState(existing?.verbalCommand || "");
  const [handSignal, setHandSignal] = useState(existing?.handSignal || "");
  const [goal, setGoal] = useState(existing?.goal || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [masteryLevel, setMasteryLevel] = useState(existing?.masteryLevel || 0);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    onSave({
      id: existing?.id || uid(),
      name: name.trim(),
      verbalCommand: verbalCommand.trim(),
      handSignal: handSignal.trim(),
      goal: goal.trim(),
      notes: notes.trim(),
      masteryLevel,
    });
  };

  return (
    <div className="pb-4">
      <div className="mb-4 flex items-center justify-between pt-1">
        <button onClick={onCancel} className="p-1">
          <X size={22} className="text-ink-soft" />
        </button>
        <div className="flex items-center gap-2 font-semibold text-ink">
          <BookOpen size={16} className="text-gold" /> {existing ? "Übung bearbeiten" : "Neue Übung"}
        </div>
        <div className="w-6" />
      </div>

      <div className="space-y-4">
        <div>
          <FieldLabel>Name der Übung</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Ran" />
        </div>
        <div>
          <FieldLabel>Wie gut kann Tilly das schon?</FieldLabel>
          <div className="rounded-xl border border-hairline bg-bg px-3 py-1">
            <StarRow label="Kompetenz" value={masteryLevel} onChange={setMasteryLevel} colorClass="text-gold" />
          </div>
          <div className="mt-1 text-[11px] text-ink-soft">{MASTERY_LABELS[masteryLevel]}</div>
        </div>
        <div>
          <FieldLabel>Verbales Kommando (optional)</FieldLabel>
          <TextInput value={verbalCommand} onChange={(e) => setVerbalCommand(e.target.value)} placeholder="z. B. Ran" />
        </div>
        <div>
          <FieldLabel>Handzeichen</FieldLabel>
          <TextArea value={handSignal} onChange={(e) => setHandSignal(e.target.value)} placeholder="z. B. Rechte Hand auf den Oberschenkel legen" />
        </div>
        <div>
          <FieldLabel>Was soll Tilly tun?</FieldLabel>
          <TextArea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="z. B. Sich rechts neben dich setzen, nah am Bein, nach oben schauen" />
        </div>
        <div>
          <FieldLabel>Notizen (optional)</FieldLabel>
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tipps, Stolperfallen, Aufbau-Schritte…" rows={4} />
        </div>

        <div className="space-y-2 pt-2">
          <PrimaryButton onClick={handleSave} disabled={!canSave} bgClass="bg-gold">
            {existing ? "Änderungen speichern" : "Übung speichern"}
          </PrimaryButton>
          {existing && onDelete && (
            <button onClick={onDelete} className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-rust">
              <Trash2 size={14} /> Übung löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExercisesView({
  exercises,
  onSave,
  onDelete,
  onReorder,
}: {
  exercises: Exercise[];
  onSave: (exercise: Exercise) => void;
  onDelete: (id: string) => void;
  onReorder: (next: Exercise[]) => void;
}) {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [openId, setOpenId] = useState<string | null>(exercises[0]?.id || null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Immer nach Sternchen sortiert (wenig oben, viel unten). Bei gleicher Sternezahl
  // entscheidet die Position im Array - genau die, die man per Ziehen veraendert.
  const sorted = [...exercises].sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0));

  useEffect(() => {
    if (!dragId) return;
    const handleMove = (e: PointerEvent) => {
      const y = e.clientY;
      let found: string | null = null;
      for (const ex of sorted) {
        const el = itemRefs.current[ex.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (y < rect.top + rect.height / 2) {
          found = ex.id;
          break;
        }
      }
      setOverId(found || sorted[sorted.length - 1]?.id || null);
    };
    const handleUp = () => {
      if (dragId && overId && dragId !== overId) {
        const ids = sorted.map((s) => s.id);
        const fromIdx = ids.indexOf(dragId);
        ids.splice(fromIdx, 1);
        const toIdx = ids.indexOf(overId);
        ids.splice(toIdx, 0, dragId);
        const reordered = ids.map((id) => exercises.find((e) => e.id === id)!);
        onReorder(reordered);
      }
      setDragId(null);
      setOverId(null);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId, overId]);

  if (mode === "form") {
    return (
      <ExerciseForm
        existing={editing}
        onCancel={() => {
          setMode("list");
          setEditing(null);
        }}
        onSave={(ex) => {
          onSave(ex);
          setMode("list");
          setEditing(null);
        }}
        onDelete={
          editing
            ? () => {
                onDelete(editing.id);
                setMode("list");
                setEditing(null);
              }
            : null
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="font-semibold text-ink">Übungen</div>
        <button
          onClick={() => {
            setEditing(null);
            setMode("form");
          }}
          className="flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-xs text-white"
        >
          <Plus size={13} /> Neue Übung
        </button>
      </div>

      {exercises.length > 1 && (
        <div className="mb-3">
          <span className="text-[11px] text-ink-soft">Wenig Sterne oben, viel unten. Bei gleicher Sternezahl per Griff ziehen zum Umsortieren.</span>
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-soft">
          Noch keine Übungen hinterlegt. Leg die erste an – z. B. mit Handzeichen und Ziel-Verhalten.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((ex) => {
            const open = openId === ex.id;
            const isDragging = dragId === ex.id;
            const isOver = overId === ex.id && !!dragId && dragId !== ex.id;
            return (
              <div
                key={ex.id}
                ref={(el) => {
                  itemRefs.current[ex.id] = el;
                }}
                className="overflow-hidden rounded-2xl border bg-card"
                style={{ borderColor: isOver ? "#2E8B57" : "#E7E0CD", opacity: isDragging ? 0.5 : 1 }}
              >
                <div className="flex w-full items-center gap-1 px-2 py-3">
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDragId(ex.id);
                    }}
                    className="shrink-0 touch-none p-1.5"
                    style={{ touchAction: "none", cursor: "grab" }}
                    aria-label="Zum Verschieben ziehen"
                  >
                    <GripVertical size={16} className="text-ink-soft" />
                  </button>
                  <button onClick={() => setOpenId(open ? null : ex.id)} className="flex min-w-0 flex-1 items-center justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-soft">
                        <Target size={14} className="text-gold" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="truncate text-sm font-medium text-ink">{ex.name}</div>
                        <div className="flex items-center tracking-widest">
                          <span className="text-[11px] text-gold">{starGlyphs(ex.masteryLevel)}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-ink-soft"
                      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
                    />
                  </button>
                </div>
                {open && (
                  <div className="space-y-3 px-4 pb-4">
                    {ex.verbalCommand && <ExerciseField label="Verbales Kommando" value={ex.verbalCommand} />}
                    {ex.handSignal && <ExerciseField label="Handzeichen" value={ex.handSignal} />}
                    {ex.goal && <ExerciseField label="Was soll Tilly tun?" value={ex.goal} />}
                    {ex.notes && <ExerciseField label="Notizen" value={ex.notes} />}
                    <button
                      onClick={() => {
                        setEditing(ex);
                        setMode("form");
                      }}
                      className="flex items-center gap-1.5 pt-1 text-xs text-teal"
                    >
                      <Pencil size={12} /> Bearbeiten
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
