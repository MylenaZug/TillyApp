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
- **Offline-Sync:** Lokale Persistenz per IndexedDB (`idb-keyval`, siehe `lib/storage/`),
  optimistische Updates und eine Mutation-Queue, die bei bestehender Verbindung mit dem
  Server abgeglichen wird (Last-Write-Wins pro Eintrag anhand eines `updatedAt`-Zeitstempels).
- **PWA:** installierbar, offline nutzbar (`@ducanh2912/next-pwa`); der Service Worker
  cacht nur Assets, API-Aufrufe laufen über die eigene Sync-Engine.

## Datenmodell (Kurzüberblick)

- `entries` – ein Datensatz pro Aktivität (Futter, Stuhlgang, Training, Stress,
  Auffälligkeit, Gewicht, Tierarzt, Kosten, Tagescheck); typspezifische Felder liegen als
  JSON in `data`.
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
npm install

# Datenbankschema anwenden und Übungsbibliothek einmalig befüllen
npm run db:generate
npm run db:migrate
npm run db:seed

npm run dev
```

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
| `npm run db:migrate`   | Migration auf `DB_PATH` anwenden                                     |
| `npm run db:seed`      | Standardübungen einmalig in den `kv_store` einspielen (idempotent)   |

## Deployment

Für den produktiven Betrieb auf dem eigenen Ubuntu-Server siehe [SERVER_SETUP.md](SERVER_SETUP.md).
