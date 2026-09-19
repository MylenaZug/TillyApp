import {
  AlertTriangle,
  Euro,
  Heart,
  Scale,
  Stethoscope,
  Target,
  UtensilsCrossed,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "./types";

// Tailwind-Klassen + Hex-Werte muessen mit tailwind.config.ts uebereinstimmen
// (dort 1:1 aus dem alten App.jsx uebernommen, damit Look & Feel identisch bleibt).
export type CategoryMeta = {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  emoji?: string;
  text: string;
  bg: string;
  border: string;
  soft: string;
  hex: string;
  hexSoft: string;
};

export const CATEGORIES: CategoryMeta[] = [
  { id: "food", label: "Futter", icon: UtensilsCrossed, emoji: "🦴", text: "text-sage", bg: "bg-sage", border: "border-sage", soft: "bg-sage-soft", hex: "#0E7C86", hexSoft: "#D8EAEA" },
  { id: "stool", label: "Stuhlgang", icon: Waves, emoji: "💩", text: "text-rust", bg: "bg-rust", border: "border-rust", soft: "bg-rust-soft", hex: "#C0392B", hexSoft: "#F5DAD6" },
  { id: "training", label: "Training", icon: Target, emoji: "🎾", text: "text-gold", bg: "bg-gold", border: "border-gold", soft: "bg-gold-soft", hex: "#2E8B57", hexSoft: "#DCEEE2" },
  { id: "stress", label: "Stress", icon: Zap, text: "text-amber", bg: "bg-amber", border: "border-amber", soft: "bg-amber-soft", hex: "#3457D5", hexSoft: "#DCE3F8" },
  { id: "symptom", label: "Auffälligkeit", icon: AlertTriangle, text: "text-berry", bg: "bg-berry", border: "border-berry", soft: "bg-berry-soft", hex: "#E6B800", hexSoft: "#FBF0C9" },
  { id: "weight", label: "Gewicht", icon: Scale, text: "text-teal", bg: "bg-teal", border: "border-teal", soft: "bg-teal-soft", hex: "#B8860B", hexSoft: "#F3E7C9" },
  { id: "vet", label: "Tierarzt", icon: Stethoscope, text: "text-plum", bg: "bg-plum", border: "border-plum", soft: "bg-plum-soft", hex: "#7A5C8E", hexSoft: "#EAE3F0" },
  { id: "kosten", label: "Kosten", icon: Euro, text: "text-slate", bg: "bg-slate", border: "border-slate", soft: "bg-slate-soft", hex: "#546A7B", hexSoft: "#DCE4E8" },
  { id: "tagescheck", label: "Tagescheck", icon: Heart, text: "text-rose", bg: "bg-rose", border: "border-rose", soft: "bg-rose-soft", hex: "#B5537A", hexSoft: "#F3DCE6" },
];

// Tagescheck wird ausschliesslich ueber die "Heute"-Karte gepflegt, taucht daher nicht
// als eigene Kachel im "+"-Menue bzw. auf dem Startbildschirm auf.
export const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.id !== "tagescheck");

export const catMeta = (id: string): CategoryMeta => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

// Fuer recharts/inline-styles, die echte Farbwerte statt Tailwind-Klassen brauchen
// (SVG-Props wie stroke/fill akzeptieren keine Klassennamen). Einzige Quelle fuer
// diese beiden Werte, damit sie nicht in mehreren Dateien einzeln dupliziert werden.
export const CHART_COLORS = {
  hairline: "#E7E0CD",
  inkSoft: "#5B6B5E",
} as const;

export const KOSTEN_CATEGORIES = ["Futter", "Tierarzt", "Training", "Zubehör"];

export const STRESS_LEVELS = [
  { value: 1, label: "Mäßig" },
  { value: 2, label: "Hoch" },
  { value: 3, label: "Zuviel" },
];

export const STOOL_CONSISTENCY = ["Fest", "Weich", "Breiig", "Wässrig"];
export const STOOL_AMOUNTS = ["Viel", "Mittel", "Wenig"];
export const DAYTIME_OPTIONS = ["Morgens", "Mittags", "Abends"];
export const STOOL_COLORS = [
  { label: "Schwarz", hex: "#1E1B18" },
  { label: "Dunkelbraun", hex: "#4A2E1A" },
  { label: "Braun", hex: "#7B4B2A" },
  { label: "Hellbraun", hex: "#B98858" },
  { label: "Gelb", hex: "#D9B23C" },
  { label: "Grün", hex: "#5C7A3B" },
  { label: "Grau", hex: "#8C8C86" },
  { label: "Rot", hex: "#A6342E" },
];
export const STOOL_FLAGS = ["Blut", "Schleim", "Würmer", "Fremdkörper"];
export const SYMPTOM_CATEGORIES = ["Inhouse Poo", "Inhouse Pee", "Kotzen", "Unruhe", "Anderes"];

// Kategorien ohne Uhrzeit: nur Datum abfragen, Uhrzeit intern fix auf 12:00 setzen
export const CATEGORIES_WITH_TIME: CategoryId[] = ["food", "stool"];
export const CALENDAR_CATEGORY_IDS: CategoryId[] = ["training", "stress", "symptom", "stool"];
export const MASTERY_LABELS = ["Noch nicht begonnen", "Fängt an", "Übt noch", "Kann sie meistens", "Sitzt gut", "Beherrscht sie sicher"];
export const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Tillys Geburtsdatum - das Alter wird daraus bei jedem Oeffnen live berechnet
export const TILLY_BIRTHDATE = new Date(2026, 0, 19);
