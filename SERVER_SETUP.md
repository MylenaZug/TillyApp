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

## 2. Google OAuth von Grund auf einrichten

Fuer den Login braucht die App ein Google-Cloud-Projekt und einen OAuth-Client.
Weitere Google-APIs, eine Datenbank in Google Cloud oder ein kostenpflichtiger
Billing-Account sind fuer diese App nicht erforderlich.

### 2.1 Google-Cloud-Projekt erstellen

1. Bei [Google Cloud Console](https://console.cloud.google.com/) mit dem Google-Konto
	anmelden, das das Projekt verwalten soll.
2. Oben in der Projekt-Auswahl **Neues Projekt** waehlen.
3. Als Projektname z. B. `Tilly Tracker` eintragen und **Erstellen** klicken.
4. Das neue Projekt anschliessend in der Projekt-Auswahl aktivieren.

### 2.2 OAuth-Zustimmungsbildschirm konfigurieren

1. Zu **APIs & Services > OAuth consent screen** wechseln. Je nach Console-Version
	kann der Bereich **Google Auth Platform** heissen.
2. Als Zielgruppe **External** waehlen. **Internal** ist nur passend, wenn alle
	Benutzer demselben Google-Workspace gehoeren.
3. Die App-Daten eintragen:
	- App name: `Tilly Tracker`
	- User support email: deine E-Mail-Adresse
	- Developer contact information: ebenfalls deine E-Mail-Adresse
4. Bei den Scopes die Standardauswahl fuer OpenID, E-Mail und Profil beibehalten.
	Es werden keine weiteren Scopes benoetigt.
5. Die beiden erlaubten Google-Konten unter **Test users** eintragen:
	- deine E-Mail-Adresse
	- die zweite E-Mail-Adresse, die Zugriff bekommen soll
6. Konfiguration speichern. Fuer diese private Anwendung reicht der Testmodus aus.

### 2.3 OAuth-Client anlegen

1. Zu **APIs & Services > Credentials** wechseln.
2. **Create credentials > OAuth client ID** klicken.
3. Als Anwendungstyp **Web application** waehlen.
4. Einen Namen vergeben, z. B. `Tilly Tracker Production`.
5. Bei **Authorized JavaScript origins** eintragen:

	`https://tilly.serenitycloud.org`

6. Bei **Authorized redirect URIs** exakt eintragen:

	`https://tilly.serenitycloud.org/api/auth/callback/google`

	Die URI muss inklusive `https`, Domain und Pfad exakt stimmen. Kein abschliessender
	Slash und keine lokale URI verwenden.
7. **Create** klicken und Client-ID sowie Client-Secret sicher notieren.

Die beiden Werte kommen spaeter in `/opt/tillyapp/.env` als `GOOGLE_CLIENT_ID` und
`GOOGLE_CLIENT_SECRET`. Das Client-Secret niemals in Git einchecken oder im Browser
anzeigen.

## 3. Deployment

```bash
# Eigener Benutzer fuer die App; nicht als root und nicht als www-data betreiben.
sudo useradd --system --home /opt/tillyapp --shell /usr/sbin/nologin tillyapp
sudo install -d -o tillyapp -g tillyapp /opt/tillyapp /var/lib/tillyapp
sudo -u tillyapp -H git clone <repo-url> /opt/tillyapp
sudo -u tillyapp -H sh -c 'cd /opt/tillyapp && npm ci'
```

`.env` unter `/opt/tillyapp/.env` anlegen (siehe `.env.example`). Wichtig sind vor allem
die folgenden Werte. Die Datei soll nur fuer `tillyapp` lesbar sein:

- `AUTH_SECRET` – eigener, zufälliger Wert (z. B. `openssl rand -base64 32`)
- `AUTH_TRUST_HOST=true` – erforderlich, weil Auth.js hinter Apache/Reverse Proxy läuft
- `AUTH_URL=https://tilly.serenitycloud.org` – öffentliche URL der App, ohne `/api/auth`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – aus Schritt 2
- `ALLOWED_GOOGLE_EMAILS` – die freigeschalteten Google-Konten
- `DB_PATH=/var/lib/tillyapp/tilly.db`

```bash
sudo chown tillyapp:tillyapp /opt/tillyapp/.env
sudo chmod 600 /opt/tillyapp/.env
```

Datenbank einrichten und befüllen:

```bash
sudo -u tillyapp -H sh -c 'cd /opt/tillyapp && npm run db:generate'
sudo -u tillyapp -H sh -c 'cd /opt/tillyapp && npm run db:migrate'
sudo -u tillyapp -H sh -c 'cd /opt/tillyapp && npm run db:seed'
sudo -u tillyapp -H sh -c 'cd /opt/tillyapp && npm run build'
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
User=tillyapp
EnvironmentFile=/opt/tillyapp/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tillyapp
```

## 5. Apache Reverse Proxy + TLS

Fuer Tilly gibt es keine statischen Dateien, die Apache ueber ein `DocumentRoot`
ausliefern muss. Apache nimmt die HTTPS-Verbindung an und reicht alle Requests an den
lokalen Next.js-Prozess auf Port 4001 weiter.

Zuerst die benoetigten Apache-Module aktivieren:

```bash
sudo a2enmod proxy proxy_http headers ssl
```

Die Datei `/etc/apache2/sites-available/tilly.serenitycloud.org.conf` anlegen:

```apache
<VirtualHost *:80>
	ServerName tilly.serenitycloud.org

	Redirect permanent / https://tilly.serenitycloud.org/
</VirtualHost>

<IfModule mod_ssl.c>
	<VirtualHost *:443>
		ServerName tilly.serenitycloud.org
		ServerAdmin johannes@szeibert.de

		ErrorLog ${APACHE_LOG_DIR}/tilly_error.log
		CustomLog ${APACHE_LOG_DIR}/tilly_access.log combined

		ProxyPreserveHost On
		RequestHeader set X-Forwarded-Host "tilly.serenitycloud.org"
		RequestHeader set X-Forwarded-Port "443"
		RequestHeader set X-Forwarded-Proto "https"
		ProxyPass / http://127.0.0.1:4001/
		ProxyPassReverse / http://127.0.0.1:4001/

		Include /etc/letsencrypt/options-ssl-apache.conf
		SSLCertificateFile /etc/letsencrypt/live/tilly.serenitycloud.org/fullchain.pem
		SSLCertificateKeyFile /etc/letsencrypt/live/tilly.serenitycloud.org/privkey.pem
	</VirtualHost>
</IfModule>
```

Fuer das erste Zertifikat muss zunaechst nur ein HTTP-VHost ohne Redirect und ohne
HTTPS-Block aktiv sein. Dazu voruebergehend die folgenden Zeilen in der Datei verwenden:

```apache
<VirtualHost *:80>
	ServerName tilly.serenitycloud.org
	DocumentRoot /var/www/html
</VirtualHost>
```

DNS muss bereits auf den Server zeigen. Danach Zertifikat ausstellen, die temporaere
HTTP-Konfiguration durch den vollstaendigen VHost oben ersetzen und Apache neu laden:

```bash
sudo a2ensite tilly.serenitycloud.org.conf
sudo apachectl configtest
sudo systemctl reload apache2
sudo certbot certonly --webroot -w /var/www/html -d tilly.serenitycloud.org
# Jetzt die temporaere HTTP-Konfiguration durch den vollstaendigen VHost oben ersetzen.
sudo apachectl configtest
sudo systemctl reload apache2
```

Alternativ kann `sudo certbot --apache -d tilly.serenitycloud.org` die Zertifikate
ausstellen und die SSL-Konfiguration automatisch ergaenzen. Danach pruefen:

```bash
curl -I https://tilly.serenitycloud.org
```

## 6. Backups

Tägliches SQLite-Backup per Cron:

```bash
sqlite3 /var/lib/tillyapp/tilly.db ".backup /var/backups/tillyapp/tilly-$(date +\%F).db"
```

## 7. Updates ausrollen

```bash
sudo -u tillyapp -H sh -c 'cd /opt/tillyapp && git pull && npm ci && npm run db:generate && npm run db:migrate && npm run build'
sudo systemctl restart tillyapp
```
