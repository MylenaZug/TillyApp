#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm install

if [ ! -f .env ]; then
  cp .env.example .env
  # AUTH_SECRET muss gesetzt sein, sonst wirft Auth.js einen MissingSecret-Fehler.
  secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${secret}|" .env
  echo "Created .env with a generated AUTH_SECRET (Google login still needs real GOOGLE_CLIENT_ID/SECRET; use the Dev-Login button until then)."
fi
