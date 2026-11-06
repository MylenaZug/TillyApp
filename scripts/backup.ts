// Backup von Datenbank + Galerie-Fotos in ein einzelnes .tar.gz.
//   npm run backup
// Umgebungsvariablen: DB_PATH, UPLOADS_DIR (wie die App), BACKUP_DIR (Default ./backups),
// BACKUP_KEEP (Anzahl behaltener Backups, Default 14; 0 = nie loeschen).
// Die DB wird ueber die SQLite-Backup-API gesichert und ist auch bei laufender App
// konsistent (ein blosses Kopieren der .db-Datei waere es mit WAL nicht).
import Database from "better-sqlite3";
import { execFileSync } from "child_process";
import { cp, mkdir, mkdtemp, readdir, rm } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const dbPath = path.resolve(process.env.DB_PATH || "./tilly.db");
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
const backupDir = path.resolve(process.env.BACKUP_DIR || "./backups");
const keep = Number(process.env.BACKUP_KEEP ?? 14);

const pad = (n: number) => String(n).padStart(2, "0");
function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
  if (!existsSync(dbPath)) throw new Error(`Datenbank nicht gefunden: ${dbPath}`);

  await mkdir(backupDir, { recursive: true });
  const work = await mkdtemp(path.join(tmpdir(), "tilly-backup-"));
  try {
    const source = new Database(dbPath, { readonly: true });
    await source.backup(path.join(work, "tilly.db"));
    source.close();

    if (existsSync(uploadsDir)) await cp(uploadsDir, path.join(work, "uploads"), { recursive: true });
    else await mkdir(path.join(work, "uploads"));

    const target = path.join(backupDir, `tilly-${stamp()}.tar.gz`);
    execFileSync("tar", ["-czf", target, "-C", work, "."]);
    console.log(`Backup erstellt: ${target}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }

  if (keep > 0) {
    const old = (await readdir(backupDir)).filter((f) => /^tilly-\d{8}-\d{6}\.tar\.gz$/.test(f)).sort().reverse().slice(keep);
    for (const f of old) {
      await rm(path.join(backupDir, f));
      console.log(`Altes Backup entfernt: ${f}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
