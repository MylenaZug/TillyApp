"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS, KOSTEN_CATEGORIES, STOOL_CONSISTENCY, STOOL_FLAGS, WEEKDAYS_DE, catMeta } from "@/lib/tilly/constants";
import { daysAgo, fmtDate, stressLabelFor } from "@/lib/tilly/helpers";
import type { AnyEntry } from "@/lib/tilly/types";
import { Chip } from "./ui";

const { hairline: HAIRLINE, inkSoft: INK_SOFT } = CHART_COLORS;

function weekdayIndexMonFirst(d: string) {
  return (new Date(d).getDay() + 6) % 7;
}

function buildWeekdayCounts(list: AnyEntry[]) {
  const data = WEEKDAYS_DE.map((label) => ({ day: label, Anzahl: 0 }));
  list.forEach((e) => {
    data[weekdayIndexMonFirst(e.date)].Anzahl += 1;
  });
  return data;
}

function WeekdayChart({ entriesList, color, unitLabel }: { entriesList: AnyEntry[]; color: string; unitLabel: string }) {
  const data = buildWeekdayCounts(entriesList);
  const activeDays = data.filter((d) => d.Anzahl > 0).length;
  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: HAIRLINE }}>
      <div className="mb-2 text-[11px] uppercase tracking-wide text-ink-soft">Nach Wochentag</div>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={HAIRLINE} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: INK_SOFT }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: INK_SOFT }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${HAIRLINE}`, fontSize: 12 }} />
            <Bar dataKey="Anzahl" radius={[5, 5, 0, 0]} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[12px] text-ink-soft">
        An {activeDays} von 7 Wochentagen {unitLabel} im gewählten Zeitraum.
      </div>
    </div>
  );
}

function HorizontalBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="text-ink">{label}</span>
        <span className="text-ink-soft">
          {count}× · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  summary,
  children,
  defaultOpen,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-hairline bg-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-4">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <div className="flex items-center gap-2">
          {summary && <span className="text-xs text-ink-soft">{summary}</span>}
          <ChevronDown size={15} className="text-ink-soft" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function AnalysisView({ entries, onAddWeight }: { entries: AnyEntry[]; onAddWeight: () => void }) {
  const [range, setRange] = useState<number | "all">(7);

  const inRange = (e: AnyEntry) => range === "all" || daysAgo(e.date) <= range;
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
  const weightChartData = [...weightEntries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((e) => ({ date: fmtDate(e.date), kg: e.kg }));
  const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  const consistencyCounts = STOOL_CONSISTENCY.map((c) => ({
    label: c,
    count: stoolEntries.filter((e) => (Array.isArray(e.consistency) ? e.consistency : e.consistency ? [e.consistency] : []).includes(c)).length,
  }));
  const flagCounts = STOOL_FLAGS.map((f) => ({
    label: f,
    count: stoolEntries.filter((e) => (e.flags || []).includes(f)).length,
  })).filter((f) => f.count > 0);

  const symptomCategoriesPresent = [...new Set(symptomEntries.map((e) => e.category))];
  const symptomCounts = symptomCategoriesPresent
    .map((c) => ({ label: c ?? "", count: symptomEntries.filter((e) => e.category === c).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold text-ink">Auswertung</div>
      </div>
      <div className="mb-4 flex gap-2">
        <Chip active={range === 7} onClick={() => setRange(7)}>
          7 Tage
        </Chip>
        <Chip active={range === 30} onClick={() => setRange(30)}>
          30 Tage
        </Chip>
        <Chip active={range === "all"} onClick={() => setRange("all")}>
          Gesamt
        </Chip>
      </div>

      <SectionCard title="Stuhlgang" summary={`${stoolEntries.length} Einträge`}>
        {stoolEntries.length === 0 ? (
          <div className="text-sm text-ink-soft">Keine Einträge in diesem Zeitraum.</div>
        ) : (
          <>
            {consistencyCounts.map((c) => (
              <HorizontalBar key={c.label} label={c.label} count={c.count} total={stoolEntries.length} color={catMeta("stool").hex} />
            ))}
            {flagCounts.length > 0 && (
              <div className="mt-3 border-t pt-3" style={{ borderColor: HAIRLINE }}>
                <div className="mb-2 text-[11px] uppercase tracking-wide text-ink-soft">Auffälligkeiten</div>
                <div className="flex flex-wrap gap-2">
                  {flagCounts.map((f) => (
                    <span key={f.label} className="rounded-full bg-rust-soft px-2.5 py-1 text-xs text-rust">
                      {f.label} · {f.count}×
                    </span>
                  ))}
                </div>
              </div>
            )}
            <WeekdayChart entriesList={stoolEntries} color={catMeta("stool").hex} unitLabel="gab es Stuhlgang-Einträge" />
          </>
        )}
      </SectionCard>

      <SectionCard title="Auffälligkeiten" summary={`${symptomEntries.length} Einträge`}>
        {symptomCounts.length === 0 ? (
          <div className="text-sm text-ink-soft">Keine Auffälligkeiten in diesem Zeitraum – gut so.</div>
        ) : (
          symptomCounts.map((c) => (
            <HorizontalBar key={c.label} label={c.label} count={c.count} total={symptomEntries.length} color={catMeta("symptom").hex} />
          ))
        )}
      </SectionCard>

      <SectionCard title="Training nach Wochentag" summary={`${trainingEntries.length} Einheiten`}>
        {trainingEntries.length === 0 ? (
          <div className="text-sm text-ink-soft">Noch keine Trainingseinträge in diesem Zeitraum.</div>
        ) : (
          <WeekdayChart entriesList={trainingEntries} color={catMeta("training").hex} unitLabel="wurde trainiert" />
        )}
      </SectionCard>

      <SectionCard
        title="Stress"
        summary={
          stressEntries.length === 0
            ? "0 Einträge"
            : `Ø ${(stressEntries.reduce((s, e) => s + (e.level || 0), 0) / stressEntries.length).toFixed(1)}`
        }
      >
        {stressEntries.length === 0 ? (
          <div className="text-sm text-ink-soft">Keine Stress-Einschätzungen in diesem Zeitraum.</div>
        ) : (
          <>
            {(() => {
              const avg = stressEntries.reduce((s, e) => s + (e.level || 0), 0) / stressEntries.length;
              const avgLabel = stressLabelFor(avg);
              return (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl font-bold text-amber">{avg.toFixed(1)}</span>
                  <span className="text-sm text-ink-soft">Ø Stresslevel · meist "{avgLabel}"</span>
                </div>
              );
            })()}
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...stressEntries]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((e) => ({ date: fmtDate(e.date), level: Math.min(3, e.level || 0) }))}
                  margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke={HAIRLINE} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: INK_SOFT }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 3]} allowDecimals={false} tick={{ fontSize: 10, fill: INK_SOFT }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${HAIRLINE}`, fontSize: 12 }} />
                  <Line type="monotone" dataKey="level" stroke={catMeta("stress").hex} strokeWidth={2.5} dot={{ r: 3, fill: catMeta("stress").hex }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Gewicht"
        summary={weightEntries.length > 0 ? `${[...weightEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].kg} kg` : "–"}
      >
        {weightEntries.length === 0 ? (
          <div className="text-sm text-ink-soft">Keine Einträge in diesem Zeitraum.</div>
        ) : weightChartData.length < 2 ? (
          <div className="text-sm text-ink-soft">Noch nicht genug Daten für ein Diagramm – trag mindestens zwei Gewichte ein.</div>
        ) : (
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={HAIRLINE} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: INK_SOFT }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: INK_SOFT }} axisLine={false} tickLine={false} width={34} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${HAIRLINE}`, fontSize: 12 }} />
                <Line type="monotone" dataKey="kg" stroke={catMeta("weight").hex} strokeWidth={2.5} dot={{ r: 3, fill: catMeta("weight").hex }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <button onClick={onAddWeight} className="mt-3 rounded-full bg-teal px-3 py-1.5 text-xs text-white">
          + Gewicht eintragen
        </button>
      </SectionCard>

      <SectionCard title="Kosten" summary={kostenEntries.length > 0 ? eur(kostenTotal) : "–"}>
        {kostenEntries.length === 0 ? (
          <div className="text-sm text-ink-soft">Keine erfassten Kosten in diesem Zeitraum.</div>
        ) : (
          <>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate">{eur(kostenTotal)}</span>
              <span className="text-sm text-ink-soft">
                aus {kostenEntries.length} {kostenEntries.length === 1 ? "Eintrag" : "Einträgen"}
              </span>
            </div>
            {kostenByCategory.map((c) => {
              const pct = kostenTotal > 0 ? Math.round((c.total / kostenTotal) * 100) : 0;
              return (
                <div key={c.label} className="mb-2.5">
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="text-ink">{c.label}</span>
                    <span className="text-ink-soft">
                      {eur(c.total)} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-hairline">
                    <div className="h-full rounded-full bg-slate" style={{ width: `${pct}%` }} />
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
