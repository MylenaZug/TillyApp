"use client";

import { CATEGORIES } from "@/lib/tilly/constants";
import type { AnyEntry, CategoryId } from "@/lib/tilly/types";
import { Chip } from "./ui";
import { TimelineRow, TwoWeekCalendar } from "./Calendar";

export function HistoryView({
  entries,
  filter,
  setFilter,
  onEdit,
}: {
  entries: AnyEntry[];
  filter: CategoryId | "all";
  setFilter: (filter: CategoryId | "all") => void;
  onEdit: (entry: AnyEntry) => void;
}) {
  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  return (
    <div>
      <div className="mb-3 font-semibold text-ink">Verlauf</div>

      <div className="mb-2 text-xs font-semibold text-ink-soft">Die letzten 2 Wochen</div>
      <TwoWeekCalendar entries={entries} onEdit={onEdit} />

      <div className="mb-2 mt-5 text-xs font-semibold text-ink-soft">Alle Einträge</div>
      <div className="flex flex-wrap gap-2 pb-3">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Alle
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)} colorClass={c.text} activeBgClass={c.bg}>
            {c.label}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-soft">Keine Einträge in dieser Kategorie.</div>
      ) : (
        <div className="relative mt-2 pl-4">
          <div className="absolute bottom-1 left-[7px] top-1 w-px bg-hairline" />
          {filtered.map((e) => (
            <TimelineRow key={e.id} entry={e} onClick={() => onEdit(e)} />
          ))}
        </div>
      )}
    </div>
  );
}
