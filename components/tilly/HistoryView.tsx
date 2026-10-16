"use client";

import { CATEGORIES } from "@/lib/tilly/constants";
import type { AnyEntry, CategoryId } from "@/lib/tilly/types";
import { Chip } from "./ui";
import type { PatienceRecord } from "@/lib/storage/types";
import { PatienceTimelineRow, TimelineRow, TwoWeekCalendar } from "./Calendar";

export function HistoryView({
  entries,
  filter,
  setFilter,
  onEdit,
  patience = [],
}: {
  entries: AnyEntry[];
  filter: CategoryId | "all";
  setFilter: (filter: CategoryId | "all") => void;
  onEdit: (entry: AnyEntry) => void;
  patience?: PatienceRecord[];
}) {
  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);
  type Item = { key: string; at: number; entry?: AnyEntry; patience?: PatienceRecord };
  const items: Item[] = filtered.map((e) => ({ key: e.id, at: new Date(e.date).getTime(), entry: e }));
  if (filter === "all") {
    for (const r of patience) {
      if (r.geduld > 0) items.push({ key: `p:${r.userEmail}:${r.date}`, at: new Date(`${r.date}T23:59:00`).getTime(), patience: r });
    }
    items.sort((a, b) => b.at - a.at);
  }

  return (
    <div>
      <div className="mb-3 font-semibold text-ink">Verlauf</div>

      <div className="mb-2 text-xs font-semibold text-ink-soft">Die letzten 2 Wochen</div>
      <TwoWeekCalendar entries={entries} onEdit={onEdit} patience={patience} />

      <div className="mb-2 mt-5 text-xs font-semibold text-ink-soft">Alle Einträge</div>
      <div className="flex flex-wrap gap-2 pb-3">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Alle
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
            colorClass={c.text}
            activeBgClass={c.bg}
            activeTextClass={c.activeText}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-soft">Keine Einträge in dieser Kategorie.</div>
      ) : (
        <div className="relative mt-2 pl-4">
          <div className="absolute bottom-1 left-[7px] top-1 w-px bg-hairline" />
          {items.map((it) =>
            it.entry ? (
              <TimelineRow key={it.key} entry={it.entry} onClick={() => onEdit(it.entry!)} />
            ) : (
              <PatienceTimelineRow key={it.key} record={it.patience!} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
