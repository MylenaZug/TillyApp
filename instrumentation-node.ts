import { sqlite } from "./db/client";
import { runMigrations } from "./db/migrate";

export function runStartupMigrations() {
  runMigrations(sqlite);
}
