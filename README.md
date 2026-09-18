# Tilly Tracker

Eine kleine PWA, mit der wir gemeinsam die Entwicklung und den Alltag unserer Hündin Tilly tracken können.
Futter, Stuhlgang, Training, Stress, Auffälligkeiten, Gewicht, Tierarztbesuche, Kosten und einen täglichen "Tagescheck". Die App läuft offlinefähig auf unseren Handys und
synchronisiert Einträge automatisch, sobald wieder eine Verbindung zum Server besteht.

## Status

Das Projekt wird gerade von einer Firebase/GitHub-Pages-Bastellösung auf einen selbst
gehosteten Stack migriert (Branch `pivot`). Ziel-Domain: `tilly.serenitycloud.org`,
gehostet auf einem eigenen Ubuntu-Server hinter Apache.

## Architektur (Zielzustand)

- **Framework:** [Next.js](https://nextjs.org) (App Router, TypeScript) – Frontend, API-Routes
  und Datenmodell in einem Projekt statt separater Vite-SPA + Express-Backend.
- **Datenbank:** SQLite, Zugriff über [Drizzle ORM](https://orm.drizzle.team) (`db/schema.ts`
  ist die einzige Quelle der Wahrheit für das Datenmodell, im ganzen Projekt als TypeScript-Typen
  nutzbar).
- **Auth:** [Auth.js](https://authjs.dev) mit Google als reinem OAuth-Identity-Provider.
  Zugriff ist auf eine feste Allow-List von zwei Google-Konten (uns beide) beschränkt.
- **Offline-Sync:** Lokale Persistenz per IndexedDB (`idb-keyval`), optimistische Updates und
  eine Mutation-Queue, die bei bestehender Verbindung mit dem Server abgeglichen wird
  (Last-Write-Wins pro Eintrag anhand eines `updatedAt`-Zeitstempels).
- **PWA:** installierbar, offline nutzbar, Service Worker cacht nur Assets – API-Aufrufe
  laufen über die eigene Sync-Engine statt Cache.
- **Hosting:** Node-Prozess (`next start`) via systemd auf dem eigenen Ubuntu-Server,
  Apache als Reverse Proxy + TLS (Let's Encrypt/certbot) davor.

## Datenmodell (Kurzüberblick)

- `entries` – ein Datensatz pro Aktivität (Futter, Stuhlgang, Training, Stress,
  Auffälligkeit, Gewicht, Tierarzt, Kosten, Tagescheck).
- `kvStore` – kleinere, seltener geänderte Einstellungen (Trainingsarten, Futterarten,
  Übungsliste, Notizen, Futterplan).
- `dailyPatience` – der "Geduld"-Wert des Tageschecks, getrennt pro Person (Google-Konto)
  erfasst, statt sich einen gemeinsamen Wert zu teilen.

## Entwicklung

Die Entwicklung läuft in einem Dev Container (VS Code "Reopen in Container" bzw.
`devcontainer CLI`), nicht nativ auf dem Host - das Devcontainer-Image bringt Node 20 sowie
die Build-Tools mit, die `better-sqlite3` zum Kompilieren braucht.

```bash
npm install
npm run dev
```

Benötigte Umgebungsvariablen siehe `.env.example`.

## Deployment

Siehe Projektnotizen für die schrittweise Anleitung (Google OAuth Client einrichten,
Node + systemd-Service auf dem Server, Apache-Vhost mit ProxyPass, certbot, Backup-Cron).
