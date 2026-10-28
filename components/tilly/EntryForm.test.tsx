// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryForm } from "@/components/tilly/EntryForm";
import type { AnyEntry } from "@/lib/tilly/types";

afterEach(cleanup);

function setup(categoryId: string, existing: AnyEntry | null = null) {
  const onSave = vi.fn();
  render(
    <EntryForm
      categoryId={categoryId as never}
      existing={existing}
      trainingTypes={[]}
      foodTypes={[]}
      exercises={[]}
      symptomTypes={[]}
      foodPlan=""
      onFoodPlanChange={() => {}}
      foodPlanSlots={{}}
      onFoodPlanSlotsChange={() => {}}
      foodPlanStatus=""
      onSave={onSave}
      onDelete={() => {}}
      onCancel={() => {}}
    />,
  );
  const date = () => document.querySelector<HTMLInputElement>('input[type="date"]')!;
  const time = () => document.querySelector<HTMLInputElement>('input[type="time"]');
  const dateTimes = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]'));
  return { onSave, date, time, dateTimes };
}

const existingFood = (iso: string) => ({ id: "1", type: "food", date: iso, food: "Nassfutter", note: "" }) as unknown as AnyEntry;
const existingAlone = (startDatetime: string, endDatetime: string) =>
  ({ id: "1", type: "alone", date: endDatetime, startDatetime, endDatetime, note: "" }) as unknown as AnyEntry;

describe("EntryForm Zeitpunkt (getrennte Datum- und Uhrzeit-Felder)", () => {
  it("bietet bei Kategorien mit Uhrzeit zwei getrennte Felder an", () => {
    const { date, time } = setup("food");
    expect(date()).toBeInTheDocument();
    expect(time()).toBeInTheDocument();
  });

  describe("EntryForm Alleine-Zeitpunkte", () => {
    it("verwendet separate volle Start- und Endzeitpunkte auch ueber mehrere Tage", () => {
      const start = "2026-03-05T09:00:00.000Z";
      const end = "2026-03-06T10:00:00.000Z";
      const { dateTimes } = setup("alone", existingAlone(start, end));

      expect(dateTimes()).toHaveLength(2);
      expect(dateTimes()[0].value).toContain("2026-03-05T09:00");
      expect(dateTimes()[1].value).toContain("2026-03-06T10:00");
    });

    it("bewahrt beim Bearbeiten einer langen Session beide Zeitpunkte", async () => {
      const start = "2026-03-05T09:00:00.000Z";
      const end = "2026-03-06T10:00:00.000Z";
      const { onSave } = setup("alone", existingAlone(start, end));
      fireEvent.change(screen.getByPlaceholderText("Weitere Beobachtungen…"), { target: { value: "Notiz" } });
      await userEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ startDatetime: start, endDatetime: end, date: end, note: "Notiz" }));
    });

    it("stuerzt bei einem geleerten datetime-Feld nicht ab und deaktiviert Speichern", () => {
      const { dateTimes } = setup(
        "alone",
        existingAlone("2026-03-05T09:00:00.000Z", "2026-03-05T10:00:00.000Z"),
      );
      fireEvent.change(dateTimes()[0], { target: { value: "" } });

      expect(screen.getByRole("button", { name: "Änderungen speichern" })).toBeDisabled();
    });

    it("laesst Sessions unter einer Minute nicht speichern", () => {
      const { dateTimes } = setup("alone");
      fireEvent.change(dateTimes()[0], { target: { value: "2026-03-05T09:00" } });
      fireEvent.change(dateTimes()[1], { target: { value: "2026-03-05T09:00" } });

      expect(screen.getByRole("button", { name: "Eintrag speichern" })).toBeDisabled();
    });
  });

  it("bietet bei Kategorien ohne Uhrzeit nur das Datum an", () => {
    const { date, time } = setup("weight");
    expect(date()).toBeInTheDocument();
    expect(time()).toBeNull();
  });

  it("zeigt beim Bearbeiten das gespeicherte Datum und die Uhrzeit", () => {
    const { date, time } = setup("food", existingFood(new Date(2026, 2, 5, 7, 45).toISOString()));
    expect(date().value).toBe("2026-03-05");
    expect(time()!.value).toBe("07:45");
  });

  it("speichert die geaenderte Uhrzeit, ohne das Datum zu veraendern", async () => {
    const { onSave, time } = setup("food", existingFood(new Date(2026, 2, 5, 7, 45).toISOString()));
    fireEvent.change(time()!, { target: { value: "18:20" } });
    await userEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    const saved = new Date(onSave.mock.calls[0][0].date);
    expect([saved.getFullYear(), saved.getMonth(), saved.getDate(), saved.getHours(), saved.getMinutes()]).toEqual([2026, 2, 5, 18, 20]);
  });

  it("speichert ein geaendertes Datum, ohne die Uhrzeit zu veraendern", async () => {
    const { onSave, date } = setup("food", existingFood(new Date(2026, 2, 5, 7, 45).toISOString()));
    fireEvent.change(date(), { target: { value: "2026-04-10" } });
    await userEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    const saved = new Date(onSave.mock.calls[0][0].date);
    expect([saved.getMonth(), saved.getDate(), saved.getHours(), saved.getMinutes()]).toEqual([3, 10, 7, 45]);
  });

  it("behaelt bei Kategorien ohne Uhrzeit den Tag, ohne dass er durch Zeitzonen springt", async () => {
    const { onSave, date } = setup("weight");
    fireEvent.change(date(), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByPlaceholderText("z. B. 24.5"), { target: { value: "24.5" } });
    await userEvent.click(screen.getByRole("button", { name: "Eintrag speichern" }));

    const saved = new Date(onSave.mock.calls[0][0].date);
    expect([saved.getFullYear(), saved.getMonth(), saved.getDate()]).toEqual([2026, 0, 1]);
  });

  it("speichert mit der aktuellen Uhrzeit, wenn nichts geaendert wurde", async () => {
    const { onSave } = setup("food");
    fireEvent.change(screen.getAllByPlaceholderText("z. B. Nassfutter Huhn")[0], { target: { value: "Huhn" } });
    const before = Date.now();
    await userEvent.click(screen.getByRole("button", { name: "Eintrag speichern" }));
    const saved = new Date(onSave.mock.calls[0][0].date).getTime();
    expect(Math.abs(saved - before)).toBeLessThan(2 * 60_000);
  });
});
