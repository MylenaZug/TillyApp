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
  return { onSave, date, time };
}

const existingFood = (iso: string) => ({ id: "1", type: "food", date: iso, food: "Nassfutter", note: "" }) as unknown as AnyEntry;

describe("EntryForm Zeitpunkt (getrennte Datum- und Uhrzeit-Felder)", () => {
  it("bietet bei Kategorien mit Uhrzeit zwei getrennte Felder an", () => {
    const { date, time } = setup("food");
    expect(date()).toBeInTheDocument();
    expect(time()).toBeInTheDocument();
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
