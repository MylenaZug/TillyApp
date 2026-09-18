import { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Clock, Plus, X, Trash2, ChevronRight, ChevronLeft, ChevronDown,
  Scale, UtensilsCrossed, Stethoscope, AlertTriangle, Target, Waves, PawPrint, Check, BarChart3, Zap, BookOpen, Pencil, StickyNote, RotateCcw, Euro, Heart, Battery, GripVertical
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// ---------- design tokens ----------
const TILLY_PHOTO = "data:image/jpeg;base64,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";

const COLORS = {
  bg: "#FBF7EE",
  card: "#FFFFFF",
  ink: "#2B3B2F",
  inkSoft: "#5B6B5E",
  hairline: "#E7E0CD",
  gold: "#2E8B57",
  goldSoft: "#DCEEE2",
  teal: "#B8860B",
  tealSoft: "#F3E7C9",
  sage: "#0E7C86",
  sageSoft: "#D8EAEA",
  plum: "#7A5C8E",
  plumSoft: "#EAE3F0",
  rust: "#C0392B",
  rustSoft: "#F5DAD6",
  amber: "#3457D5",
  amberSoft: "#DCE3F8",
  berry: "#E6B800",
  berrySoft: "#FBF0C9",
  slate: "#546A7B",
  slateSoft: "#DCE4E8",
  rose: "#B5537A",
  roseSoft: "#F3DCE6",
};

const CATEGORIES = [
  { id: "food", label: "Futter", icon: UtensilsCrossed, emoji: "🦴", color: COLORS.sage, soft: COLORS.sageSoft },
  { id: "stool", label: "Stuhlgang", icon: Waves, emoji: "💩", color: COLORS.rust, soft: COLORS.rustSoft },
  { id: "training", label: "Training", icon: Target, emoji: "🎾", color: COLORS.gold, soft: COLORS.goldSoft },
  { id: "stress", label: "Stress", icon: Zap, color: COLORS.amber, soft: COLORS.amberSoft },
  { id: "symptom", label: "Auffälligkeit", icon: AlertTriangle, color: COLORS.berry, soft: COLORS.berrySoft },
  { id: "weight", label: "Gewicht", icon: Scale, color: COLORS.teal, soft: COLORS.tealSoft },
  { id: "vet", label: "Tierarzt", icon: Stethoscope, color: COLORS.plum, soft: COLORS.plumSoft },
  { id: "kosten", label: "Kosten", icon: Euro, color: COLORS.slate, soft: COLORS.slateSoft },
  { id: "tagescheck", label: "Tagescheck", icon: Heart, color: COLORS.rose, soft: COLORS.roseSoft },
];

const KOSTEN_CATEGORIES = ["Futter", "Tierarzt", "Training", "Zubehör"];

// Tagescheck wird ausschließlich über die "Heute"-Karte gepflegt, taucht daher nicht
// als eigene Kachel im "+"-Menü bzw. auf dem Startbildschirm auf.
const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.id !== "tagescheck");

function CatIcon({ cat, size = 16 }) {
  if (cat.emoji) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{cat.emoji}</span>;
  }
  const Icon = cat.icon;
  return <Icon size={size} color={cat.color} />;
}

const STRESS_LEVELS = [
  { value: 1, label: "Mäßig" },
  { value: 2, label: "Hoch" },
  { value: 3, label: "Zuviel" },
];

// Ordnet auch ältere Einträge (frühere Skala bis 5) noch sinnvoll einer der 3 aktuellen Stufen zu
function stressLabelFor(level) {
  const clamped = Math.min(STRESS_LEVELS.length, Math.max(1, Math.round(level) || 1));
  return STRESS_LEVELS[clamped - 1]?.label || "";
}

const STOOL_CONSISTENCY = ["Fest", "Weich", "Breiig", "Wässrig"];
const STOOL_AMOUNTS = ["Viel", "Mittel", "Wenig"];
const DAYTIME_OPTIONS = ["Morgens", "Mittags", "Abends"];
const STOOL_COLORS = [
  { label: "Schwarz", hex: "#1E1B18" },
  { label: "Dunkelbraun", hex: "#4A2E1A" },
  { label: "Braun", hex: "#7B4B2A" },
  { label: "Hellbraun", hex: "#B98858" },
  { label: "Gelb", hex: "#D9B23C" },
  { label: "Grün", hex: "#5C7A3B" },
  { label: "Grau", hex: "#8C8C86" },
  { label: "Rot", hex: "#A6342E" },
];
const STOOL_FLAGS = ["Blut", "Schleim", "Würmer", "Fremdkörper"];
const SYMPTOM_CATEGORIES = ["Inhouse Poo", "Inhouse Pee", "Kotzen", "Unruhe", "Anderes"];

const catMeta = (id) => CATEGORIES.find((c) => c.id === id);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Tillys Geburtsdatum – das Alter wird daraus bei jedem Öffnen live berechnet
const TILLY_BIRTHDATE = new Date(2026, 0, 19); // 19. Januar 2026

