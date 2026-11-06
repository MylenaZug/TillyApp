"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, BookOpen, Clock3, Images, Plus, X } from "lucide-react";
import {
  deleteEntry,
  getKv,
  fetchEntriesSince,
  getLoadedFrom,
  isHistoryComplete,
  getPatience,
  loadEntries,
  listPatience,
  listEntries,
  saveEntry,
  setKv,
  setMyPatience,
} from "@/lib/storage";
import { useSyncStatus } from "@/lib/storage/useSyncStatus";
import { SyncButton } from "@/components/tilly/SyncButton";
import type { EntryRecord, PatienceRecord } from "@/lib/storage/types";
import { ADDABLE_CATEGORIES, SYMPTOM_CATEGORIES, catMeta } from "@/lib/tilly/constants";
import { dateKey, formatDuration, tillyAge, weightFeedback } from "@/lib/tilly/helpers";
import { aloneDurationMs, MIN_ALONE_DURATION_MS, roundToMinute } from "@/lib/tilly/alone";
import type { AnyEntry, CategoryId, Exercise, FoodPlanSlots } from "@/lib/tilly/types";
import { CatIcon, PawTrailLoader, PrimaryButton } from "@/components/tilly/ui";
import { HomeView } from "@/components/tilly/HomeView";
import { HistoryView } from "@/components/tilly/HistoryView";
import { AnalysisView } from "@/components/tilly/AnalysisView";
import { ExercisesView } from "@/components/tilly/ExercisesView";
import { GalleryView } from "@/components/tilly/GalleryView";
import { EntryForm } from "@/components/tilly/EntryForm";

const DEFAULT_TRAINING_TYPES = ["Sitz", "Leinenführigkeit", "Rückruf"];

function parseEntryRecord(record: EntryRecord): AnyEntry {
  return {
    ...record.data,
    id: record.id,
    type: record.type as CategoryId,
    updatedAt: record.updatedAt,
    startAt: record.startAt,
    endAt: record.endAt,
  } as AnyEntry;
}

