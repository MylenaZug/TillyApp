import Database from "better-sqlite3";
import { migrateAloneEntries } from "../db/migrate-alone";

const sqlite = new Database(process.env.DB_PATH || "./tilly.db");

try {
  migrateAloneEntries(sqlite);
  console.log("Alone-entry datetime migration completed.");
} finally {
  sqlite.close();
}
