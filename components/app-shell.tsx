"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Battery,
  Clock3,
  Heart,
  Plus,
  Scale,
  Stethoscope,
  Target,
  UtensilsCrossed,
  Waves,
  Zap,
} from "lucide-react";
import {
  getPatience,
  listEntries,
  saveEntry,
  setMyPatience,
} from "@/lib/storage";
import { useSyncStatus } from "@/lib/storage/useSyncStatus";
import type { EntryRecord } from "@/lib/storage/types";

const categories = [
  ["food", "Futter", UtensilsCrossed, "sage"],
  ["stool", "Stuhlgang", Waves, "rust"],
  ["training", "Training", Target, "gold"],
  ["stress", "Stress", Zap, "amber"],
  ["symptom", "Auffälligkeit", AlertTriangle, "berry"],
  ["weight", "Gewicht", Scale, "teal"],
  ["vet", "Tierarzt", Stethoscope, "plum"],
] as const;

const todayKey = () => new Date().toISOString().slice(0, 10);
const todayStart = () => new Date(`${todayKey()}T00:00:00`).getTime();
const colorClasses = {
  sage: "text-sage",
  rust: "text-rust",
  gold: "text-gold",
  amber: "text-amber",
  berry: "text-berry",
  teal: "text-teal",
  plum: "text-plum",
} as const;
const parseEntry = (entry: EntryRecord) => {
  try {
    return JSON.parse(entry.data) as Record<string, unknown>;
  } catch {
    return {};
  }
};