// kv "alone-start" enthaelt die Startzeit als Epoch-ms-String; leer, wenn kein Timer laeuft.
function parseAloneStart(value: string | null): number | null {
  const ms = Number(value);
  return value && Number.isFinite(ms) && ms > 0 ? ms : null;
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Clock3;
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

type View = "home" | "history" | "analysis" | "exercises" | "gallery" | "add";

type ToastTone = "ok" | "warn";

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
  const [foodPlanSlots, setFoodPlanSlots] = useState<FoodPlanSlots>({});
  const [foodPlanStatus, setFoodPlanStatus] = useState("");
  const foodPlanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foodPlanSlotsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [patience, setPatience] = useState(0);
  const [allPatience, setAllPatience] = useState<PatienceRecord[]>([]);
  const [aloneStart, setAloneStart] = useState<number | null>(null);

  const [view, setView] = useState<View>("home");
  const [addCategory, setAddCategory] = useState<CategoryId | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<CategoryId | "all">("all");
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useSyncStatus();

  const [loadedFrom, setLoadedFrom] = useState<number | null>(null);
  const [historyComplete, setHistoryComplete] = useState(false);

  async function loadOlder(from?: number) {
    const current = await getLoadedFrom();
    if (current === null) return false;
    const ok = await loadEntries({ from: from ?? current - 30 * 24 * 60 * 60 * 1000 });
    await refresh();
    return ok;
  }

  // Beim Zurueckblaettern im Kalender bei Bedarf nachladen.
  async function ensureLoaded(date: Date) {
    const current = await getLoadedFrom();
    if (current !== null && date.getTime() < current && !(await isHistoryComplete())) await loadOlder(date.getTime());
  }

  const loadAllEntries = useCallback(async () => (await fetchEntriesSince(0)).map(parseEntryRecord), []);

  async function refresh() {
    setLoadedFrom(await getLoadedFrom());
    setHistoryComplete(await isHistoryComplete());
    const records = await listEntries();
    const parsed = records.map(parseEntryRecord).sort((a, b) => b.startAt - a.startAt);
    setEntries(parsed);
  }

  // Liest Einstellungen, Eintraege und Geduld aus dem lokalen Store. Laeuft beim Start und nach
  // jedem Sync - beim allerersten Start ist der Store beim Rendern noch leer.
  async function loadFromStore(afterSync: boolean) {
    const [t, f, s, ex, gn, fp, fps, as] = await Promise.all([
      getKv("training-types"),
      getKv("food-types"),
      getKv("symptom-types"),
      getKv("exercises"),
      getKv("general-note"),
      getKv("food-plan"),
      getKv("food-plan-slots"),
      getKv("alone-start"),
    ]);
    if (t) setTrainingTypes(JSON.parse(t));
    if (f) setFoodTypes(JSON.parse(f));
    if (s) setSymptomTypes(JSON.parse(s));
    // Eine gerade getippte Notiz nicht durch den Serverstand ueberschreiben.
    if (gn !== null && !(afterSync && noteTimerRef.current)) setGeneralNote(gn);
    if (fp !== null && !(afterSync && foodPlanTimerRef.current)) setFoodPlan(fp);
    if (fps) setFoodPlanSlots(JSON.parse(fps));
    setAloneStart(parseAloneStart(as));
    // Standanduebungen kommen als DB-Seed (siehe db/seed.ts) bereits befuellt aus dem
    // kv_store - hier nur noch laden, kein Runtime-Merge/Seed im Client mehr noetig.
    if (ex) setExercises(JSON.parse(ex));

    await Promise.all([refresh(), getPatience(userEmail, dateKey(new Date())).then(setPatience), listPatience().then(setAllPatience)]);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadFromStore(false);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // Die Uebungen zeigen die letzten Trainings - auch die, die ausserhalb des Startfensters liegen.
  useEffect(() => {
    if (view !== "exercises") return;
    void loadEntries({ from: 0, type: "training" }).then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Alles, was per Sync kommt (Eintraege, Einstellungen, Geduld der anderen), neu einlesen -
  // aber nur, wenn ein Pull lokal wirklich etwas geaendert hat.
  useEffect(() => {
    if (sync.dataVersion === 0) return;
    void loadFromStore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.dataVersion]);

  // Toast, sobald neue Eintraege vom Server abgelehnt wurden.
  const rejectedCount = Object.keys(sync.rejected).length;
  const prevRejectedCount = useRef(0);
  useEffect(() => {
    if (rejectedCount > prevRejectedCount.current) {
      showToast(`${rejectedCount} ${rejectedCount === 1 ? "Eintrag" : "Einträge"} vom Server abgelehnt · bitte im Verlauf prüfen`, "warn");
    }
    prevRejectedCount.current = rejectedCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectedCount]);

  // Meldungen: "<Gegenstand> <Vorgang>", Zusatzinfo nach " · ", kein Emoji.
  // Rueckmeldung zum Klick auf den Sync-Button.
  async function handleManualSync() {
    const result = await sync.syncNow();
    if (!result) return;
    switch (result.status) {
      case "ok": {
        const parts = [
          result.pushed > 0 ? `${result.pushed} gesendet` : "",
          result.pulled > 0 ? `${result.pulled} empfangen` : "",
        ].filter(Boolean);
        showToast(`Sync abgeschlossen · ${parts.length ? parts.join(", ") : "alles aktuell"}`);
        break;
      }
      case "offline":
        showToast("Sync nicht möglich · offline", "warn");
        break;
      case "outdated":
        showToast("Sync nicht möglich · App veraltet, bitte neu laden", "warn");
        break;
      case "busy":
        showToast("Sync läuft bereits");
        break;
      default:
        showToast("Sync fehlgeschlagen · wird erneut versucht", "warn");
    }
  }

  function showToast(message: string, tone: ToastTone = "ok") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    // Laengere Rueckmeldungen (z.B. der Gewichts-Vergleich) brauchen mehr Lesezeit.
    const duration = tone === "warn" ? 6000 : message.length > 30 ? 4200 : 2200;
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
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

  async function handleSaveEntry(data: Record<string, unknown>, range: { startAt: number; endAt: number }) {
    if (!addCategory) return;
    const isNew = !editingId;
    await saveEntry(editingId ?? undefined, addCategory, data, range);

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

    const weightMessage =
      addCategory === "weight" && typeof data.kg === "number" && !Number.isNaN(data.kg)
        ? weightFeedback(
            data.kg,
            typeof data.daytime === "string" ? data.daytime : undefined,
            entries.filter((e) => e.type === "weight" && e.id !== editingId),
          )
        : null;

    await refresh();
    showToast(weightMessage ? `Gewicht ${isNew ? "gespeichert" : "aktualisiert"} · ${weightMessage}` : `${catMeta(addCategory).label} ${isNew ? "gespeichert" : "aktualisiert"}`);
    closeForm();
  }

  async function handleDeleteEntry() {
    if (!editingId) return;
    await deleteEntry(editingId);
    await refresh();
    closeForm();
  }

  const todayCheck = entries.find((e) => e.type === "tagescheck" && dateKey(e.startAt) === dateKey(new Date()));

  async function updateTodayCheck(field: "folgsamkeit" | "energie", value: number) {
    const data = {
      folgsamkeit: todayCheck?.folgsamkeit ?? 0,
      energie: todayCheck?.energie ?? 0,
      note: todayCheck?.note ?? "",
      [field]: value,
    };
    const at = todayCheck?.startAt ?? Date.now();
    await saveEntry(todayCheck?.id, "tagescheck", data, { startAt: at, endAt: at });
    await refresh();
  }

  async function updatePatience(value: number) {
    setPatience(value);
    await setMyPatience(userEmail, dateKey(new Date()), value);
    setAllPatience(await listPatience());
  }

  function handleNoteChange(text: string) {
    setGeneralNote(text);
    setNoteStatus("saving");
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(async () => {
      try {
        noteTimerRef.current = null;
        await setKv("general-note", text, { deferSync: true });
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
        foodPlanTimerRef.current = null;
        await setKv("food-plan", text, { deferSync: true });
        setFoodPlanStatus("saved");
        setTimeout(() => setFoodPlanStatus(""), 1500);
      } catch {
        setFoodPlanStatus("");
      }
    }, 600);
  }

  function handleFoodPlanSlotsChange(next: FoodPlanSlots) {
    setFoodPlanSlots(next);
    setFoodPlanStatus("saving");
    if (foodPlanSlotsTimerRef.current) clearTimeout(foodPlanSlotsTimerRef.current);
    foodPlanSlotsTimerRef.current = setTimeout(async () => {
      try {
        await setKv("food-plan-slots", JSON.stringify(next));
        setFoodPlanStatus("saved");
        setTimeout(() => setFoodPlanStatus(""), 1500);
      } catch {
        setFoodPlanStatus("");
      }
    }, 600);
  }

  // Ein-Tap-Bestaetigung fuer eine geplante Mahlzeit von der Startseite aus - legt den
  // Eintrag 1:1 wie im Plan hinterlegt an, ohne das volle Formular zu oeffnen.
  async function confirmFoodPlanSlot(daytime: string) {
    const slot = foodPlanSlots[daytime];
    if (!slot || !slot.food.trim()) return;
    const data = { food: slot.food.trim(), amount: slot.amount, amountUnit: slot.amountUnit, daytime };
    const at = Date.now();
    await saveEntry(undefined, "food", data, { startAt: at, endAt: at });
    if (!foodTypes.includes(slot.food.trim())) {
      const next = [slot.food.trim(), ...foodTypes];
      setFoodTypes(next);
      void setKv("food-types", JSON.stringify(next));
    }
    await refresh();
    showToast(`${catMeta("food").label} gespeichert`);
  }

  async function startAloneTimer() {
    const startedAt = Date.now();
    setAloneStart(startedAt);
    await setKv("alone-start", String(startedAt));
  }

  async function stopAloneTimer() {
    if (!aloneStart) return;
    const actualEnd = Date.now();
    const actualDurationMs = actualEnd - aloneStart;
    const startedAt = roundToMinute(aloneStart);
    const endedAt = roundToMinute(actualEnd);
    const ms = aloneDurationMs(startedAt, endedAt);
    setAloneStart(null);
    await setKv("alone-start", "");
    if (actualDurationMs < MIN_ALONE_DURATION_MS || ms < MIN_ALONE_DURATION_MS || !startedAt || !endedAt) {
      showToast("Allein-Zeit nicht gespeichert · unter 1 Minute", "warn");
      return;
    }
    await saveEntry(undefined, "alone", {}, { startAt: startedAt, endAt: endedAt });
    await refresh();
    showToast(`Allein-Zeit gespeichert · ${formatDuration(ms)}`);
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

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <PawTrailLoader />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-bg">
      <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          {/* Beim Erstellen/Bearbeiten bricht der Home-Button ab (wie das X), speichert also nicht. */}
          <button
            onClick={() => (view === "add" ? closeForm() : setView("home"))}
            aria-label="Start"
            className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-gold"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tilly-photo.jpg" alt="Tilly" className="h-full w-full object-cover" />
          </button>
          <div>
            <div className="text-lg font-bold leading-none text-ink">Tilly</div>
            <div className="text-[11px] text-ink-soft">
              {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })} · {tillyAge()}
            </div>
          </div>
        </div>
        <div className="relative">
          <SyncButton {...sync} syncNow={handleManualSync} userEmail={userEmail} />
          {toast && (
            <div
              role="status"
              className={`absolute right-0 top-full z-50 mt-2.5 w-max max-w-[min(80vw,320px)] rounded-2xl px-4 py-2.5 shadow-lg ${toast.tone === "warn" ? "bg-red-700" : "bg-ink"}`}
            >
              <span
                aria-hidden
                className={`absolute -top-1 right-3.5 h-3 w-3 rotate-45 rounded-sm ${toast.tone === "warn" ? "bg-red-700" : "bg-ink"}`}
              />
              <span className="relative text-sm font-medium text-white">{toast.message}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-3">
        {view === "home" && (
          <HomeView
            entries={entries}
            onOpenAdd={(catId) => openAdd(catId)}
            folgsamkeit={todayCheck?.folgsamkeit || 0}
            energie={todayCheck?.energie || 0}
            patience={patience}
            userEmail={userEmail}
            allPatience={allPatience}
            onUpdateFolgsamkeit={(v) => void updateTodayCheck("folgsamkeit", v)}
            onUpdateEnergie={(v) => void updateTodayCheck("energie", v)}
            onUpdatePatience={(v) => void updatePatience(v)}
            generalNote={generalNote}
            onNoteChange={handleNoteChange}
            noteStatus={noteStatus}
            foodPlanSlots={foodPlanSlots}
            onConfirmFoodSlot={(daytime) => void confirmFoodPlanSlot(daytime)}
            aloneStart={aloneStart}
            onStartAlone={() => void startAloneTimer()}
            onStopAlone={() => void stopAloneTimer()}
            onEditEntry={(entry) => openAdd(entry.type, entry)}
          />
        )}
        {view === "history" && (
          <HistoryView patience={allPatience} loadedFrom={loadedFrom} historyComplete={historyComplete} rejected={sync.rejected} onLoadOlder={() => loadOlder()} onReachDate={(d) => void ensureLoaded(d)} entries={entries} filter={historyFilter} setFilter={setHistoryFilter} onEdit={(entry) => openAdd(entry.type, entry)} />
        )}
        {view === "analysis" && <AnalysisView entries={entries} loadAll={loadAllEntries} onAddWeight={() => openAdd("weight")} />}
        {view === "gallery" && <GalleryView />}
        {view === "exercises" && (
          <ExercisesView
            exercises={exercises}
            entries={entries}
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
            foodPlanSlots={foodPlanSlots}
            onFoodPlanSlotsChange={handleFoodPlanSlotsChange}
            foodPlanStatus={foodPlanStatus}
            onSave={(data, range) => void handleSaveEntry(data, range)}
            onDelete={editingId ? () => void handleDeleteEntry() : null}
            onCancel={closeForm}
          />
        )}
      </div>

      {view !== "add" && (
        <div
          className="relative shrink-0 border-t border-hairline px-5 pt-3"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center justify-between">
            <NavButton icon={BookOpen} label="Übungen" active={view === "exercises"} onClick={() => setView("exercises")} />
            <NavButton icon={Images} label="Galerie" active={view === "gallery"} onClick={() => setView("gallery")} />
            <div className="w-11 shrink-0" />
            <NavButton icon={Clock3} label="Verlauf" active={view === "history"} onClick={() => setView("history")} />
            <NavButton icon={BarChart3} label="Auswertung" active={view === "analysis"} onClick={() => setView("analysis")} />
          </div>
          {view !== "home" && (
            <button
              onClick={() => setPickerOpen(true)}
              className="absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-ink shadow-lg transition-transform active:scale-95"
              aria-label="Neuer Eintrag"
            >
              <Plus size={26} className="text-white" />
            </button>
          )}
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


    </div>
  );
}