const DEFAULT_EXERCISES = [
  {
    name: "Ran",
    verbalCommand: "",
    handSignal: "Rechte Hand auf den Oberschenkel legen.",
    goal: "Tilly setzt sich rechts neben dich, nah am Bein, und schaut nach oben zu dir.",
    notes: "",
  },
  {
    name: "Sitz",
    verbalCommand: "Sitz",
    handSignal: "Flache Hand mit Handfläche nach oben langsam vom Boden nach oben führen.",
    goal: "Tilly setzt sich vor oder neben dich.",
    notes: "1. Leckerli über die Nase nach hinten oben führen, bis sie sich von selbst setzt.\n2. Kommando erst sagen, wenn sie sich setzt.\n3. Handbewegung nach und nach kleiner machen.",
  },
  {
    name: "Platz",
    verbalCommand: "Platz",
    handSignal: "Flache Hand mit Handfläche nach unten vom Bauch Richtung Boden führen.",
    goal: "Tilly legt sich mit Bauch und Ellbogen auf dem Boden ab.",
    notes: "1. Aus dem Sitz heraus üben.\n2. Leckerli langsam vom Näschen zum Boden führen.\n3. Erst belohnen, wenn die Ellbogen den Boden berühren.",
  },
  {
    name: "Bleib",
    verbalCommand: "Bleib",
    handSignal: "Flache Hand wie ein Stoppschild vor ihre Nase halten.",
    goal: "Tilly bleibt in Position (Sitz oder Platz), bis sie erlöst wird.",
    notes: "1. Erst nur 1–2 Sekunden Abstand halten, dann belohnen.\n2. Abstand und Zeit langsam steigern.\n3. Immer mit einem festen Erlösungswort beenden (z. B. „Okay“).",
  },
  {
    name: "Hier",
    verbalCommand: "Hier",
    handSignal: "Beide Arme seitlich ausbreiten und Richtung Körper führen.",
    goal: "Tilly kommt direkt zu dir und setzt sich vor dich.",
    notes: "1. Erst auf kurze Distanz ohne Ablenkung üben.\n2. Immer freudig und mit Belohnung empfangen, nie zum Schimpfen rufen.\n3. Distanz und Ablenkung langsam steigern.",
  },
  {
    name: "Fuß",
    verbalCommand: "Fuß",
    handSignal: "Linke Hand locker an der linken Hosennaht halten.",
    goal: "Tilly läuft entspannt auf Hüfthöhe links neben dir, ohne zu ziehen.",
    notes: "1. Erst im Stand üben, dann einzelne Schritte.\n2. Bei lockerer Leine sofort belohnen.\n3. Schrittzahl langsam steigern.",
  },
  {
    name: "Aus",
    verbalCommand: "Aus",
    handSignal: "Flache Hand mit Handfläche nach oben unter die Schnauze halten.",
    goal: "Tilly lässt einen Gegenstand aus dem Fang fallen.",
    notes: "1. Gegenstand gegen ein Leckerli tauschen, nicht wegreißen.\n2. Kommando erst sagen, wenn sie loslässt.\n3. Später den Tausch nur noch zufällig belohnen, nicht jedes Mal.",
  },
  {
    name: "Pfote",
    verbalCommand: "Pfote",
    handSignal: "Offene Hand mit der Handfläche nach oben knapp über dem Boden vor die Pfote halten.",
    goal: "Tilly legt eine Vorderpfote in deine Hand.",
    notes: "1. Aus dem Sitz heraus üben.\n2. Leichte Berührung an der Pfote abwarten und sofort belohnen.\n3. Nach und nach die volle Pfotenbewegung in die Hand abwarten.",
  },
  {
    name: "Klick für Blick",
    verbalCommand: "",
    handSignal: "Kein festes Handzeichen – reagiere auf jeden freiwilligen Blickkontakt.",
    goal: "Tilly schaut dir von sich aus in die Augen, auch bei Ablenkung.",
    notes: "1. Jeden zufälligen Blick zu dir sofort markieren (Klicker oder Wort) und belohnen.\n2. Schrittweise leichte Ablenkungen einbauen.\n3. Dauer des Blickkontakts langsam steigern, bevor belohnt wird.",
  },
  {
    name: "Touch",
    verbalCommand: "Touch",
    handSignal: "Flache Hand mit der Handfläche seitlich vor die Nase halten.",
    goal: "Tilly berührt deine Handfläche mit der Nase.",
    notes: "1. Hand nah an die Nase halten, jede Berührung belohnen.\n2. Abstand zur Hand langsam vergrößern.\n3. Später die Hand an verschiedene Positionen halten (hoch, tief, zur Seite).",
  },
  {
    name: "321 Übung",
    verbalCommand: "1, 2, 3",
    handSignal: "Kein festes Handzeichen – die Übung läuft über eine gleichmäßige Zählstimme, nicht über Gesten.",
    goal: "Tilly lernt: Auf die Zahl „3“ folgt zuverlässig ein Leckerli. Das gibt ihr Sicherheit und lenkt ihre Aufmerksamkeit entspannt auf dich statt auf Ablenkungen.",
    notes: "1. Nur „3“ sagen und sofort ein Leckerli geben. Mehrmals wiederholen.\n2. Zu „2, 3“ übergehen – das Leckerli gibt es weiterhin genau bei „3“.\n3. Zu „1, 2, 3“ übergehen – auch hier nur bei „3“ belohnen.\n4. Klappt das sicher, beim Zählen ein paar Schritte gehen und erst bei „3“ anhalten und belohnen – so kommt Bewegung rein.\n5. Später auch bei leichter Ablenkung einsetzen, um Tilly zu fokussieren.\n\nBasiert auf dem „1-2-3 Pattern Game“ von Leslie McDevitt (Control Unleashed).",
  },
  {
    name: "Geschirr & Halsband anlegen",
    verbalCommand: "",
    handSignal: "Kein festes Handzeichen – die Übung läuft über Gewöhnung in Minischritten, da Tilly hier großes Meideverhalten zeigt.",
    goal: "Tilly lässt sich Geschirr und Halsband entspannt anlegen, ohne wegzulaufen oder auszuweichen.",
    notes: "1. Geschirr/Halsband einfach in der Nähe liegen lassen (z. B. beim Füttern oder Spielen), ohne jede Interaktion – Tilly darf es in ihrem Tempo beschnuppern.\n2. Freiwilliges Interesse oder Annähern sofort belohnen.\n3. Geschirr kurz an sie heranhalten, ohne es anzulegen – bei entspanntem Verhalten belohnen, dann wieder wegnehmen.\n4. Geschirr ganz kurz auf den Rücken legen (nicht schließen), sofort wieder abnehmen + belohnen.\n5. Dauer in winzigen Schritten steigern, erst danach schließen/richtig anlegen.\n6. Halsband separat nach demselben Schema üben.\n7. Bei Anzeichen von Stress (Ducken, Weglaufen, Anspannung) einen Schritt zurückgehen – nie über Widerstand hinweg anlegen, lieber öfter kurz und entspannt üben als einmal lang und stressig.",
  },
  {
    name: "Down",
    verbalCommand: "Down",
    handSignal: "Zeigefinger auf den Boden richten, genau dort, wo Tilly ihre Schnauze hinlegen soll.",
    goal: "Tilly legt sich ganz flach hin, Schnauze auf dem Boden am Zeigefinger – langfristig auch im Stehen, wenn der Finger von oben nach unten zeigt.",
    notes: "1. Im Sitzen oder Knien anfangen: Zeigefinger auf den Boden legen, Leckerli darunter/davor halten, abwarten, bis Tilly sich mit der Schnauze ganz zum Finger runterlegt (flach, nicht nur Platz).\n2. Kommando „Down“ erst sagen, wenn sie in Position ist, dann sofort belohnen.\n3. Finger nur ein kleines Stück vom Boden abheben (z. B. 1–2 cm), gleiches Verhalten abwarten und belohnen.\n4. Abstand des Fingers vom Boden nach und nach weiter vergrößern.\n5. Irgendwann im Stehen üben: Finger von oben senkrecht nach unten zeigen lassen.\n6. Ziel erreicht, wenn im Stehen nach unten zeigen allein als Signal reicht.",
  },
];

function tillyAge() {
  const now = new Date();
  const diffDays = Math.floor((now - TILLY_BIRTHDATE) / 86400000);
  let years = now.getFullYear() - TILLY_BIRTHDATE.getFullYear();
  let months = now.getMonth() - TILLY_BIRTHDATE.getMonth();
  let days = now.getDate() - TILLY_BIRTHDATE.getDate();
  if (days < 0) months -= 1;
  if (months < 0) { years -= 1; months += 12; }

  // Restwochen seit dem letzten vollen Monats-Meilenstein berechnen
  const monthMark = new Date(TILLY_BIRTHDATE);
  monthMark.setFullYear(TILLY_BIRTHDATE.getFullYear() + years);
  monthMark.setMonth(TILLY_BIRTHDATE.getMonth() + months);
  const remainderDays = Math.floor((now - monthMark) / 86400000);
  const weeks = Math.max(0, Math.floor(remainderDays / 7));

  if (years === 0 && months === 0) {
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "Tag" : "Tage"} alt`;
    return `${weeks} ${weeks === 1 ? "Woche" : "Wochen"} alt`;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Jahr" : "Jahre"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Monat" : "Monate"}`);
  if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? "Woche" : "Wochen"}`);
  return parts.join(", ") + " alt";
}
const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const fmtDate = (iso) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysAgo = (iso) => Math.floor((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000);

function dateForOffset(offset) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - offset);
  return d;
}

function dayLabel(iso) {
  const d = daysAgo(iso);
  if (d === 0) return "Heute";
  if (d === 1) return "Gestern";
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function groupByDay(list) {
  const groups = [];
  list.forEach((e) => {
    const label = dayLabel(e.date);
    let g = groups.find((g) => g.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    g.items.push(e);
  });
  return groups;
}

// ---------- small building blocks ----------
function PawTrailLoader() {
  return (
    <div className="flex items-center justify-center h-full gap-2" style={{ color: COLORS.gold }}>
      {[0, 1, 2, 3].map((i) => (
        <PawPrint
          key={i}
          size={20}
          style={{
            opacity: 0.3,
            animation: `tillyPawFade 1.1s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`@keyframes tillyPawFade{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}`}</style>
    </div>
  );
}

function SharkTooth({ size = 22, fill }) {
  const filled = fill && fill !== "transparent";
  return (
    <span style={{ fontSize: size, lineHeight: 1, opacity: filled ? 1 : 0.25, filter: filled ? "none" : "grayscale(1)" }}>
      🦈
    </span>
  );
}

function StarRow({ value, onChange, color, label, icon: Icon = PawPrint }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm" style={{ color: COLORS.inkSoft }}>{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n === value ? 0 : n)}
            className="p-0.5 active:scale-90 transition-transform"
            aria-label={`${n} Sterne`}
          >
            <Icon size={22} color={color} fill={n <= value ? color : "transparent"} strokeWidth={1.75} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm border transition-colors"
      style={
        active
          ? { background: color, borderColor: color, color: "#fff" }
          : { background: "transparent", borderColor: COLORS.hairline, color: COLORS.ink }
      }
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }) {
  return <div className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSoft }}>{children}</div>;
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
      style={{ background: COLORS.bg, border: `1px solid ${COLORS.hairline}`, color: COLORS.ink }}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      rows={2}
      className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none resize-none"
      style={{ background: COLORS.bg, border: `1px solid ${COLORS.hairline}`, color: COLORS.ink }}
    />
  );
}

function PrimaryButton({ children, onClick, disabled, color = COLORS.ink }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl py-3 font-medium text-white active:scale-[0.98] transition-transform disabled:opacity-40"
      style={{ background: color }}
    >
      {children}
    </button>
  );
}

