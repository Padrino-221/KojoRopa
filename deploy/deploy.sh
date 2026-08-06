#!/usr/bin/env bash
#
# Update the running KojoRopa deployment on the server.
# Pulls latest code, reapplies migrations, rebuilds and restarts.
#
# Run on the server as root:  sudo bash /opt/kojoropa/app/deploy/deploy.sh
#
set -euo pipefail

APP_USER="kojoropa"
APP_DIR="/opt/kojoropa/app"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash /opt/kojoropa/app/deploy/deploy.sh" >&2
  exit 1
fi

cd "$APP_DIR"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Refreshing env and dependencies"
cp /opt/kojoropa/.env .env
npm ci

echo "==> Applying migrations"
npx prisma migrate deploy

echo "==> Building"
npm run build

echo "==> Assembling standalone output"
rm -rf standalone
cp -r .next/standalone standalone
mkdir -p standalone/.next/static
cp -r .next/static/. standalone/.next/static/
cp -r public/. standalone/public/
chown -R "$APP_USER:$APP_USER" /opt/kojoropa

echo "==> Restarting service"
systemctl restart kojoropa.service
systemctl --no-pager status kojoropa.service --no-pager || true

echo ""
echo "Deploy complete. Check logs with:  journalctl -u kojoropa.service -f"
