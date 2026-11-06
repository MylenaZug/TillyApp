// Stellt ein Backup aus `npm run backup` wieder her.
//   npm run restore -- backups/tilly-20261016-120000.tar.gz --yes
// WICHTIG: Die App vorher stoppen. Die bisherige DB und der bisherige Uploads-Ordner werden
// nicht geloescht, sondern mit Suffix ".before-restore-<zeit>" beiseite gelegt.
import { execFileSync } from "child_process";
import { cp, mkdtemp, rename, rm } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const dbPath = path.resolve(process.env.DB_PATH || "./tilly.db");
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Aufruf: npm run restore -- <backup.tar.gz> --yes");
  if (!args.includes("--yes")) {
    throw new Error(
      `Das ersetzt ${dbPath} und ${uploadsDir} durch den Stand aus dem Backup (App vorher stoppen!).\n` +
        "Zum Bestaetigen mit --yes erneut aufrufen.",
    );
  }
  if (!existsSync(file)) throw new Error(`Backup nicht gefunden: ${file}`);

  const work = await mkdtemp(path.join(tmpdir(), "tilly-restore-"));
  try {
    execFileSync("tar", ["-xzf", path.resolve(file), "-C", work]);
    if (!existsSync(path.join(work, "tilly.db"))) throw new Error("Kein gueltiges Tilly-Backup (tilly.db fehlt).");

    const suffix = `.before-restore-${Date.now()}`;
    if (existsSync(dbPath)) await rename(dbPath, dbPath + suffix);
    await Promise.all([rm(`${dbPath}-wal`, { force: true }), rm(`${dbPath}-shm`, { force: true })]);
    await cp(path.join(work, "tilly.db"), dbPath);

    if (existsSync(uploadsDir)) await rename(uploadsDir, uploadsDir + suffix);
    await cp(path.join(work, "uploads"), uploadsDir, { recursive: true });

    console.log(`Wiederhergestellt aus ${file}. Vorheriger Stand liegt unter "*${suffix}".`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