export default function TillyTracker() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState([]);
  const [trainingTypes, setTrainingTypes] = useState(["Sitz", "Leinenführigkeit", "Rückruf"]);
  const [foodTypes, setFoodTypes] = useState([]);
  const [symptomTypes, setSymptomTypes] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [generalNote, setGeneralNote] = useState("");
  const [noteStatus, setNoteStatus] = useState(""); // "", "saving", "saved"
  const noteTimerRef = useRef(null);
  const [foodPlan, setFoodPlan] = useState("");
  const [foodPlanStatus, setFoodPlanStatus] = useState("");
  const foodPlanTimerRef = useRef(null);
  const [view, setView] = useState("home");
  const [addCategory, setAddCategory] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  // ---------- load ----------
  useEffect(() => {
    (async () => {
      try {
        const [e, t, f, ex, gn, st, fp] = await Promise.allSettled([
          window.storage.get("tilly:entries", true),
          window.storage.get("tilly:training-types", true),
          window.storage.get("tilly:food-types", true),
          window.storage.get("tilly:exercises", true),
          window.storage.get("tilly:general-note", true),
          window.storage.get("tilly:symptom-types", true),
          window.storage.get("tilly:food-plan", true),
        ]);
        if (e.status === "fulfilled" && e.value) setEntries(JSON.parse(e.value.value));
        if (t.status === "fulfilled" && t.value) setTrainingTypes(JSON.parse(t.value.value));
        if (f.status === "fulfilled" && f.value) setFoodTypes(JSON.parse(f.value.value));
        if (gn.status === "fulfilled" && gn.value) setGeneralNote(gn.value.value);
        if (st.status === "fulfilled" && st.value) setSymptomTypes(JSON.parse(st.value.value));
        if (fp.status === "fulfilled" && fp.value) setFoodPlan(fp.value.value);
        if (ex.status === "fulfilled" && ex.value) {
          const stored = JSON.parse(ex.value.value);
          const existingNames = stored.map((e) => e.name.trim().toLowerCase());
          const missing = DEFAULT_EXERCISES.filter((d) => !existingNames.includes(d.name.trim().toLowerCase()));
          if (missing.length > 0) {
            const merged = [...stored, ...missing.map((m) => ({ ...m, id: uid(), masteryLevel: 0 }))];
            setExercises(merged);
            window.storage.set("tilly:exercises", JSON.stringify(merged), true).catch(() => {});
          } else {
            setExercises(stored);
          }
        } else {
          const seed = DEFAULT_EXERCISES.map((m) => ({ ...m, id: uid(), masteryLevel: 0 }));
          setExercises(seed);
          window.storage.set("tilly:exercises", JSON.stringify(seed), true).catch(() => {});
        }
      } catch (err) {
        console.error("Laden fehlgeschlagen", err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persistEntries = useCallback(async (next) => {
    setEntries(next);
    try {
      const res = await window.storage.set("tilly:entries", JSON.stringify(next), true);
      if (!res) setSaveError("Speichern hat nicht geklappt. Bitte nochmal versuchen.");
      else setSaveError("");
    } catch (err) {
      setSaveError("Speichern hat nicht geklappt. Bitte nochmal versuchen.");
    }
  }, []);

  const handleNoteChange = (text) => {
    setGeneralNote(text);
    setNoteStatus("saving");
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(async () => {
      try {
        await window.storage.set("tilly:general-note", text, true);
        setNoteStatus("saved");
        setTimeout(() => setNoteStatus(""), 1500);
      } catch (err) {
        console.error("Notiz speichern fehlgeschlagen", err);
        setNoteStatus("");
      }
    }, 600);
  };

  const handleFoodPlanChange = (text) => {
    setFoodPlan(text);
    setFoodPlanStatus("saving");
    if (foodPlanTimerRef.current) clearTimeout(foodPlanTimerRef.current);
    foodPlanTimerRef.current = setTimeout(async () => {
      try {
        await window.storage.set("tilly:food-plan", text, true);
        setFoodPlanStatus("saved");
        setTimeout(() => setFoodPlanStatus(""), 1500);
      } catch (err) {
        console.error("Futterplan speichern fehlgeschlagen", err);
        setFoodPlanStatus("");
      }
    }, 600);
  };

  const persistList = async (key, list, setter) => {
    setter(list);
    try {
      await window.storage.set(key, JSON.stringify(list), true);
    } catch (err) {
      console.error("Speichern der Liste fehlgeschlagen", err);
    }
  };

  const saveExercise = async (exercise) => {
    const exists = exercises.some((e) => e.id === exercise.id);
    const next = exists ? exercises.map((e) => (e.id === exercise.id ? exercise : e)) : [...exercises, exercise];
    await persistList("tilly:exercises", next, setExercises);
  };

  const reorderExercises = async (next) => {
    await persistList("tilly:exercises", next, setExercises);
  };

  const deleteExercise = async (id) => {
    await persistList("tilly:exercises", exercises.filter((e) => e.id !== id), setExercises);
  };

  // Setzt nur die erfassten Einträge (Futter, Stuhlgang, Training, Stress, Auffälligkeit, Gewicht, Tierarzt)
  // sowie die gemerkten Schnellauswahl-Listen zurück. Übungsbibliothek und allgemeine Notiz bleiben erhalten.
  const resetTrackedData = async () => {
    const defaultTrainingTypes = ["Sitz", "Leinenführigkeit", "Rückruf"];
    const resetExercises = exercises.map((e) => ({ ...e, masteryLevel: 0 }));
    try {
      const results = await Promise.allSettled([
        window.storage.set("tilly:entries", JSON.stringify([]), true),
        window.storage.set("tilly:training-types", JSON.stringify(defaultTrainingTypes), true),
        window.storage.set("tilly:food-types", JSON.stringify([]), true),
        window.storage.set("tilly:exercises", JSON.stringify(resetExercises), true),
      ]);
      const allOk = results.every((r) => r.status === "fulfilled" && r.value);
      if (!allOk) {
        setSaveError("Zurücksetzen hat nicht richtig gespeichert. Ist die App schon veröffentlicht? Bitte veröffentlichen und nochmal versuchen.");
      } else {
        setSaveError("");
      }
      setEntries([]);
      setTrainingTypes(defaultTrainingTypes);
      setFoodTypes([]);
      setExercises(resetExercises);
    } catch (err) {
      setSaveError("Zurücksetzen hat nicht vollständig geklappt. Bitte nochmal versuchen.");
    }
    setResetConfirmOpen(false);
  };

  const saveEntry = async (entry, options = {}) => {
    const exists = entries.some((e) => e.id === entry.id);
    const next = exists ? entries.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...entries];
    next.sort((a, b) => new Date(b.date) - new Date(a.date));
    await persistEntries(next);

    if (entry.type === "training" && entry.activity && !trainingTypes.includes(entry.activity)) {
      persistList("tilly:training-types", [entry.activity, ...trainingTypes], setTrainingTypes);
    }
    if (entry.type === "food" && entry.food && !foodTypes.includes(entry.food)) {
      persistList("tilly:food-types", [entry.food, ...foodTypes], setFoodTypes);
    }
    if (
      entry.type === "symptom" &&
      entry.category &&
      !SYMPTOM_CATEGORIES.includes(entry.category) &&
      !symptomTypes.includes(entry.category)
    ) {
      persistList("tilly:symptom-types", [entry.category, ...symptomTypes], setSymptomTypes);
    }

    if (options.silent) return;

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(`${catMeta(entry.type).label} ${exists ? "aktualisiert" : "gespeichert"} ✓`);
    toastTimerRef.current = setTimeout(() => setToast(""), 2200);

    setView("home");
    setAddCategory(null);
    setEditingId(null);
  };

  const deleteEntry = async (id) => {
    await persistEntries(entries.filter((e) => e.id !== id));
    setView("home");
    setAddCategory(null);
    setEditingId(null);
  };

  const openAdd = (catId, existing) => {
    setAddCategory(catId);
    setEditingId(existing ? existing.id : null);
    setPickerOpen(false);
    setView("add");
  };

  const latestByType = (type) => entries.find((e) => e.type === type);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <PawTrailLoader />
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col mx-auto relative overflow-hidden"
      style={{ background: COLORS.bg, maxWidth: 430, fontFamily: "ui-rounded, 'Segoe UI', system-ui, sans-serif" }}
    >
      {/* header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid ${COLORS.gold}` }}>
            <img src={TILLY_PHOTO} alt="Tilly" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none" style={{ color: COLORS.ink }}>Tilly</div>
            <div className="text-[11px]" style={{ color: COLORS.inkSoft }}>
              {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })} · {tillyAge()}
            </div>
          </div>
        </div>
        {view !== "add" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === "exercises" ? "home" : "exercises")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full"
              style={{ background: view === "exercises" ? COLORS.ink : COLORS.card, border: `1px solid ${COLORS.hairline}` }}
            >
              <BookOpen size={15} color={view === "exercises" ? "#fff" : COLORS.ink} />
              <span className="text-xs font-medium" style={{ color: view === "exercises" ? "#fff" : COLORS.ink }}>Übungen</span>
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="mx-5 mb-2 text-xs rounded-lg px-3 py-2" style={{ background: COLORS.rustSoft, color: COLORS.rust }}>
          {saveError}
        </div>
      )}

      {/* body */}
      <div className="flex-1 overflow-y-auto px-5 pb-3">
        {view === "home" && (
          <HomeView
            entries={entries}
            onOpenAdd={openAdd}
            generalNote={generalNote}
            onNoteChange={handleNoteChange}
            noteStatus={noteStatus}
            onRequestReset={() => setResetConfirmOpen(true)}
            onSaveEntry={saveEntry}
          />
        )}
        {view === "history" && (
          <HistoryView
            entries={entries}
            filter={historyFilter}
            setFilter={setHistoryFilter}
            onEdit={(entry) => openAdd(entry.type, entry)}
          />
        )}
        {view === "analysis" && <AnalysisView entries={entries} onAddWeight={() => openAdd("weight")} />}
        {view === "exercises" && <ExercisesView exercises={exercises} onSave={saveExercise} onDelete={deleteExercise} onReorder={reorderExercises} />}
        {view === "add" && (
          <EntryForm
            categoryId={addCategory}
            existing={editingId ? entries.find((e) => e.id === editingId) : null}
            trainingTypes={trainingTypes}
            foodTypes={foodTypes}
            exercises={exercises}
            symptomTypes={symptomTypes}
            foodPlan={foodPlan}
            onFoodPlanChange={handleFoodPlanChange}
            foodPlanStatus={foodPlanStatus}
            onSave={saveEntry}
            onDelete={editingId ? () => deleteEntry(editingId) : null}
            onCancel={() => { setView("home"); setAddCategory(null); setEditingId(null); }}
          />
        )}
      </div>

      {/* bottom nav */}
      {view !== "add" && (
        <div className="shrink-0 px-5 pb-5 pt-3 relative" style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
          <div className="flex items-center justify-between">
            <NavButton icon={Home} label="Start" active={view === "home"} onClick={() => setView("home")} />
            <NavButton icon={Clock} label="Verlauf" active={view === "history"} onClick={() => setView("history")} />
            <div className="w-11 shrink-0" />
            <NavButton icon={BarChart3} label="Auswertung" active={view === "analysis"} onClick={() => setView("analysis")} />
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{ background: COLORS.ink }}
            aria-label="Neuer Eintrag"
          >
            <Plus size={26} color="#fff" />
          </button>
        </div>
      )}

      {/* category picker sheet */}
      {pickerOpen && (
        <div className="absolute inset-0 flex items-end" style={{ background: "rgba(43,59,47,0.35)" }} onClick={() => setPickerOpen(false)}>
          <div
            className="w-full rounded-t-3xl p-5 pb-8"
            style={{ background: COLORS.card, maxWidth: 430, margin: "0 auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold" style={{ color: COLORS.ink }}>Was möchtest du eintragen?</div>
              <button onClick={() => setPickerOpen(false)}><X size={20} color={COLORS.inkSoft} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {ADDABLE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openAdd(c.id)}
                  className="flex flex-col items-center gap-2 rounded-2xl py-4 active:scale-95 transition-transform"
                  style={{ background: COLORS.bg, border: `1px solid ${COLORS.hairline}` }}
                >
                  <CatIcon cat={c} size={22} />
                  <span className="text-xs font-medium" style={{ color: COLORS.ink }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* reset confirmation sheet */}
      {resetConfirmOpen && (
        <div className="absolute inset-0 flex items-end" style={{ background: "rgba(43,59,47,0.35)" }} onClick={() => setResetConfirmOpen(false)}>
          <div
            className="w-full rounded-t-3xl p-5 pb-8"
            style={{ background: COLORS.card, maxWidth: 430, margin: "0 auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw size={18} color={COLORS.rust} />
              <div className="font-semibold" style={{ color: COLORS.ink }}>Eingegebene Daten zurücksetzen?</div>
            </div>
            <p className="text-sm mb-5" style={{ color: COLORS.inkSoft }}>
              Alle Einträge zu Futter, Stuhlgang, Training, Stress, Auffälligkeit, Gewicht und Tierarzt werden unwiderruflich gelöscht.
              Die Übungen selbst (Name, Handzeichen, Ziel) und die allgemeine Notiz bleiben erhalten – nur die Kompetenz-Sterne je Übung werden mit zurückgesetzt. Das betrifft auch die Daten deines Partners/deiner Partnerin.
            </p>
            <div className="space-y-2">
              <PrimaryButton onClick={resetTrackedData} color={COLORS.rust}>Ja, alles zurücksetzen</PrimaryButton>
              <button onClick={() => setResetConfirmOpen(false)} className="w-full py-2 text-sm" style={{ color: COLORS.inkSoft }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* save confirmation toast */}
      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 px-4 py-2 rounded-full shadow-lg" style={{ background: COLORS.ink }}>
          <span className="text-sm text-white font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 px-2">
      <Icon size={20} color={active ? COLORS.ink : COLORS.inkSoft} strokeWidth={active ? 2.3 : 1.8} />
      <span className="text-[11px]" style={{ color: active ? COLORS.ink : COLORS.inkSoft }}>{label}</span>
    </button>
  );
}

// ---------- Home ----------
function HomeView({ entries, onOpenAdd, generalNote, onNoteChange, noteStatus, onRequestReset, onSaveEntry }) {
  // Nur der gestrige Eintrag zählt: hoher Stress gestern → heute als Ruhetag vorschlagen
  const yesterdayStress = entries.find((e) => e.type === "stress" && daysAgo(e.date) === 1);
  const showStressAlert = yesterdayStress && yesterdayStress.level >= 2;
  const stressLabel = yesterdayStress ? stressLabelFor(yesterdayStress.level) : "";

  const todayCheck = entries.find((e) => e.type === "tagescheck" && daysAgo(e.date) === 0);
  const updateTodayCheck = (field, value) => {
    const base = todayCheck || { id: uid(), type: "tagescheck", date: nowLocalISO(), folgsamkeit: 0, geduld: 0, energie: 0, note: "" };
    onSaveEntry({ ...base, [field]: value }, { silent: true });
  };

  return (
    <div>
      {showStressAlert && (
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-2" style={{ background: COLORS.amberSoft }}>
          <Zap size={16} color={COLORS.amber} />
          <span className="text-sm" style={{ color: COLORS.amber }}>
            Gestern war Tillys Stresslevel „{stressLabel}“ – heute vielleicht einen Ruhetag einlegen?
          </span>
        </div>
      )}

      <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.hairline}` }}>
        <div className="flex items-center gap-1.5 text-sm font-semibold mb-1" style={{ color: COLORS.ink }}>
          <Heart size={15} color={COLORS.rose} /> Heute
        </div>
        <StarRow label="Folgsamkeit" value={todayCheck?.folgsamkeit || 0} onChange={(v) => updateTodayCheck("folgsamkeit", v)} color={COLORS.gold} />
        <div style={{ height: 1, background: COLORS.hairline }} />
        <StarRow label="Meine Geduld" value={todayCheck?.geduld || 0} onChange={(v) => updateTodayCheck("geduld", v)} color={COLORS.rose} icon={Battery} />
        <div style={{ height: 1, background: COLORS.hairline }} />
        <StarRow label="Sharklevel" value={todayCheck?.energie || 0} onChange={(v) => updateTodayCheck("energie", v)} color={COLORS.amber} icon={SharkTooth} />
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {ADDABLE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpenAdd(c.id)}
            className="flex flex-col items-center gap-1 rounded-xl py-2.5 active:scale-[0.95] transition-transform"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.hairline}` }}
          >
            <CatIcon cat={c} size={16} />
            <span className="text-[10px] font-medium leading-tight text-center" style={{ color: COLORS.ink }}>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-4 mt-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.hairline}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: COLORS.ink }}>
            <StickyNote size={15} color={COLORS.inkSoft} /> Notizen
          </div>
          <span className="text-[11px]" style={{ color: COLORS.inkSoft, minWidth: 44, textAlign: "right" }}>
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

      <div className="flex justify-end mt-3">
        <button
          onClick={onRequestReset}
          className="flex items-center gap-1 text-[11px]"
          style={{ color: COLORS.inkSoft, opacity: 0.6 }}
        >
          <RotateCcw size={11} /> Daten zurücksetzen
        </button>
      </div>
    </div>
  );
}

const CALENDAR_CATEGORY_IDS = ["training", "stress", "symptom", "stool"];

function dateKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function TwoWeekCalendar({ entries, onEdit }) {
  const today = startOfDay(new Date());
  const todayKey = dateKey(today);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = aktuelles Fenster, 1 = 2 Wochen zurück, ...
  const [selected, setSelected] = useState(todayKey);

  // Raster auf echte Kalenderwochen ausrichten: diese Woche (Mo–So) + die davor,
  // via weekOffset zusätzlich um ganze 2-Wochen-Blöcke in die Vergangenheit verschiebbar
  const mondayIdx = (today.getDay() + 6) % 7; // 0=Mo … 6=So
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - mondayIdx);
  const gridStart = new Date(startOfThisWeek);
  gridStart.setDate(startOfThisWeek.getDate() - 7 - weekOffset * 14);

  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  const gridEnd = days[13];

  const goToOffset = (next) => {
    setWeekOffset(next);
    const newStart = new Date(startOfThisWeek);
    newStart.setDate(startOfThisWeek.getDate() - 7 - next * 14);
    const newEnd = new Date(newStart);
    newEnd.setDate(newStart.getDate() + 13);
    setSelected(next === 0 ? todayKey : dateKey(newEnd));
  };

  const monthLabel = (() => {
    const startM = gridStart.toLocaleDateString("de-DE", { month: "long" });
    const endM = gridEnd.toLocaleDateString("de-DE", { month: "long" });
    const startY = gridStart.getFullYear();
    const endY = gridEnd.getFullYear();
    if (startM === endM && startY === endY) return `${startM} ${startY}`;
    if (startY === endY) return `${startM} – ${endM} ${startY}`;
    return `${startM} ${startY} – ${endM} ${endY}`;
  })();

  const catsForKey = (key) => {
    const ids = [];
    entries.forEach((e) => {
      if (CALENDAR_CATEGORY_IDS.includes(e.type) && dateKey(e.date) === key && !ids.includes(e.type)) ids.push(e.type);
    });
    return ids;
  };

  const selectedDate = new Date(selected);
  const selectedLabel =
    selected === todayKey ? "Heute" :
    selected === dateKey(new Date(today.getTime() - 86400000)) ? "Gestern" :
    `${selectedDate.toLocaleDateString("de-DE", { weekday: "long" })}, ${selectedDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`;
  const selectedEntries = entries.filter((e) => dateKey(e.date) === selected);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => goToOffset(weekOffset + 1)} className="p-1 rounded-full" style={{ background: COLORS.bg }} aria-label="Vorherige 2 Wochen">
          <ChevronLeft size={16} color={COLORS.ink} />
        </button>
        <div className="text-sm font-semibold" style={{ color: COLORS.ink }}>{monthLabel}</div>
        <button
          onClick={() => goToOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="p-1 rounded-full disabled:opacity-30"
          style={{ background: COLORS.bg }}
          aria-label="Nächste 2 Wochen"
        >
          <ChevronRight size={16} color={COLORS.ink} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS_DE.map((w) => (
          <div key={w} className="text-center text-[10px] uppercase" style={{ color: COLORS.inkSoft }}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {days.map((d) => {
          const key = dateKey(d);
          const cats = catsForKey(key);
          const isSelected = selected === key;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className="rounded-xl py-2 flex flex-col items-center gap-1"
              style={{
                background: isSelected ? COLORS.ink : COLORS.card,
                border: `1px solid ${isSelected ? COLORS.ink : isToday ? COLORS.gold : COLORS.hairline}`,
              }}
            >
              <span className="text-[13px] font-semibold" style={{ color: isSelected ? "#fff" : COLORS.ink }}>
                {d.getDate()}
              </span>
              <div className="flex gap-0.5 flex-wrap justify-center" style={{ minHeight: 6, maxWidth: 28 }}>
                {cats.slice(0, 4).map((catId) => (
                  <span key={catId} className="w-1.5 h-1.5 rounded-full" style={{ background: catMeta(catId).color }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
        {CATEGORIES.filter((c) => CALENDAR_CATEGORY_IDS.includes(c.id)).map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
            <span className="text-[10px]" style={{ color: COLORS.inkSoft }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>{selectedLabel}</div>
      {selectedEntries.length === 0 ? (
        <div className="text-sm text-center py-6" style={{ color: COLORS.inkSoft }}>Keine Einträge an diesem Tag.</div>
      ) : (
        <div className="space-y-2">
          {selectedEntries.map((e) => (
            <DayRow key={e.id} entry={e} onClick={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function DayRow({ entry, onClick }) {
  const meta = catMeta(entry.type);
  const showTime = CATEGORIES_WITH_TIME.includes(entry.type);
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick ? () => onClick(entry) : undefined}
      className="w-full text-left rounded-xl pl-3 pr-3 py-2.5 active:scale-[0.99] transition-transform"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.hairline}`, borderLeft: `3px solid ${meta.color}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-label={meta.label} title={meta.label}>
          <CatIcon cat={meta} size={13} />
        </div>
        {showTime && <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>{fmtTime(entry.date)}</span>}
      </div>
      <div className="text-[13px] mt-0.5 break-words" style={{ color: COLORS.inkSoft }}>{entrySummary(entry)}</div>
      {entry.note && (
        <div className="text-[12px] mt-1 italic break-words" style={{ color: COLORS.inkSoft }}>„{entry.note}“</div>
      )}
      {entry.type === "training" && (
        <div className="mt-1.5 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[12px]">
            <span style={{ color: COLORS.inkSoft, width: 58 }} className="shrink-0">Tilly</span>
            <span style={{ color: COLORS.gold, letterSpacing: 1 }}>{starGlyphs(entry.dogStars)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px]">
            <span style={{ color: COLORS.inkSoft, width: 58 }} className="shrink-0">Trainer:in</span>
            <span style={{ color: COLORS.teal, letterSpacing: 1 }}>{starGlyphs(entry.trainerStars)}</span>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

function entrySummary(e) {
  switch (e.type) {
    case "stool": return `${e.consistency}${e.stoolAmount ? " · " + e.stoolAmount : ""}${e.color ? " · " + e.color : ""}`;
    case "training": return e.activity;
    case "weight": return `${e.kg} kg${e.daytime ? " · " + e.daytime : ""}`;
    case "food": return `${e.food}${e.amount ? " · " + e.amount + " g" : ""}${e.cost ? ` · ${e.cost.toFixed(2)} €` : ""}`;
    case "vet": return `${e.reason || "Termin"}${e.cost ? ` · ${e.cost.toFixed(2)} €` : ""}`;
    case "symptom": return e.category;
    case "stress": return `${stressLabelFor(e.level)} (${e.level}/3)`;
    case "kosten": return `${e.category} · ${Number(e.amount).toFixed(2)} €`;
    case "tagescheck": return `Folgsamkeit ${starGlyphs(e.folgsamkeit)} · Geduld ${starGlyphs(e.geduld)} · Sharklevel ${starGlyphs(e.energie)}`;
    default: return "";
  }
}

function starGlyphs(n) {
  const count = n || 0;
  return "★".repeat(count) + "☆".repeat(5 - count);
}

function TimelineRow({ entry, onClick }) {
  const meta = catMeta(entry.type);
  return (
    <button onClick={onClick} className="relative flex items-start gap-3 pb-4 w-full text-left">
      <div
        className="absolute -left-4 w-4 h-4 rounded-full flex items-center justify-center"
        style={{ background: meta.soft, top: 2 }}
      >
        <PawPrint size={9} color={meta.color} />
      </div>
      <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.hairline}` }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: COLORS.ink }}>{meta.label}</span>
          <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>
            {CATEGORIES_WITH_TIME.includes(entry.type) ? fmtDateTime(entry.date) : fmtDate(entry.date)}
          </span>
        </div>
        <div className="text-[13px] mt-0.5 break-words" style={{ color: COLORS.inkSoft }}>{entrySummary(entry)}</div>
        {entry.type === "training" && (
          <div className="mt-1.5 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[12px]">
              <span style={{ color: COLORS.inkSoft, width: 58 }} className="shrink-0">Tilly</span>
              <span style={{ color: COLORS.gold, letterSpacing: 1 }}>{starGlyphs(entry.dogStars)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px]">
              <span style={{ color: COLORS.inkSoft, width: 58 }} className="shrink-0">Trainer:in</span>
              <span style={{ color: COLORS.teal, letterSpacing: 1 }}>{starGlyphs(entry.trainerStars)}</span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ---------- History ----------
function HistoryView({ entries, filter, setFilter, onEdit }) {
  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);
  return (
    <div>
      <div className="font-semibold mb-3" style={{ color: COLORS.ink }}>Verlauf</div>

      <div className="text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>Die letzten 2 Wochen</div>
      <TwoWeekCalendar entries={entries} onEdit={onEdit} />

      <div className="text-xs font-semibold mt-5 mb-2" style={{ color: COLORS.inkSoft }}>Alle Einträge</div>
      <div className="flex flex-wrap gap-2 pb-3">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} color={COLORS.ink}>Alle</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)} color={c.color}>{c.label}</Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-center py-10" style={{ color: COLORS.inkSoft }}>Keine Einträge in dieser Kategorie.</div>
      ) : (
        <div className="relative pl-4 mt-2">
          <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ background: COLORS.hairline }} />
          {filtered.map((e) => (
            <TimelineRow key={e.id} entry={e} onClick={() => onEdit(e)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Weight ----------
// ---------- Analysis ----------
const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
// JS getDay(): 0=So..6=Sa -> auf Mo-So-Reihenfolge ummünzen
const weekdayIndexMonFirst = (d) => (new Date(d).getDay() + 6) % 7;

function buildWeekdayCounts(entriesList) {
  const data = WEEKDAYS_DE.map((label) => ({ day: label, Anzahl: 0 }));
  entriesList.forEach((e) => { data[weekdayIndexMonFirst(e.date)].Anzahl += 1; });
  return data;
}

function WeekdayChart({ entriesList, color, unitLabel }) {
  const data = buildWeekdayCounts(entriesList);
  const activeDays = data.filter((d) => d.Anzahl > 0).length;
  return (
    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
      <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: COLORS.inkSoft }}>Nach Wochentag</div>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.hairline} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={22} />
            <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.hairline}`, fontSize: 12 }} />
            <Bar dataKey="Anzahl" radius={[5, 5, 0, 0]} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[12px] mt-2" style={{ color: COLORS.inkSoft }}>
        An {activeDays} von 7 Wochentagen {unitLabel} im gewählten Zeitraum.
      </div>
    </div>
  );
}

function HorizontalBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between text-[13px] mb-1">
        <span style={{ color: COLORS.ink }}>{label}</span>
        <span style={{ color: COLORS.inkSoft }}>{count}× · {pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.hairline }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SectionCard({ title, summary, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-2xl mb-3 overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.hairline}` }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-4">
        <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>{title}</span>
        <div className="flex items-center gap-2">
          {summary && <span className="text-xs" style={{ color: COLORS.inkSoft }}>{summary}</span>}
          <ChevronDown size={15} color={COLORS.inkSoft} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function AnalysisView({ entries, onAddWeight }) {
  const [range, setRange] = useState(7); // Tage, oder "all"

  const inRange = (e) => range === "all" || daysAgo(e.date) <= range;
  const stoolEntries = entries.filter((e) => e.type === "stool" && inRange(e));
  const symptomEntries = entries.filter((e) => e.type === "symptom" && inRange(e));
  const trainingEntries = entries.filter((e) => e.type === "training" && inRange(e));
  const stressEntries = entries.filter((e) => e.type === "stress" && inRange(e));
  const kostenEntries = entries.filter((e) => e.type === "kosten" && inRange(e));
  const kostenTotal = kostenEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const kostenByCategory = KOSTEN_CATEGORIES.map((cat) => ({
    label: cat,
    total: kostenEntries.filter((e) => e.category === cat).reduce((s, e) => s + (Number(e.amount) || 0), 0),
  })).filter((c) => c.total > 0);
  const weightEntries = entries.filter((e) => e.type === "weight" && inRange(e));
  const weightChartData = [...weightEntries].sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => ({
    date: fmtDate(e.date),
    kg: e.kg,
  }));
  const eur = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  // Stuhlgang: Konsistenz-Verteilung
  const consistencyCounts = STOOL_CONSISTENCY.map((c) => ({
    label: c,
    count: stoolEntries.filter((e) => e.consistency === c).length,
  }));
  // Auffälligkeiten
  const flagCounts = STOOL_FLAGS.map((f) => ({
    label: f,
    count: stoolEntries.filter((e) => (e.flags || []).includes(f)).length,
  })).filter((f) => f.count > 0);

  // Auffälligkeiten: Häufigkeit je Kategorie (inkl. eigener, frei eingetragener Bezeichnungen)
  const symptomCategoriesPresent = [...new Set(symptomEntries.map((e) => e.category))];
  const symptomCounts = symptomCategoriesPresent.map((c) => ({
    label: c,
    count: symptomEntries.filter((e) => e.category === c).length,
  })).filter((c) => c.count > 0).sort((a, b) => b.count - a.count);

  // Training: Verteilung nach Wochentag erfolgt in WeekdayChart

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold" style={{ color: COLORS.ink }}>Auswertung</div>
      </div>
      <div className="flex gap-2 mb-4">
        <Chip active={range === 7} onClick={() => setRange(7)} color={COLORS.ink}>7 Tage</Chip>
        <Chip active={range === 30} onClick={() => setRange(30)} color={COLORS.ink}>30 Tage</Chip>
        <Chip active={range === "all"} onClick={() => setRange("all")} color={COLORS.ink}>Gesamt</Chip>
      </div>

      {/* Stuhlgang */}
      <SectionCard title="Stuhlgang" summary={`${stoolEntries.length} Einträge`}>
        {stoolEntries.length === 0 ? (
          <div className="text-sm" style={{ color: COLORS.inkSoft }}>Keine Einträge in diesem Zeitraum.</div>
        ) : (
          <>
            {consistencyCounts.map((c) => (
              <HorizontalBar key={c.label} label={c.label} count={c.count} total={stoolEntries.length} color={COLORS.rust} />
            ))}
            {flagCounts.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
                <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: COLORS.inkSoft }}>Auffälligkeiten</div>
                <div className="flex flex-wrap gap-2">
                  {flagCounts.map((f) => (
                    <span key={f.label} className="text-xs px-2.5 py-1 rounded-full" style={{ background: COLORS.rustSoft, color: COLORS.rust }}>
                      {f.label} · {f.count}×
                    </span>
                  ))}
                </div>
              </div>
            )}
            <WeekdayChart entriesList={stoolEntries} color={COLORS.rust} unitLabel="gab es Stuhlgang-Einträge" />
          </>
        )}
      </SectionCard>

      {/* Auffälligkeiten */}
      <SectionCard title="Auffälligkeiten" summary={`${symptomEntries.length} Einträge`}>
        {symptomCounts.length === 0 ? (
          <div className="text-sm" style={{ color: COLORS.inkSoft }}>Keine Auffälligkeiten in diesem Zeitraum – gut so.</div>
        ) : (
          symptomCounts.map((c) => (
            <HorizontalBar key={c.label} label={c.label} count={c.count} total={symptomEntries.length} color={COLORS.berry} />
          ))
        )}
      </SectionCard>

      {/* Training */}
      <SectionCard title="Training nach Wochentag" summary={`${trainingEntries.length} Einheiten`}>
        {trainingEntries.length === 0 ? (
          <div className="text-sm" style={{ color: COLORS.inkSoft }}>Noch keine Trainingseinträge in diesem Zeitraum.</div>
        ) : (
          <WeekdayChart entriesList={trainingEntries} color={COLORS.gold} unitLabel="wurde trainiert" />
        )}
      </SectionCard>

      {/* Stress */}
      <SectionCard
        title="Stress"
        summary={stressEntries.length === 0 ? "0 Einträge" : `Ø ${(stressEntries.reduce((s, e) => s + (e.level || 0), 0) / stressEntries.length).toFixed(1)}`}
      >
        {stressEntries.length === 0 ? (
          <div className="text-sm" style={{ color: COLORS.inkSoft }}>Keine Stress-Einschätzungen in diesem Zeitraum.</div>
        ) : (
          <>
            {(() => {
              const avg = stressEntries.reduce((s, e) => s + (e.level || 0), 0) / stressEntries.length;
              const avgLabel = stressLabelFor(avg);
              return (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-bold" style={{ color: COLORS.amber }}>{avg.toFixed(1)}</span>
                  <span className="text-sm" style={{ color: COLORS.inkSoft }}>Ø Stresslevel · meist "{avgLabel}"</span>
                </div>
              );
            })()}
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...stressEntries].sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => ({ date: fmtDate(e.date), level: Math.min(3, e.level) }))}
                  margin={{ top: 6, right: 6, left: -24, bottom: 0 }}
                >
                  <CartesianGrid stroke={COLORS.hairline} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 3]} allowDecimals={false} tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={22} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.hairline}`, fontSize: 12 }} />
                  <Line type="monotone" dataKey="level" stroke={COLORS.amber} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.amber }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </SectionCard>

      {/* Gewicht */}
      <SectionCard
        title="Gewicht"
        summary={weightEntries.length > 0 ? `${[...weightEntries].sort((a, b) => new Date(b.date) - new Date(a.date))[0].kg} kg` : "–"}
      >
        {weightEntries.length === 0 ? (
          <div className="text-sm" style={{ color: COLORS.inkSoft }}>Keine Einträge in diesem Zeitraum.</div>
        ) : weightChartData.length < 2 ? (
          <div className="text-sm" style={{ color: COLORS.inkSoft }}>Noch nicht genug Daten für ein Diagramm – trag mindestens zwei Gewichte ein.</div>
        ) : (
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.hairline} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.hairline}`, fontSize: 12 }} />
                <Line type="monotone" dataKey="kg" stroke={COLORS.teal} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.teal }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <button onClick={onAddWeight} className="text-xs mt-3 px-3 py-1.5 rounded-full text-white" style={{ background: COLORS.teal }}>
          + Gewicht eintragen
        </button>
      </SectionCard>

      {/* Kosten */}
      <SectionCard title="Kosten" summary={kostenEntries.length > 0 ? eur(kostenTotal) : "–"}>
        {kostenEntries.length === 0 ? (
          <div className="text-sm" style={{ color: COLORS.inkSoft }}>Keine erfassten Kosten in diesem Zeitraum.</div>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold" style={{ color: COLORS.slate }}>{eur(kostenTotal)}</span>
              <span className="text-sm" style={{ color: COLORS.inkSoft }}>aus {kostenEntries.length} {kostenEntries.length === 1 ? "Eintrag" : "Einträgen"}</span>
            </div>
            {kostenByCategory.map((c) => {
              const pct = kostenTotal > 0 ? Math.round((c.total / kostenTotal) * 100) : 0;
              return (
                <div key={c.label} className="mb-2.5">
                  <div className="flex items-center justify-between text-[13px] mb-1">
                    <span style={{ color: COLORS.ink }}>{c.label}</span>
                    <span style={{ color: COLORS.inkSoft }}>{eur(c.total)} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.hairline }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS.slate }} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </SectionCard>
    </div>
  );
}
const MASTERY_LABELS = ["Noch nicht begonnen", "Fängt an", "Übt noch", "Kann sie meistens", "Sitzt gut", "Beherrscht sie sicher"];

function ExercisesView({ exercises, onSave, onDelete, onReorder }) {
  const [mode, setMode] = useState("list"); // "list" | "form"
  const [editing, setEditing] = useState(null); // null = neu, sonst Übung
  const [openId, setOpenId] = useState(exercises[0]?.id || null);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const itemRefs = useRef({});

  // Immer nach Sternchen sortiert (wenig oben, viel unten). Bei gleicher Sternezahl
  // entscheidet die Position im Array – genau die, die man per Ziehen verändert.
  const sorted = [...exercises].sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0));

  useEffect(() => {
    if (!dragId) return;
    const handleMove = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      let found = null;
      for (const ex of sorted) {
        const el = itemRefs.current[ex.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (y < rect.top + rect.height / 2) { found = ex.id; break; }
      }
      setOverId(found || sorted[sorted.length - 1]?.id || null);
    };
    const handleUp = () => {
      if (dragId && overId && dragId !== overId) {
        // Nur die Reihenfolge im Array ändern – Sternchen bleiben unangetastet.
        const ids = sorted.map((s) => s.id);
        const fromIdx = ids.indexOf(dragId);
        ids.splice(fromIdx, 1);
        const toIdx = ids.indexOf(overId);
        ids.splice(toIdx, 0, dragId);
        const reordered = ids.map((id) => exercises.find((e) => e.id === id));
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
  }, [dragId, overId, sorted, exercises, onReorder]);

  if (mode === "form") {
    return (
      <ExerciseForm
        existing={editing}
        onCancel={() => { setMode("list"); setEditing(null); }}
        onSave={(ex) => { onSave(ex); setMode("list"); setEditing(null); }}
        onDelete={editing ? () => { onDelete(editing.id); setMode("list"); setEditing(null); } : null}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold" style={{ color: COLORS.ink }}>Übungen</div>
        <button
          onClick={() => { setEditing(null); setMode("form"); }}
          className="text-xs px-3 py-1.5 rounded-full text-white flex items-center gap-1"
          style={{ background: COLORS.gold }}
        >
          <Plus size={13} /> Neue Übung
        </button>
      </div>

      {exercises.length > 1 && (
        <div className="mb-3">
          <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>Wenig Sterne oben, viel unten. Bei gleicher Sternezahl per Griff ziehen zum Umsortieren.</span>
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="text-sm text-center py-10" style={{ color: COLORS.inkSoft }}>
          Noch keine Übungen hinterlegt. Leg die erste an – z. B. mit Handzeichen und Ziel-Verhalten.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((ex) => {
            const open = openId === ex.id;
            const isDragging = dragId === ex.id;
            const isOver = overId === ex.id && dragId && dragId !== ex.id;
            return (
              <div
                key={ex.id}
                ref={(el) => { itemRefs.current[ex.id] = el; }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: COLORS.card,
                  border: `1px solid ${isOver ? COLORS.gold : COLORS.hairline}`,
                  opacity: isDragging ? 0.5 : 1,
                }}
              >
                <div className="w-full flex items-center gap-1 px-2 py-3">
                  <button
                    onPointerDown={(e) => { e.preventDefault(); setDragId(ex.id); }}
                    className="p-1.5 shrink-0 touch-none"
                    style={{ touchAction: "none", cursor: "grab" }}
                    aria-label="Zum Verschieben ziehen"
                  >
                    <GripVertical size={16} color={COLORS.inkSoft} />
                  </button>
                  <button
                    onClick={() => setOpenId(open ? null : ex.id)}
                    className="flex-1 flex items-center justify-between min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.goldSoft }}>
                        <Target size={14} color={COLORS.gold} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{ex.name}</div>
                        <div className="flex items-center" style={{ letterSpacing: 1 }}>
                          <span className="text-[11px]" style={{ color: COLORS.gold }}>{starGlyphs(ex.masteryLevel)}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown size={16} color={COLORS.inkSoft} className="shrink-0" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                  </button>
                </div>
                {open && (
                  <div className="px-4 pb-4 space-y-3">
                    {ex.verbalCommand && (
                      <ExerciseField label="Verbales Kommando" value={ex.verbalCommand} />
                    )}
                    {ex.handSignal && <ExerciseField label="Handzeichen" value={ex.handSignal} />}
                    {ex.goal && <ExerciseField label="Was soll Tilly tun?" value={ex.goal} />}
                    {ex.notes && <ExerciseField label="Notizen" value={ex.notes} />}
                    <button
                      onClick={() => { setEditing(ex); setMode("form"); }}
                      className="flex items-center gap-1.5 text-xs pt-1"
                      style={{ color: COLORS.teal }}
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

function ExerciseField({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSoft }}>{label}</div>
      <div className="text-[13px]" style={{ color: COLORS.ink, whiteSpace: "pre-line" }}>{value}</div>
    </div>
  );
}

function ExerciseForm({ existing, onSave, onCancel, onDelete }) {
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
      <div className="flex items-center justify-between mb-4 pt-1">
        <button onClick={onCancel} className="p-1"><X size={22} color={COLORS.inkSoft} /></button>
        <div className="font-semibold flex items-center gap-2" style={{ color: COLORS.ink }}>
          <BookOpen size={16} color={COLORS.gold} /> {existing ? "Übung bearbeiten" : "Neue Übung"}
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
          <div className="rounded-xl px-3 py-1" style={{ background: COLORS.bg, border: `1px solid ${COLORS.hairline}` }}>
            <StarRow label="Kompetenz" value={masteryLevel} onChange={setMasteryLevel} color={COLORS.gold} />
          </div>
          <div className="text-[11px] mt-1" style={{ color: COLORS.inkSoft }}>{MASTERY_LABELS[masteryLevel]}</div>
        </div>
        <div>
          <FieldLabel>Verbales Kommando (optional)</FieldLabel>
          <TextInput value={verbalCommand} onChange={(e) => setVerbalCommand(e.target.value)} placeholder="z. B. „Ran“" />
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

        <div className="pt-2 space-y-2">
          <PrimaryButton onClick={handleSave} disabled={!canSave} color={COLORS.gold}>
            {existing ? "Änderungen speichern" : "Übung speichern"}
          </PrimaryButton>
          {existing && onDelete && (
            <button onClick={onDelete} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm" style={{ color: COLORS.rust }}>
              <Trash2 size={14} /> Übung löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Entry form ----------
function nowLocalISO() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

// datetime-local braucht lokale Zeit als String (YYYY-MM-DDTHH:mm),
// nicht UTC — sonst verschiebt sich die Anzeige um die Zeitzonen-Differenz.
function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Kategorien ohne Uhrzeit: nur Datum abfragen, Uhrzeit intern fix auf 12:00 setzen
const CATEGORIES_WITH_TIME = ["food", "stool"];

function toLocalDateValue(iso) {
  return toLocalInputValue(iso).slice(0, 10);
}

function dateOnlyToISO(value) {
  return new Date(`${value}T12:00:00`).toISOString();
}

function EntryForm({ categoryId, existing, trainingTypes, foodTypes, exercises, symptomTypes, foodPlan, onFoodPlanChange, foodPlanStatus, onSave, onDelete, onCancel }) {
  const meta = catMeta(categoryId);
  const [date, setDate] = useState(existing ? existing.date : nowLocalISO());

  const [consistency, setConsistency] = useState(existing?.consistency || STOOL_CONSISTENCY[0]);
  const [stoolAmount, setStoolAmount] = useState(existing?.stoolAmount || STOOL_AMOUNTS[1]);
  const [color, setColor] = useState(existing?.color || STOOL_COLORS[0].label);
  const [flags, setFlags] = useState(existing?.flags || []);

  const [activity, setActivity] = useState(existing?.activity || "");
  // Übungen aus der Übungsbibliothek stehen automatisch mit zur Auswahl – wächst die
  // Bibliothek, wächst auch diese Liste, ohne dass hier etwas gepflegt werden muss.
  const combinedTrainingTypes = [...new Set([...(exercises || []).map((ex) => ex.name), ...trainingTypes])];
  const [dogStars, setDogStars] = useState(existing?.dogStars || 0);
  const [trainerStars, setTrainerStars] = useState(existing?.trainerStars || 0);

  const [kg, setKg] = useState(existing?.kg ?? "");
  const [daytime, setDaytime] = useState(existing?.daytime || DAYTIME_OPTIONS[0]);

  const [food, setFood] = useState(existing?.food || "");
  const [amount, setAmount] = useState(existing?.amount || "");

  const [reason, setReason] = useState(existing?.reason || "");
  const symptomOptions = [...new Set([...SYMPTOM_CATEGORIES.filter((c) => c !== "Anderes"), ...(symptomTypes || [])])];
  const symptomIsKnown = existing ? symptomOptions.includes(existing.category) : true;
  const [symptomCategory, setSymptomCategory] = useState(
    existing ? (symptomIsKnown ? existing.category : "Anderes") : symptomOptions[0]
  );
  const [customSymptom, setCustomSymptom] = useState(existing && !symptomIsKnown ? existing.category : "");

  const [level, setLevel] = useState(existing?.level || 0);

  const [kostenCategory, setKostenCategory] = useState(existing?.category || KOSTEN_CATEGORIES[0]);
  const [kostenAmount, setKostenAmount] = useState(existing?.amount ?? "");

  const [folgsamkeit, setFolgsamkeit] = useState(existing?.folgsamkeit || 0);
  const [geduld, setGeduld] = useState(existing?.geduld || 0);
  const [energie, setEnergie] = useState(existing?.energie || 0);

  const [note, setNote] = useState(existing?.note || "");

  const canSave =
    (categoryId === "stool") ||
    (categoryId === "training" && activity.trim().length > 0) ||
    (categoryId === "weight" && String(kg).trim().length > 0 && !isNaN(Number(kg))) ||
    (categoryId === "food" && food.trim().length > 0) ||
    (categoryId === "vet") ||
    (categoryId === "symptom") ||
    (categoryId === "stress" && level > 0) ||
    (categoryId === "kosten" && String(kostenAmount).trim().length > 0 && !isNaN(Number(kostenAmount))) ||
    (categoryId === "tagescheck");

  const handleSave = () => {
    const base = { id: existing?.id || uid(), type: categoryId, date, note: note.trim() };
    let entry = base;
    if (categoryId === "stool") entry = { ...base, consistency, color, flags, stoolAmount };
    if (categoryId === "training") entry = { ...base, activity: activity.trim(), dogStars, trainerStars };
    if (categoryId === "weight") entry = { ...base, kg: Number(kg), daytime };
    if (categoryId === "food") entry = { ...base, food: food.trim(), amount: amount !== "" ? Number(amount) : undefined };
    if (categoryId === "vet") entry = { ...base, reason: reason.trim() };
    if (categoryId === "symptom") entry = { ...base, category: symptomCategory === "Anderes" && customSymptom.trim() ? customSymptom.trim() : symptomCategory };
    if (categoryId === "stress") entry = { ...base, level };
    if (categoryId === "kosten") entry = { ...base, category: kostenCategory, amount: Number(kostenAmount) };
    if (categoryId === "tagescheck") entry = { ...base, folgsamkeit, geduld, energie };
    onSave(entry);
  };

  const toggleFlag = (f) => setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-4 pt-1">
        <button onClick={onCancel} className="p-1"><X size={22} color={COLORS.inkSoft} /></button>
        <div className="font-semibold flex items-center gap-2" style={{ color: COLORS.ink }}>
          <CatIcon cat={meta} size={16} /> {meta.label}
        </div>
        <div className="w-6" />
      </div>

      <div className="space-y-4">
        <div>
          <FieldLabel>{CATEGORIES_WITH_TIME.includes(categoryId) ? "Zeitpunkt" : "Tag"}</FieldLabel>
          {CATEGORIES_WITH_TIME.includes(categoryId) ? (
            <TextInput
              type="datetime-local"
              value={toLocalInputValue(date)}
              onChange={(e) => setDate(new Date(e.target.value).toISOString())}
            />
          ) : (
            <TextInput
              type="date"
              value={toLocalDateValue(date)}
              onChange={(e) => setDate(dateOnlyToISO(e.target.value))}
            />
          )}
        </div>

        {categoryId === "stool" && (
          <>
            <div>
              <FieldLabel>Konsistenz</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {STOOL_CONSISTENCY.map((c) => (
                  <Chip key={c} active={consistency === c} onClick={() => setConsistency(c)} color={meta.color}>{c}</Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Menge</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {STOOL_AMOUNTS.map((a) => (
                  <Chip key={a} active={stoolAmount === a} onClick={() => setStoolAmount(a)} color={meta.color}>{a}</Chip>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {combinedTrainingTypes.map((t) => (
                    <Chip key={t} active={activity === t} onClick={() => setActivity(t)} color={meta.color}>{t}</Chip>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl px-3 py-1" style={{ background: COLORS.bg, border: `1px solid ${COLORS.hairline}` }}>
              <StarRow label="Tilly" value={dogStars} onChange={setDogStars} color={COLORS.gold} />
              <div style={{ height: 1, background: COLORS.hairline }} />
              <StarRow label="Trainer:in" value={trainerStars} onChange={setTrainerStars} color={COLORS.teal} />
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
                  <Chip key={d} active={daytime === d} onClick={() => setDaytime(d)} color={meta.color}>{d}</Chip>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {foodTypes.slice(0, 8).map((t) => (
                    <Chip key={t} active={food === t} onClick={() => setFood(t)} color={meta.color}>{t}</Chip>
                  ))}
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Menge (g)</FieldLabel>
              <TextInput type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="z. B. 200" />
            </div>
            <div className="rounded-xl p-3" style={{ background: COLORS.bg, border: `1px solid ${COLORS.hairline}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Aktueller Futterplan</FieldLabel>
                <span className="text-[11px]" style={{ color: COLORS.inkSoft, minWidth: 44, textAlign: "right" }}>
                  {foodPlanStatus === "saving" ? "speichert…" : foodPlanStatus === "saved" ? "gespeichert" : ""}
                </span>
              </div>
              <TextArea
                value={foodPlan}
                onChange={(e) => onFoodPlanChange(e.target.value)}
                placeholder="z. B. Morgens 150g Nassfutter Huhn, Mittags Kauartikel, Abends 150g Trockenfutter…"
                rows={3}
              />
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
                <Chip key={c} active={symptomCategory === c} onClick={() => setSymptomCategory(c)} color={meta.color}>{c}</Chip>
              ))}
            </div>
            {symptomCategory === "Anderes" && (
              <div className="mt-2">
                <TextInput
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  placeholder="Eigene Bezeichnung eingeben…"
                />
              </div>
            )}
          </div>
        )}

        {categoryId === "stress" && (
          <div>
            <FieldLabel>Wie gestresst war Tilly heute? (eigene Einschätzung)</FieldLabel>
            <div className="space-y-2">
              {STRESS_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors"
                  style={
                    level === l.value
                      ? { background: meta.soft, borderColor: meta.color }
                      : { background: COLORS.bg, borderColor: COLORS.hairline }
                  }
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                    style={{ background: level === l.value ? meta.color : COLORS.hairline, color: level === l.value ? "#fff" : COLORS.inkSoft }}
                  >
                    {l.value}
                  </span>
                  <span className="text-sm" style={{ color: COLORS.ink }}>{l.label}</span>
                  {level === l.value && <Check size={16} color={meta.color} className="ml-auto" />}
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
                  <Chip key={c} active={kostenCategory === c} onClick={() => setKostenCategory(c)} color={meta.color}>{c}</Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Betrag (€)</FieldLabel>
              <TextInput type="number" step="0.01" inputMode="decimal" value={kostenAmount} onChange={(e) => setKostenAmount(e.target.value)} placeholder="z. B. 24.90" />
            </div>
            <div>
              <FieldLabel>Wofür genau? (optional)</FieldLabel>
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Leine, Spielzeug, Zeckenschutz…" />
            </div>
          </>
        )}

        {categoryId === "tagescheck" && (
          <div className="rounded-xl px-3 py-1" style={{ background: COLORS.bg, border: `1px solid ${COLORS.hairline}` }}>
            <StarRow label="Folgsamkeit" value={folgsamkeit} onChange={setFolgsamkeit} color={COLORS.gold} />
            <div style={{ height: 1, background: COLORS.hairline }} />
            <StarRow label="Meine Geduld" value={geduld} onChange={setGeduld} color={COLORS.rose} icon={Battery} />
            <div style={{ height: 1, background: COLORS.hairline }} />
            <StarRow label="Sharklevel" value={energie} onChange={setEnergie} color={COLORS.amber} icon={SharkTooth} />
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
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs"
                        style={{ borderColor: color === c.label ? COLORS.ink : COLORS.hairline, color: COLORS.ink }}
                      >
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: c.hex }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Auffälligkeiten</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {STOOL_FLAGS.map((f) => (
                      <Chip key={f} active={flags.includes(f)} onClick={() => toggleFlag(f)} color={COLORS.rust}>{f}</Chip>
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

        <div className="pt-2 space-y-2">
          <PrimaryButton onClick={handleSave} disabled={!canSave} color={meta.color}>
            {existing ? "Änderungen speichern" : "Eintrag speichern"}
          </PrimaryButton>
          {existing && onDelete && (
            <button onClick={onDelete} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm" style={{ color: COLORS.rust }}>
              <Trash2 size={14} /> Eintrag löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
