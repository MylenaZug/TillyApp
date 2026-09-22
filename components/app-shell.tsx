"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, BookOpen, Clock3, Home, Plus, RotateCcw, X } from "lucide-react";
import {
  deleteEntry,
  getKv,
  getPatience,
  listEntries,
  saveEntry,
  setKv,
  setMyPatience,
} from "@/lib/storage";
import { useSyncStatus, type SyncStatus } from "@/lib/storage/useSyncStatus";
import type { EntryRecord } from "@/lib/storage/types";
import { ADDABLE_CATEGORIES, SYMPTOM_CATEGORIES, catMeta } from "@/lib/tilly/constants";
import { daysAgo, dateKey, nowLocalISO, tillyAge } from "@/lib/tilly/helpers";
import type { AnyEntry, CategoryId, Exercise } from "@/lib/tilly/types";
import { CatIcon, PawTrailLoader, PrimaryButton } from "@/components/tilly/ui";
import { HomeView } from "@/components/tilly/HomeView";
import { HistoryView } from "@/components/tilly/HistoryView";
import { AnalysisView } from "@/components/tilly/AnalysisView";
import { ExercisesView } from "@/components/tilly/ExercisesView";
import { EntryForm } from "@/components/tilly/EntryForm";

const DEFAULT_TRAINING_TYPES = ["Sitz", "Leinenführigkeit", "Rückruf"];

function statusLabel(status: SyncStatus, pending: number) {
  if (status === "offline") return "Offline";
  if (status === "pending") return `${pending} ausstehend`;
  return "Synchronisiert";
}

function parseEntryRecord(record: EntryRecord): AnyEntry {
  try {
    const data = JSON.parse(record.data) as Record<string, unknown>;
    return { id: record.id, type: record.type as CategoryId, updatedAt: record.updatedAt, ...data } as AnyEntry;
  } catch {
    return {
      id: record.id,
      type: record.type as CategoryId,
      updatedAt: record.updatedAt,
      date: new Date(record.updatedAt).toISOString(),
    } as AnyEntry;
  }
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Home;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 px-2">
      <Icon size={20} className={active ? "text-ink" : "text-ink-soft"} strokeWidth={active ? 2.3 : 1.8} />
      <span className={`text-[11px] ${active ? "text-ink" : "text-ink-soft"}`}>{label}</span>
    </button>
  );
}

type View = "home" | "history" | "analysis" | "exercises" | "add";