function stars(value: number) {
  return `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
}

function statusLabel(status: "offline" | "pending" | "synced", pending: number) {
  if (status === "offline") return "Offline";
  if (status === "pending") return `${pending} ausstehend`;
  return "Synchronisiert";
}

export default function AppShell({ userEmail }: { userEmail: string }) {
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [patience, setPatience] = useState(0);
  const [view, setView] = useState<"home" | "history">("home");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { status, pending } = useSyncStatus();

  async function refresh() {
    const [nextEntries] = await Promise.all([listEntries()]);
    setEntries(nextEntries.sort((a, b) => b.updatedAt - a.updatedAt));
  }

  useEffect(() => {
    void Promise.all([refresh(), getPatience(userEmail, todayKey()).then(setPatience)]);
  }, [userEmail]);

  const todayCheck = useMemo(
    () => entries.find((entry) => entry.type === "tagescheck" && entry.updatedAt >= todayStart()),
    [entries],
  );
  const checkData = todayCheck ? parseEntry(todayCheck) : {};
  const recentEntries = entries.filter((entry) => entry.type !== "tagescheck").slice(0, 8);

  async function updateCheck(field: "folgsamkeit" | "energie", value: number) {
    const data = { ...checkData, [field]: value, date: todayKey() };
    await saveEntry(todayCheck?.id, "tagescheck", data);
    await refresh();
  }

  async function updatePatience(value: number) {
    setPatience(value);
    await setMyPatience(userEmail, todayKey(), value);
    setMessage("Geduld gespeichert");
    window.setTimeout(() => setMessage(""), 1800);
  }

  async function addPlaceholder(type: string, label: string) {
    await saveEntry(undefined, type, { date: new Date().toISOString(), note: "" });
    await refresh();
    setPickerOpen(false);
    setMessage(`${label} geöffnet`);
    window.setTimeout(() => setMessage(""), 1800);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-bg text-ink shadow-sm">
      <header className="flex items-center justify-between px-5 pb-4 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Tilly Tracker</p>
          <h1 className="mt-1 text-2xl font-semibold">Heute mit Tilly</h1>
        </div>
        <div className="rounded-full border border-hairline bg-card px-3 py-1.5 text-xs text-ink-soft" title={userEmail}>
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${status === "offline" ? "bg-rust" : status === "pending" ? "bg-amber" : "bg-sage"}`} />
          {statusLabel(status, pending)}
        </div>
      </header>

      <section className="px-5 pb-5">
        <div className="rounded-3xl bg-ink p-5 text-white shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-white/75"><Heart size={16} /> Tagescheck</div>
          <div className="mt-5 space-y-4">
            <Rating label="Folgsamkeit" value={Number(checkData.folgsamkeit) || 0} onChange={(value) => void updateCheck("folgsamkeit", value)} />
            <Rating label="Meine Geduld" value={patience} onChange={(value) => void updatePatience(value)} />
            <Rating label="Energie" value={Number(checkData.energie) || 0} onChange={(value) => void updateCheck("energie", value)} />
          </div>
        </div>
      </section>

      <section className="px-5 pb-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold">Schnell erfassen</h2>
          <span className="text-xs text-ink-soft">{new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {categories.map(([id, label, Icon, color]) => (
            <button key={id} onClick={() => void addPlaceholder(id, label)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-hairline bg-card px-1 text-center transition-transform active:scale-95">
              <Icon size={20} className={colorClasses[color]} />
              <span className="text-[11px] font-medium leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {view === "home" ? (
        <section className="px-5 pb-24">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Zuletzt erfasst</h2><button className="text-xs text-ink-soft" onClick={() => setView("history")}>Alle anzeigen</button></div>
          <EntryList entries={recentEntries} />
        </section>
      ) : (
        <section className="px-5 pb-24"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Verlauf</h2><button className="text-xs text-ink-soft" onClick={() => setView("home")}>Start</button></div><EntryList entries={entries.filter((entry) => entry.type !== "tagescheck")} /></section>
      )}

      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-hairline bg-bg/95 px-5 py-3 backdrop-blur">
        <button onClick={() => setView("home")} className="flex flex-col items-center gap-1 text-xs text-ink"><Heart size={19} />Start</button>
        <button onClick={() => setView("history")} className="flex flex-col items-center gap-1 text-xs text-ink-soft"><Clock3 size={19} />Verlauf</button>
        <button onClick={() => setPickerOpen(true)} className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lg" aria-label="Eintrag hinzufügen"><Plus size={25} /></button>
        <button className="flex flex-col items-center gap-1 text-xs text-ink-soft"><BarChart3 size={19} />Analyse</button>
      </nav>

      {pickerOpen && <div className="fixed inset-0 z-10 flex items-end bg-ink/30" onClick={() => setPickerOpen(false)}><div className="mx-auto w-full max-w-[480px] rounded-t-3xl bg-card p-5 pb-8" onClick={(event) => event.stopPropagation()}><h2 className="mb-4 font-semibold">Was möchtest du eintragen?</h2><div className="grid grid-cols-3 gap-2">{categories.map(([id, label, Icon, color]) => <button key={id} onClick={() => void addPlaceholder(id, label)} className="flex flex-col items-center gap-2 rounded-xl border border-hairline bg-bg p-3 text-xs"><Icon size={19} className={colorClasses[color]} />{label}</button>)}</div></div></div>}
      {message && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">{message}</div>}
    </main>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="flex items-center justify-between"><span className="text-sm">{label}</span><div className="flex gap-1" role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map((score) => <button key={score} onClick={() => onChange(score)} className={`text-xl leading-none ${score <= value ? "text-amber" : "text-white/30"}`} aria-label={`${label}: ${score}`} aria-pressed={score <= value}>★</button>)}</div></div>;
}

function EntryList({ entries }: { entries: EntryRecord[] }) {
  if (entries.length === 0) return <p className="rounded-2xl border border-dashed border-hairline p-6 text-center text-sm text-ink-soft">Noch keine Einträge.</p>;
  return <div className="space-y-2">{entries.map((entry) => { const data = parseEntry(entry); return <div key={entry.id} className="rounded-2xl border border-hairline bg-card px-4 py-3"><div className="flex justify-between text-sm font-medium"><span>{entry.type}</span><span className="text-xs font-normal text-ink-soft">{new Date(entry.updatedAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div><p className="mt-1 text-xs text-ink-soft">{typeof data.note === "string" && data.note ? data.note : entry.type === "tagescheck" ? stars(Number(data.folgsamkeit) || 0) : "Eintrag gespeichert"}</p></div>; })}</div>;
}
