"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, PawPrint } from "lucide-react";
import { CALENDAR_CATEGORY_IDS, CATEGORIES, CATEGORIES_WITH_TIME, WEEKDAYS_DE, catMeta } from "@/lib/tilly/constants";
import { dateKey, entrySummary, fmtTime, startOfDay } from "@/lib/tilly/helpers";
import type { AnyEntry } from "@/lib/tilly/types";
import { CatIcon } from "./ui";

export function DayRow({ entry, onClick }: { entry: AnyEntry; onClick?: (entry: AnyEntry) => void }) {
  const meta = catMeta(entry.type);
  const showTime = CATEGORIES_WITH_TIME.includes(entry.type);
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick ? () => onClick(entry) : undefined}
      className="w-full rounded-xl border border-hairline bg-card py-2.5 pl-3 pr-3 text-left transition-transform active:scale-[0.99]"
      style={{ borderLeftColor: meta.hex, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-label={meta.label} title={meta.label}>
          <CatIcon cat={meta} size={13} />
        </div>
        {showTime && <span className="text-[11px] text-ink-soft">{fmtTime(entry.date)}</span>}
      </div>
      <div className="mt-0.5 break-words text-[13px] text-ink-soft">{entrySummary(entry)}</div>
      {entry.note && <div className="mt-1 break-words text-[12px] italic text-ink-soft">„{entry.note}"</div>}
    </Wrapper>
  );
}

export function TwoWeekCalendar({ entries, onEdit }: { entries: AnyEntry[]; onEdit: (entry: AnyEntry) => void }) {
  const today = startOfDay(new Date());
  const todayKey = dateKey(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(todayKey);

  const mondayIdx = (today.getDay() + 6) % 7;
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - mondayIdx);
  const gridStart = new Date(startOfThisWeek);
  gridStart.setDate(startOfThisWeek.getDate() - 7 - weekOffset * 14);

  const days: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  const gridEnd = days[13];

  const goToOffset = (next: number) => {
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

  const catsForKey = (key: string) => {
    const ids: string[] = [];
    entries.forEach((e) => {
      if (CALENDAR_CATEGORY_IDS.includes(e.type) && dateKey(e.date) === key && !ids.includes(e.type)) ids.push(e.type);
    });
    return ids;
  };

  const selectedDate = new Date(selected);
  const yesterdayKey = dateKey(new Date(today.getTime() - 86400000));
  const selectedLabel =
    selected === todayKey
      ? "Heute"
      : selected === yesterdayKey
        ? "Gestern"
        : `${selectedDate.toLocaleDateString("de-DE", { weekday: "long" })}, ${selectedDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`;
  const selectedEntries = entries.filter((e) => dateKey(e.date) === selected);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => goToOffset(weekOffset + 1)} className="rounded-full bg-bg p-1" aria-label="Vorherige 2 Wochen">
          <ChevronLeft size={16} className="text-ink" />
        </button>
        <div className="text-sm font-semibold text-ink">{monthLabel}</div>
        <button
          onClick={() => goToOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="rounded-full bg-bg p-1 disabled:opacity-30"
          aria-label="Nächste 2 Wochen"
        >
          <ChevronRight size={16} className="text-ink" />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAYS_DE.map((w) => (
          <div key={w} className="text-center text-[10px] uppercase text-ink-soft">
            {w}
          </div>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = dateKey(d);
          const cats = catsForKey(key);
          const isSelected = selected === key;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2 ${
                isSelected ? "border-ink bg-ink" : isToday ? "border-gold bg-card" : "border-hairline bg-card"
              }`}
            >
              <span className={`text-[13px] font-semibold ${isSelected ? "text-white" : "text-ink"}`}>{d.getDate()}</span>
              <div className="flex flex-wrap justify-center gap-0.5" style={{ minHeight: 6, maxWidth: 28 }}>
                {cats.slice(0, 4).map((catId) => (
                  <span key={catId} className="h-1.5 w-1.5 rounded-full" style={{ background: catMeta(catId).hex }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1">
        {CATEGORIES.filter((c) => CALENDAR_CATEGORY_IDS.includes(c.id)).map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.hex }} />
            <span className="text-[10px] text-ink-soft">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="mb-2 text-xs font-semibold text-ink-soft">{selectedLabel}</div>
      {selectedEntries.length === 0 ? (
        <div className="py-6 text-center text-sm text-ink-soft">Keine Einträge an diesem Tag.</div>
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

export function TimelineRow({ entry, onClick }: { entry: AnyEntry; onClick: () => void }) {
  const meta = catMeta(entry.type);
  return (
    <button onClick={onClick} className="relative flex w-full items-start gap-3 pb-4 text-left">
      <div className="absolute -left-4 top-0.5 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: meta.hexSoft }}>
        <PawPrint size={9} style={{ color: meta.hex }} />
      </div>
      <div className="flex-1 rounded-xl border border-hairline bg-card px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">{meta.label}</span>
          <span className="text-[11px] text-ink-soft">
            {CATEGORIES_WITH_TIME.includes(entry.type)
              ? new Date(entry.date).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
              : new Date(entry.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
          </span>
        </div>
        <div className="mt-0.5 break-words text-[13px] text-ink-soft">{entrySummary(entry)}</div>
      </div>
    </button>
  );
}
