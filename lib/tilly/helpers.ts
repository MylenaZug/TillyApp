import { STRESS_LEVELS, TILLY_BIRTHDATE } from "./constants";
import type { AnyEntry } from "./types";

export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function tillyAge(): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - TILLY_BIRTHDATE.getTime()) / 86400000);
  let years = now.getFullYear() - TILLY_BIRTHDATE.getFullYear();
  let months = now.getMonth() - TILLY_BIRTHDATE.getMonth();
  let days = now.getDate() - TILLY_BIRTHDATE.getDate();
  if (days < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const monthMark = new Date(TILLY_BIRTHDATE);
  monthMark.setFullYear(TILLY_BIRTHDATE.getFullYear() + years);
  monthMark.setMonth(TILLY_BIRTHDATE.getMonth() + months);
  const remainderDays = Math.floor((now.getTime() - monthMark.getTime()) / 86400000);
  const weeks = Math.max(0, Math.floor(remainderDays / 7));

  if (years === 0 && months === 0) {
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "Tag" : "Tage"} alt`;
    return `${weeks} ${weeks === 1 ? "Woche" : "Wochen"} alt`;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Jahr" : "Jahre"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Monat" : "Monate"}`);
  if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? "Woche" : "Wochen"}`);
  return parts.join(", ") + " alt";
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

export const startOfDay = (d: Date | string) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const daysAgo = (iso: string) =>
  Math.floor((startOfDay(new Date()).getTime() - startOfDay(new Date(iso)).getTime()) / 86400000);

export function dateForOffset(offset: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - offset);
  return d;
}

export function dayLabel(iso: string) {
  const d = daysAgo(iso);
  if (d === 0) return "Heute";
  if (d === 1) return "Gestern";
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function groupByDay<T extends { date: string }>(list: T[]) {
  const groups: { label: string; items: T[] }[] = [];
  list.forEach((e) => {
    const label = dayLabel(e.date);
    let g = groups.find((group) => group.label === label);
    if (!g) {
      g = { label, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  });
  return groups;
}

// Ordnet auch aeltere Eintraege noch sinnvoll einer der 3 aktuellen Stufen zu
export function stressLabelFor(level: number) {
  const clamped = Math.min(STRESS_LEVELS.length, Math.max(1, Math.round(level) || 1));
  return STRESS_LEVELS[clamped - 1]?.label || "";
}

export function starGlyphs(n?: number) {
  const count = n || 0;
  return "★".repeat(count) + "☆".repeat(5 - count);
}

export function nowLocalISO() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

// datetime-local braucht lokale Zeit als String (YYYY-MM-DDTHH:mm),
// nicht UTC - sonst verschiebt sich die Anzeige um die Zeitzonen-Differenz.
export function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalDateValue(iso: string) {
  return toLocalInputValue(iso).slice(0, 10);
}

export function dateOnlyToISO(value: string) {
  return new Date(`${value}T12:00:00`).toISOString();
}

export function dateKey(d: Date | string) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

// Fallback "Eintrag gespeichert" greift, wenn ein Eintrag korrupt ist (z.B. kaputtes
// JSON aus einer alten Sync-Version) und die typspezifischen Felder fehlen.
export function entrySummary(entry: AnyEntry): string {
  try {
    switch (entry.type) {
      case "stool":
        if (!entry.consistency) return "Eintrag gespeichert";
        return `${entry.consistency}${entry.stoolAmount ? " · " + entry.stoolAmount : ""}${entry.color ? " · " + entry.color : ""}`;
      case "training":
        if (!entry.activity) return "Eintrag gespeichert";
        return entry.activity;
      case "weight":
        if (entry.kg === undefined || entry.kg === null || Number.isNaN(Number(entry.kg))) return "Eintrag gespeichert";
        return `${entry.kg} kg${entry.daytime ? " · " + entry.daytime : ""}`;
      case "food":
        if (!entry.food) return "Eintrag gespeichert";
        return `${entry.food}${entry.amount ? " · " + entry.amount + " g" : ""}`;
      case "vet":
        return `${entry.reason || "Termin"}`;
      case "symptom":
        if (!entry.category) return "Eintrag gespeichert";
        return entry.category;
      case "stress":
        if (!entry.level) return "Eintrag gespeichert";
        return `${stressLabelFor(entry.level)} (${entry.level}/3)`;
      case "kosten":
        if (!entry.category || entry.amount === undefined || Number.isNaN(Number(entry.amount))) return "Eintrag gespeichert";
        return `${entry.category} · ${Number(entry.amount).toFixed(2)} €`;
      case "tagescheck": {
        const parts = [`Folgsamkeit ${starGlyphs(entry.folgsamkeit)}`];
        if (entry.geduld !== undefined) parts.push(`Geduld ${starGlyphs(entry.geduld)}`);
        parts.push(`Sharklevel ${starGlyphs(entry.energie)}`);
        return parts.join(" · ");
      }
      default:
        return "Eintrag gespeichert";
    }
  } catch {
    return "Eintrag gespeichert";
  }
}
