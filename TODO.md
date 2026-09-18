# Tilly Tracker - Übergabe für die nächste Session

## Ziel

Tilly Tracker ist eine deutschsprachige, offlinefähige PWA zum gemeinsamen Erfassen von
Tillys Alltag: Futter, Stuhlgang, Training, Stress, Auffälligkeiten, Gewicht,
Tierarztbesuche, Kosten und Tageschecks.

Die App soll unter `https://tilly.serenitycloud.org` auf einem Ubuntu-Server laufen.
Dort läuft bereits Apache für zwei Nextcloud-Instanzen; Apache soll als Reverse Proxy vor
einem lokal gebundenen Node-Prozess laufen. Deployment ist zunächst manuell per SSH geplant.

## Verbindliche Architekturentscheidungen

- Next.js mit App Router und TypeScript statt der früheren Vite/Firebase-App.
- SQLite + Drizzle ORM; `db/schema.ts` ist die zentrale Datenmodell-Definition für API und UI.
- Auth.js (NextAuth v5) mit Google als reinem OAuth-Identity-Provider.
- Zugriff ist nur für zwei Google-Konten erlaubt: `ALLOWED_GOOGLE_EMAILS`.
- Lokale Offline-Persistenz per IndexedDB (`idb-keyval`) mit Mutation-Queue und Synchronisation.
- PWA per `@ducanh2912/next-pwa`; API-Requests werden nicht durch den Service Worker gecacht.
- Entwicklung im Dev Container (`.devcontainer/`), nicht nativ auf Windows.
- Das bisherige UI-Look-and-Feel muss erhalten bleiben. Die alte Referenzimplementierung ist
  weiterhin in `src/App.jsx` vorhanden.

## Besonderheit: Tagescheck / Geduld

- `Folgsamkeit` und `Sharklevel`/`Energie` beschreiben Tilly und bleiben gemeinsame Werte.
- Der bisher gemeinsam gespeicherte Wert `Geduld` gehört jeweils der Person, die ihn einträgt.
- Die Google-Session bestimmt den Nutzer automatisch; es gibt keinen separaten Profil-Picker.
- Im Home-View soll der eigene Geduld-Wert direkt editierbar sein. Der Wert des Partners ist
  read-only über einen kleinen Tab/Link sichtbar.

## Bereits umgesetzt

- Next.js/TypeScript/Tailwind-Grundgerüst: `app/`, `tsconfig.json`, `next.config.js`,
  `tailwind.config.ts`, `postcss.config.js`.
- Design-Farben aus der bisherigen App wurden nach `tailwind.config.ts` übernommen.
- Drizzle-Datenmodell: `db/schema.ts`, `db/client.ts`, `drizzle.config.ts`.
  - `kvStore`: selten geänderte Einstellungen
  - `entries`: Aktivitäten mit JSON-Daten, synchronisierbar pro Eintrag
  - `dailyPatience`: Geduld je Google-E-Mail und Tag