export default function AppShell({ userEmail }: { userEmail: string }) {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<AnyEntry[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<string[]>(DEFAULT_TRAINING_TYPES);
  const [foodTypes, setFoodTypes] = useState<string[]>([]);
  const [symptomTypes, setSymptomTypes] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [generalNote, setGeneralNote] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [foodPlan, setFoodPlan] = useState("");
  const [foodPlanStatus, setFoodPlanStatus] = useState("");
  const foodPlanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [patience, setPatience] = useState(0);

  const [view, setView] = useState<View>("home");
  const [addCategory, setAddCategory] = useState<CategoryId | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<CategoryId | "all">("all");
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { status, pending } = useSyncStatus();

  async function refresh() {
    const records = await listEntries();
    const parsed = records.map(parseEntryRecord).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEntries(parsed);
  }

  useEffect(() => {
    (async () => {
      try {
        const [t, f, s, ex, gn, fp] = await Promise.all([
          getKv("training-types"),
          getKv("food-types"),
          getKv("symptom-types"),
          getKv("exercises"),
          getKv("general-note"),
          getKv("food-plan"),
        ]);
        if (t) setTrainingTypes(JSON.parse(t));
        if (f) setFoodTypes(JSON.parse(f));
        if (s) setSymptomTypes(JSON.parse(s));
        if (gn) setGeneralNote(gn);
        if (fp) setFoodPlan(fp);
        // Standanduebungen kommen als DB-Seed (siehe db/seed.ts) bereits befuellt aus dem
        // kv_store - hier nur noch laden, kein Runtime-Merge/Seed im Client mehr noetig.
        if (ex) setExercises(JSON.parse(ex));

        await Promise.all([refresh(), getPatience(userEmail, dateKey(new Date())).then(setPatience)]);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(""), 2200);
  }

  function openAdd(catId: CategoryId, existing?: AnyEntry) {
    setAddCategory(catId);
    setEditingId(existing ? existing.id : null);
    setPickerOpen(false);
    setView("add");
  }

  function closeForm() {
    setView("home");
    setAddCategory(null);
    setEditingId(null);
  }

  async function handleSaveEntry(data: Record<string, unknown>) {
    if (!addCategory) return;
    const isNew = !editingId;
    await saveEntry(editingId ?? undefined, addCategory, data);

    if (addCategory === "training" && typeof data.activity === "string" && data.activity && !trainingTypes.includes(data.activity)) {
      const next = [data.activity, ...trainingTypes];
      setTrainingTypes(next);
      void setKv("training-types", JSON.stringify(next));
    }
    if (addCategory === "food" && typeof data.food === "string" && data.food && !foodTypes.includes(data.food)) {
      const next = [data.food, ...foodTypes];
      setFoodTypes(next);
      void setKv("food-types", JSON.stringify(next));
    }
    if (
      addCategory === "symptom" &&
      typeof data.category === "string" &&
      data.category &&
      !SYMPTOM_CATEGORIES.includes(data.category) &&
      !symptomTypes.includes(data.category)
    ) {
      const next = [data.category, ...symptomTypes];
      setSymptomTypes(next);
      void setKv("symptom-types", JSON.stringify(next));
    }

    await refresh();
    showToast(`${catMeta(addCategory).label} ${isNew ? "gespeichert" : "aktualisiert"} ✓`);
    closeForm();
  }

  async function handleDeleteEntry() {
    if (!editingId) return;
    await deleteEntry(editingId);
    await refresh();
    closeForm();
  }

  const todayCheck = entries.find((e) => e.type === "tagescheck" && daysAgo(e.date) === 0);

  async function updateTodayCheck(field: "folgsamkeit" | "energie", value: number) {
    const base = todayCheck ?? { date: nowLocalISO(), folgsamkeit: 0, energie: 0, note: "" };
    const data = { ...base, [field]: value };
    await saveEntry(todayCheck?.id, "tagescheck", data);
    await refresh();
  }

  async function updatePatience(value: number) {
    setPatience(value);
    await setMyPatience(userEmail, dateKey(new Date()), value);
  }

  function handleNoteChange(text: string) {
    setGeneralNote(text);
    setNoteStatus("saving");
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(async () => {
      try {
        await setKv("general-note", text);
        setNoteStatus("saved");
        setTimeout(() => setNoteStatus(""), 1500);
      } catch {
        setNoteStatus("");
      }
    }, 600);
  }

  function handleFoodPlanChange(text: string) {
    setFoodPlan(text);
    setFoodPlanStatus("saving");
    if (foodPlanTimerRef.current) clearTimeout(foodPlanTimerRef.current);
    foodPlanTimerRef.current = setTimeout(async () => {
      try {
        await setKv("food-plan", text);
        setFoodPlanStatus("saved");
        setTimeout(() => setFoodPlanStatus(""), 1500);
      } catch {
        setFoodPlanStatus("");
      }
    }, 600);
  }

  async function saveExercise(exercise: Exercise) {
    const exists = exercises.some((e) => e.id === exercise.id);
    const next = exists ? exercises.map((e) => (e.id === exercise.id ? exercise : e)) : [...exercises, exercise];
    setExercises(next);
    await setKv("exercises", JSON.stringify(next));
  }

  async function reorderExercises(next: Exercise[]) {
    setExercises(next);
    await setKv("exercises", JSON.stringify(next));
  }

  async function deleteExercise(id: string) {
    const next = exercises.filter((e) => e.id !== id);
    setExercises(next);
    await setKv("exercises", JSON.stringify(next));
  }

  // Setzt nur die erfassten Eintraege sowie die gemerkten Schnellauswahl-Listen zurueck.
  // Uebungsbibliothek (Name/Handzeichen/Ziel) und allgemeine Notiz bleiben erhalten,
  // "Meine Geduld" ist persoenlich und wird hier ebenfalls nicht angefasst.
  async function resetTrackedData() {
    const resetExercises = exercises.map((e) => ({ ...e, masteryLevel: 0 }));
    await Promise.all(entries.map((e) => deleteEntry(e.id)));
    await Promise.all([
      setKv("training-types", JSON.stringify(DEFAULT_TRAINING_TYPES)),
      setKv("food-types", JSON.stringify([])),
      setKv("symptom-types", JSON.stringify([])),
      setKv("exercises", JSON.stringify(resetExercises)),
    ]);
    setTrainingTypes(DEFAULT_TRAINING_TYPES);
    setFoodTypes([]);
    setSymptomTypes([]);
    setExercises(resetExercises);
    await refresh();
    setResetConfirmOpen(false);
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <PawTrailLoader />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-screen max-w-[430px] flex-col overflow-hidden bg-bg">
      <span
        className={`absolute right-3 top-3 z-10 h-2.5 w-2.5 rounded-full ${
          status === "offline" ? "bg-rust" : status === "pending" ? "bg-amber" : "bg-sage"
        }`}
        title={`${userEmail} · ${statusLabel(status, pending)}`}
      />
      <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-gold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tilly-photo.jpg" alt="Tilly" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-lg font-bold leading-none text-ink">Tilly</div>
            <div className="text-[11px] text-ink-soft">
              {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })} · {tillyAge()}
            </div>
          </div>
        </div>
        {view !== "add" && (
          <button
            onClick={() => setView(view === "exercises" ? "home" : "exercises")}
            className={`flex items-center gap-2 rounded-full border border-hairline px-4 py-3 ${view === "exercises" ? "bg-ink" : "bg-card"}`}
          >
            <BookOpen size={20} className={view === "exercises" ? "text-white" : "text-ink"} />
            <span className={`text-sm font-medium ${view === "exercises" ? "text-white" : "text-ink"}`}>Übungen</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-3">
        {view === "home" && (
          <HomeView
            entries={entries}
            onOpenAdd={(catId) => openAdd(catId)}
            folgsamkeit={todayCheck?.folgsamkeit || 0}
            energie={todayCheck?.energie || 0}
            patience={patience}
            onUpdateFolgsamkeit={(v) => void updateTodayCheck("folgsamkeit", v)}
            onUpdateEnergie={(v) => void updateTodayCheck("energie", v)}
            onUpdatePatience={(v) => void updatePatience(v)}
            generalNote={generalNote}
            onNoteChange={handleNoteChange}
            noteStatus={noteStatus}
            onRequestReset={() => setResetConfirmOpen(true)}
          />
        )}
        {view === "history" && (
          <HistoryView entries={entries} filter={historyFilter} setFilter={setHistoryFilter} onEdit={(entry) => openAdd(entry.type, entry)} />
        )}
        {view === "analysis" && <AnalysisView entries={entries} onAddWeight={() => openAdd("weight")} />}
        {view === "exercises" && (
          <ExercisesView
            exercises={exercises}
            onSave={(ex) => void saveExercise(ex)}
            onDelete={(id) => void deleteExercise(id)}
            onReorder={(next) => void reorderExercises(next)}
          />
        )}
        {view === "add" && addCategory && (
          <EntryForm
            categoryId={addCategory}
            existing={editingId ? (entries.find((e) => e.id === editingId) ?? null) : null}
            trainingTypes={trainingTypes}
            foodTypes={foodTypes}
            exercises={exercises}
            symptomTypes={symptomTypes}
            foodPlan={foodPlan}
            onFoodPlanChange={handleFoodPlanChange}
            foodPlanStatus={foodPlanStatus}
            onSave={(data) => void handleSaveEntry(data)}
            onDelete={editingId ? () => void handleDeleteEntry() : null}
            onCancel={closeForm}
          />
        )}
      </div>

      {view !== "add" && (
        <div className="relative shrink-0 border-t border-hairline px-5 pb-5 pt-3">
          <div className="flex items-center justify-between">
            <NavButton icon={Home} label="Start" active={view === "home"} onClick={() => setView("home")} />
            <NavButton icon={Clock3} label="Verlauf" active={view === "history"} onClick={() => setView("history")} />
            <div className="w-11 shrink-0" />
            <NavButton icon={BarChart3} label="Auswertung" active={view === "analysis"} onClick={() => setView("analysis")} />
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-ink shadow-lg transition-transform active:scale-95"
            aria-label="Neuer Eintrag"
          >
            <Plus size={26} className="text-white" />
          </button>
        </div>
      )}

      {pickerOpen && (
        <div className="absolute inset-0 flex items-end bg-ink/30" onClick={() => setPickerOpen(false)}>
          <div className="mx-auto w-full max-w-[430px] rounded-t-3xl bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="font-semibold text-ink">Was möchtest du eintragen?</div>
              <button onClick={() => setPickerOpen(false)}>
                <X size={20} className="text-ink-soft" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {ADDABLE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openAdd(c.id)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-hairline bg-bg py-4 transition-transform active:scale-95"
                >
                  <CatIcon cat={c} size={22} />
                  <span className="text-xs font-medium text-ink">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {resetConfirmOpen && (
        <div className="absolute inset-0 flex items-end bg-ink/30" onClick={() => setResetConfirmOpen(false)}>
          <div className="mx-auto w-full max-w-[430px] rounded-t-3xl bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <RotateCcw size={18} className="text-rust" />
              <div className="font-semibold text-ink">Eingegebene Daten zurücksetzen?</div>
            </div>
            <p className="mb-5 text-sm text-ink-soft">
              Alle Einträge (Futter, Stuhlgang, Training, Stress, Auffälligkeit, Gewicht, Tierarzt, Kosten, Tagescheck) werden unwiderruflich
              gelöscht. Die Übungsbibliothek (Name, Handzeichen, Ziel) und die allgemeine Notiz bleiben erhalten – nur die Kompetenz-Sterne je Übung
              werden mit zurückgesetzt. Deine persönliche „Meine Geduld" bleibt ebenfalls erhalten. Das betrifft auch die Daten deines
              Partners/deiner Partnerin.
            </p>
            <div className="space-y-2">
              <PrimaryButton onClick={() => void resetTrackedData()} bgClass="bg-rust">
                Ja, alles zurücksetzen
              </PrimaryButton>
              <button onClick={() => setResetConfirmOpen(false)} className="w-full py-2 text-sm text-ink-soft">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 shadow-lg">
          <span className="text-sm font-medium text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}

