import { sqlite } from "../db/client";
import { runMigrations } from "../db/migrate";

// Gleicher Weg wie beim Serverstart (instrumentation.ts): Schema- und Datenmigration.
runMigrations(sqlite);
console.log("Migrationen angewendet.");
