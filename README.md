# Tilly Tracker

Eine kleine PWA, mit der wir gemeinsam die Entwicklung und den Alltag unserer Hündin Tilly
tracken: Futter, Stuhlgang, Training, Stress, Auffälligkeiten, Gewicht, Tierarztbesuche,
Kosten und einen täglichen "Tagescheck". Die App läuft offlinefähig auf unseren Handys und
synchronisiert Einträge automatisch, sobald wieder eine Verbindung zum Server besteht.

## Architektur

- **Framework:** [Next.js](https://nextjs.org) (App Router, TypeScript) – Frontend, API-Routes
  und Datenmodell in einem Projekt.
- **UI:** React-Komponenten in `components/tilly/*`, geteilte Bausteine/Helfer in
  `components/tilly/ui.tsx` und `lib/tilly/*`. Styling mit Tailwind CSS
  (`tailwind.config.ts` enthält die feste Farbpalette der App).
- **Datenbank:** SQLite, Zugriff über [Drizzle ORM](https://orm.drizzle.team) –
  `db/schema.ts` ist die einzige Quelle der Wahrheit für das Datenmodell.
- **Auth:** [Auth.js](https://authjs.dev) mit Google als OAuth-Identity-Provider.
  Zugriff ist auf eine feste Allow-List von Google-Konten beschränkt
  (`ALLOWED_GOOGLE_EMAILS`). Außerhalb von Production loggt `auth.ts` automatisch als
  `DEV_USER_EMAIL` ein, ganz ohne Google-OAuth.
- **Offline-Sync:** Lokale Persistenz per IndexedDB (`idb`, siehe `lib/storage/`),
  optimistische Updates und eine Mutation-Queue. Der Server vergibt beim Speichern
  `updatedAt` und eine fortlaufende `server_seq` (last push wins). Der Client merkt sich
  die letzte `server_seq` als Token und holt danach nur noch das Delta (inkl. gelöschter
  Einträge). Der erste Sync lädt nur die letzten 30 Tage; ältere Einträge werden im Verlauf
  bzw. Kalender nachgeladen, die Auswertung „Gesamt“ holt alles direkt vom Server.
  Client und Server prüfen `SYNC_PROTOCOL_VERSION` (Header `x-tilly-protocol`); ein
  veralteter Client bekommt 426 und muss die App neu laden.
- **PWA:** installierbar, offline nutzbar (`@ducanh2912/next-pwa`); der Service Worker
  cacht nur Assets, API-Aufrufe laufen über die eigene Sync-Engine.

## Datenmodell (Kurzüberblick)

- `entries` – ein Datensatz pro Aktivität (Futter, Stuhlgang, Training, Stress,
  Auffälligkeit, Gewicht, Tierarzt, Kosten, Tagescheck, Alleinsein); jeder Eintrag hat
  `start_at`/`end_at` (Epoch-ms, bei Punktereignissen gleich), typspezifische Felder liegen
  als JSON in `data` und werden per Zod (`lib/tilly/schemas.ts`) validiert.
- `kvStore` – kleinere, seltener geänderte Einstellungen (Trainingsarten, Futterarten,
  Übungsliste, allgemeine Notiz, Futterplan).
- `dailyPatience` – der "Geduld"-Wert des Tageschecks, getrennt pro Person (Google-Konto)
  erfasst, statt sich einen gemeinsamen Wert zu teilen.

## Entwicklung

Die Entwicklung läuft in einem Dev Container (VS Code "Reopen in Container" bzw.
`devcontainer CLI`), nicht nativ auf dem Host – das Devcontainer-Image bringt Node 20 sowie
die Build-Tools mit, die `better-sqlite3` zum Kompilieren braucht. Beim ersten Start richtet
`.devcontainer/setup.sh` automatisch `.env` (inkl. generiertem `AUTH_SECRET`) ein.

```bash
# Migrationen anwenden (läuft auch automatisch beim Serverstart, idempotent)
npm run db:migrate

# Übungsbibliothek einmalig befüllen (idempotent)
npm run db:seed

npm run dev
```

Beim Erstellen oder erneuten Öffnen des Dev Containers führt
`.devcontainer/setup.sh` automatisch `npm install` aus und legt bei Bedarf `.env`
mit einem generierten `AUTH_SECRET` an.

Migrationen liegen in `drizzle/` (eingecheckt) und werden beim Serverstart automatisch
angewendet (`instrumentation.ts`); vorher entsteht neben der DB eine Kopie
`<db>.pre-migrate-<zeit>.bak`. Danach läuft die idempotente Datenmigration
(`db/migrate-data.ts`: Zeiträume, bereinigtes `data`-JSON, `server_seq`); nicht umwandelbare
Einträge brechen den Start mit ID-Liste ab. Bereits angewendete Migrationsdateien nie ändern,
Schemaänderungen immer über `npm run db:generate` als neue Datei erzeugen.

Benötigte Umgebungsvariablen siehe `.env.example`. Ohne echte `GOOGLE_CLIENT_ID`/`SECRET`
funktioniert lokal trotzdem alles über den automatischen Dev-Login (`DEV_USER_EMAIL`).

### Nützliche Skripte

| Skript                | Zweck                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run dev`          | Next.js Dev-Server                                                   |
| `npm run build`        | Produktions-Build                                                    |
| `npm run start`        | Produktions-Server (nach `build`)                                    |
| `npm run lint`         | Next.js/ESLint-Checks                                                |
| `npm run test`         | Vitest einmalig ausführen                                            |
| `npm run test:watch`   | Vitest im Watch-Modus                                                |
| `npm run db:generate`  | Drizzle-Migration aus `db/schema.ts` erzeugen                        |
| `npm run db:migrate`   | Schema- und Datenmigration auf `DB_PATH` anwenden (wie beim Serverstart) |
| `npm run backup`       | DB + Galerie-Fotos als `backups/tilly-<zeit>.tar.gz` sichern (`BACKUP_DIR`, `BACKUP_KEEP`, Default 14) |
| `npm run restore -- <datei> --yes` | Backup einspielen (App vorher stoppen; alter Stand bleibt als `.before-restore-*`) |
| `npm run db:seed`      | Standardübungen einmalig in den `kv_store` einspielen (idempotent)   |

## Deployment

Für den produktiven Betrieb auf dem eigenen Ubuntu-Server siehe [SERVER_SETUP.md](SERVER_SETUP.md).

## Rollout-Checkliste (Update auf Sync-Protokoll 3)

1. Alle Clients synchronisieren lassen und nicht mehr benutzen.
2. `npm run backup`; Anzahl der Einträge pro Typ notieren.
3. Prüfen, dass `TZ=Europe/Berlin` in der Server-Umgebung gesetzt ist.
4. Neuen Code deployen und Server starten – Migrationen laufen automatisch (mit
   `.pre-migrate-*.bak`-Backup). Bei nicht umwandelbaren Einträgen bricht die Migration mit
   ID-Liste ab und rollt zurück.
5. Danach Anzahl pro Typ vergleichen und prüfen, dass kein `start_at = 0` übrig ist:
   `sqlite3 tilly.db "select count(*) from entries where start_at = 0"`
6. Clients neu installieren; alle Daten kommen initial vom Server.