- Auth.js-Grundkonfiguration: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`.
  Der `signIn`-Callback lässt nur E-Mails aus `ALLOWED_GOOGLE_EMAILS` zu.
- Sync-Route: `app/api/sync/route.ts`.
  - GET: Änderungen seit `?since=<timestamp>`
  - POST: Last-Write-Wins-Upserts für Einstellungen, Einträge und eigene Geduld-Werte
  - Schutz über Auth.js-Session
- Client-Sync: `lib/storage/`.
  - `local-db.ts`: IndexedDB-Persistenz
  - `index.ts`: API für lokale Mutationen und Queue
  - `sync.ts`: Push-then-pull, Reconnect/Fokus/2-Minuten-Sync
  - `useSyncStatus.ts`: Hook für Offline/ausstehend/synchron-Indikator
- Manifest: `app/manifest.ts`; Icons liegen in `public/icons/`.
- Dev Container: Node 20 + Build-Tools für `better-sqlite3`, Port 3000.
- `README.md`, `.env.example`, `.gitignore` vorhanden.

## Noch offen - empfohlene Reihenfolge

1. **Abhängigkeiten installieren und Fundament prüfen**
   - Im Container: `npm install`
   - Dann `npm run dev` und anschließend `npm run build` ausführen.
   - Falls notwendig, inkompatible Paketversionen korrigieren und den neuen `package-lock.json`
     einchecken. Der bisherige Lockfile wurde absichtlich beim Vite-Cleanup entfernt.

2. **Datenbank-Migrationen einrichten und anwenden**
   - Drizzle-Migration aus `db/schema.ts` erzeugen (`npm run db:generate`).
   - Migration lokal ausführen (`npm run db:migrate`).
   - Sicherstellen, dass `DB_PATH` aus `.env.local` verwendet wird und nicht eingecheckt wird.

3. **Auth lokal testbar machen**
   - Google OAuth-Client im bestehenden GCP-Projekt (unter dem bisherigen Firebase-Projekt)
     anlegen.
   - Lokalen Origin und Redirect-URI ergänzen:
     `http://localhost:3000` und `http://localhost:3000/api/auth/callback/google`.
   - Für Produktion später `https://tilly.serenitycloud.org` und
     `https://tilly.serenitycloud.org/api/auth/callback/google` ergänzen.
   - `.env.local` aus `.env.example` ableiten: `AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
     `GOOGLE_CLIENT_SECRET`, `ALLOWED_GOOGLE_EMAILS`.

4. **UI inkrementell aus `src/App.jsx` portieren**
   - Nicht als großen Rewrite machen. Die alte Datei als Referenz behalten, bis die neue UI
     vollständig funktioniert.
   - **Fortschritt:** Eine authentifizierte App-Shell mit Home-Ansicht, Tagescheck,
     Schnell-Erfassung, Verlauf und mobiler Navigation ist in `components/app-shell.tsx`
     portiert. Add/Edit-Formulare und Auswertung folgen noch.
   - Zuerst Shared UI in `components/` extrahieren (z.B. Farben/Konstanten, `StarRow`,
     `CatIcon`, `NavButton`, Datums-/Format-Helfer).
   - Danach Views einzeln: Home -> Add/Edit-Form -> History -> Analysis -> Exercises.
   - Jede UI-Komponente, die Hooks, IndexedDB oder Browser-APIs nutzt, braucht `"use client"`.
   - Das aktuelle `app/page.tsx` ist nur ein Platzhalter und soll die eigentliche App aufnehmen.

5. **Geduld korrekt in die UI einbauen**
   - `geduld` aus Tagescheck-Entry entfernen und `dailyPatience`/`setMyPatience` verwenden.
   - Daten für Partner-Geduld aus IndexedDB lesen, aber nicht editierbar machen.
   - Add/Edit-Form entsprechend bereinigen.
  - **Fortschritt:** Der eigene Wert wird in der Home-Ansicht über `getPatience` und
    `setMyPatience` gelesen bzw. gespeichert; der Tagescheck-Entry enthält ihn nicht mehr.

6. **Sync-Status sichtbar machen**
   - `useSyncStatus` in die spätere App-Shell einbinden.
   - Knappen Status im bestehenden UI-Stil zeigen: Offline, ausstehende Änderungen oder synchron.
  - **Erledigt:** Statusanzeige ist in der App-Shell eingebunden.

7. **Prüfen und manuell testen**
   - Zwei getrennte Browserprofile mit den zwei Google-Konten verwenden.
   - Offline schalten, jeweils Einträge anlegen, reconnecten und prüfen, ob beide Einträge da sind.
   - Geduld-Werte müssen pro Person getrennt bleiben.
   - PWA installieren und offline öffnen.

8. **Produktions-Deployment später**
   - Node 20/22 + `build-essential` auf Ubuntu installieren.
   - Repo nach `/opt/tillyapp`, DB nach `/var/lib/tillyapp/tilly.db`.
   - `next build`, `next start -p 4001` über eine systemd-Unit.
   - Apache VirtualHost für `tilly.serenitycloud.org` mit ProxyPass auf `127.0.0.1:4001`.
   - TLS via certbot und HTTP-zu-HTTPS-Redirect.
   - Tägliches SQLite-Backup (`sqlite3 .backup ...`).

## Wichtig: alte Dateien

Die alten Firebase/Vite/GitHub-Pages-Dateien wurden bereits entfernt:
`.firebaserc`, `firebase.json`, `index.html`, `vite.config.js`, `src/firebase.js`,
`src/main.jsx`, `.github/` und der alte `package-lock.json`.

`src/App.jsx` ist absichtlich noch da und nur eine Referenz für die Portierung. Erst löschen,
wenn alle Views in `app/` und `components/` funktionsgleich portiert sind.
