// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DayRow, TimelineRow } from "@/components/tilly/Calendar";
import type { AnyEntry } from "@/lib/tilly/types";

const trainingEntry: AnyEntry = {
  id: "training-1",
  type: "training",
  updatedAt: 1,
  date: "2026-09-22T09:00:00.000Z",
  activity: "Rückruf",
  dogStars: 4,
  trainerStars: 3,
};

afterEach(() => {
  cleanup();
});

describe("Calendar rows", () => {
  it("zeigen bei Trainingseintraegen die Bewertungszeilen an", () => {
    render(<DayRow entry={trainingEntry} />);

    expect(screen.getByText("Tilly: ★★★★☆")).toBeInTheDocument();
    expect(screen.getByText("Trainer:in: ★★★☆☆")).toBeInTheDocument();
  });

  it("zeigen die Bewertungszeilen auch in der Timeline an", () => {
    render(<TimelineRow entry={trainingEntry} onClick={() => undefined} />);

    expect(screen.getByText("Tilly: ★★★★☆")).toBeInTheDocument();
    expect(screen.getByText("Trainer:in: ★★★☆☆")).toBeInTheDocument();
  });
});
