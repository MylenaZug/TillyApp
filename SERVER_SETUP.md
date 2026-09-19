# Server-Setup (Ubuntu, Produktion)

Zielumgebung: eigener Ubuntu-Server, auf dem bereits Apache für zwei Nextcloud-Instanzen
läuft. Tilly Tracker läuft dort als eigener Node-Prozess auf einem lokalen Port, Apache
dient als Reverse Proxy davor. Deployment erfolgt manuell per SSH.

- **Domain:** `tilly.serenitycloud.org`
- **App-Verzeichnis:** `/opt/tillyapp`
- **Datenbank:** `/var/lib/tillyapp/tilly.db`
- **Port:** `4001` (nur lokal gebunden, nicht öffentlich erreichbar)

## 1. Voraussetzungen auf dem Server

```bash
# Node 20/22 sowie Build-Tools fuer better-sqlite3
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential python3
```

## 2. Google OAuth Client

Im bestehenden GCP-Projekt einen OAuth-Client anlegen (Web-Application) mit:

- Autorisierter Origin: `https://tilly.serenitycloud.org`
- Autorisierte Redirect-URI: `https://tilly.serenitycloud.org/api/auth/callback/google`

`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` daraus in die Produktions-`.env` übernehmen.

## 3. Deployment

```bash
sudo mkdir -p /opt/tillyapp /var/lib/tillyapp
cd /opt/tillyapp
git clone <repo-url> .
npm ci
```

`.env` unter `/opt/tillyapp/.env` anlegen (siehe `.env.example`), insbesondere:

- `AUTH_SECRET` – eigener, zufälliger Wert (z. B. `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – aus Schritt 2
- `ALLOWED_GOOGLE_EMAILS` – die freigeschalteten Google-Konten
- `DB_PATH=/var/lib/tillyapp/tilly.db`

Datenbank einrichten und befüllen:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
```

## 4. systemd-Unit

`/etc/systemd/system/tillyapp.service`:

```ini
[Unit]
Description=Tilly Tracker
After=network.target

[Service]
WorkingDirectory=/opt/tillyapp
ExecStart=/usr/bin/npx next start -p 4001
Restart=on-failure
User=www-data
EnvironmentFile=/opt/tillyapp/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tillyapp
```

## 5. Apache Reverse Proxy + TLS

Neuer VirtualHost, analog zu den bestehenden Nextcloud-Vhosts, mit `ProxyPass`/`ProxyPassReverse`
auf `http://127.0.0.1:4001`. Anschließend TLS per certbot einrichten und HTTP auf HTTPS
umleiten:

```bash
sudo a2enmod proxy proxy_http
sudo certbot --apache -d tilly.serenitycloud.org
```

## 6. Backups

Tägliches SQLite-Backup per Cron:

```bash
sqlite3 /var/lib/tillyapp/tilly.db ".backup /var/backups/tillyapp/tilly-$(date +\%F).db"
```

## 7. Updates ausrollen

```bash
cd /opt/tillyapp
git pull
npm ci
npm run db:generate && npm run db:migrate
npm run build
sudo systemctl restart tillyapp
```
