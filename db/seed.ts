import { eq } from "drizzle-orm";
import { db } from "./client";
import { kvStore } from "./schema";
import { SEED_EXERCISES } from "./seed-data";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Einmaliger Seed der Uebungsbibliothek fuer frische Datenbanken. Ueberschreibt nichts,
// wenn unter dem Key "exercises" bereits Daten liegen (z.B. weil ein Nutzer schon
// Uebungen angelegt/bearbeitet hat).
async function main() {
  const existing = await db.select().from(kvStore).where(eq(kvStore.key, "exercises"));
  if (existing.length > 0) {
    console.log("Seed übersprungen: 'exercises' ist bereits in der Datenbank vorhanden.");
    return;
  }

  const seeded = SEED_EXERCISES.map((exercise) => ({ ...exercise, id: uid(), masteryLevel: 0 }));
  await db.insert(kvStore).values({
    key: "exercises",
    value: JSON.stringify(seeded),
    updatedAt: Date.now(),
  });
  console.log(`Seed abgeschlossen: ${seeded.length} Standardübungen angelegt.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
