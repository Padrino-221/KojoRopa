#!/usr/bin/env bash
#
# Provision a fresh Ubuntu 24.04 Vultr box for KojoRopa.
#
# Run as root (Vultr "root" user):  sudo bash deploy/setup-server.sh
#
# Optional env vars to set before running:
#   DOMAIN=store.example.com   your domain (enables HTTPS via Caddy)
#   EMAIL=you@example.com      contact email shown in the footer
#   ADMIN_PASSWORD=...         reuse a password instead of generating one
#   DB_PASS=...                reuse a DB password instead of generating one
#
set -euo pipefail

APP_USER="kojoropa"
APP_DIR="/opt/kojoropa"
REPO_URL="https://github.com/Padrino-221/KojoRopa.git"
BRANCH="${BRANCH:-master}"
DOMAIN="${DOMAIN:-}"
DB_NAME="kojoropa"
DB_USER="kojoropa"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash deploy/setup-server.sh" >&2
  exit 1
fi

echo "==> Updating base system"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> Installing base packages"
apt-get install -y curl ca-certificates gnupg lsb-release git build-essential ufw postgresql

echo "==> Installing Node.js 22 (NodeSource)"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "==> Installing Caddy"
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/deb.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

echo "==> Adding 2 GB swap (protects the Next.js build from OOM on 1 GB boxes)"
if [ ! -e /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---- app user + dirs ---------------------------------------------------------
if ! id "$APP_USER" >/dev/null 2>&1; then
  adduser --system --group --home "$APP_DIR" "$APP_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---- secrets + env -----------------------------------------------------------
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
SESSION_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 18 | tr -d '\n')}"
SITE_URL="${DOMAIN:+https://$DOMAIN}"

if [ ! -f "$APP_DIR/.env" ]; then
  echo "==> Writing $APP_DIR/.env (generated secrets)"
  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
ADMIN_TOTP_SECRET=""
SESSION_SECRET="${SESSION_SECRET}"
NEXT_PUBLIC_SITE_URL="${SITE_URL}"
NEXT_PUBLIC_CURRENCY="GH₵"
NEXT_PUBLIC_SITE_NAME="KojoRopa"
NEXT_PUBLIC_SITE_TAGLINE="Secondhand shirts, one of one."
NEXT_PUBLIC_SITE_DESCRIPTION="KojoRopa is a curated secondhand shirt shop from Accra. Graphic tees, deadstock blanks and soft-washed classics — one of one, picked at Kantamanto Market."
NEXT_PUBLIC_SITE_KEYWORDS="thrift store,secondhand,vintage shirts,graphic tees,Kantamanto,Accra,Ghana"
NEXT_PUBLIC_CONTACT_EMAIL="${EMAIL:-hello@example.com}"
NEXT_PUBLIC_INSTAGRAM_HANDLE="@kojoropa"
NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD=300
NEXT_PUBLIC_SHIPPING_FEE=30
NEXT_PUBLIC_DEFAULT_COUNTRY="Ghana"
NEXT_PUBLIC_MAX_PRODUCT_IMAGES=8
NEXT_PUBLIC_MAX_QTY=99
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
MOOLRE_BASE_URL="https://sandbox.moolre.com"
MOOLRE_API_USER=""
MOOLRE_PUB_KEY=""
MOOLRE_ACCOUNT_ID=""
MOOLRE_SECRET=""
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  echo "    -> generated ADMIN_PASSWORD=${ADMIN_PASSWORD}"
fi

# ---- database ----------------------------------------------------------------
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  echo "==> Creating PostgreSQL role + database"
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 \
    -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';" \
    -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

# ---- app code + build --------------------------------------------------------
echo "==> Fetching app code"
if [ ! -d "$APP_DIR/app/.git" ]; then
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR/app"
else
  git -C "$APP_DIR/app" pull --ff-only
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR/app"

echo "==> Installing dependencies and building"
cd "$APP_DIR/app"
cp "$APP_DIR/.env" .env
runuser -u "$APP_USER" -- npm ci
runuser -u "$APP_USER" -- npx prisma migrate deploy
runuser -u "$APP_USER" -- npx prisma db seed
runuser -u "$APP_USER" -- npm run build

echo "==> Assembling standalone output"
rm -rf standalone
cp -r .next/standalone standalone
mkdir -p standalone/.next/static
cp -r .next/static/. standalone/.next/static/
cp -r public/. standalone/public/
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---- systemd service ---------------------------------------------------------
echo "==> Installing systemd service"
cat > /etc/systemd/system/kojoropa.service <<'SVC'
[Unit]
Description=KojoRopa storefront (Next.js standalone)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=kojoropa
Group=kojoropa
WorkingDirectory=/opt/kojoropa/app/standalone
EnvironmentFile=/opt/kojoropa/.env
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload
systemctl enable kojoropa.service
systemctl restart kojoropa.service

# ---- Caddy -------------------------------------------------------------------
echo "==> Configuring Caddy reverse proxy"
if [ -n "$DOMAIN" ]; then
  cat > /etc/caddy/Caddyfile <<CADDY
${DOMAIN} {
    reverse_proxy 127.0.0.1:3000
}
CADDY
else
  cat > /etc/caddy/Caddyfile <<CADDY
:80 {
    reverse_proxy 127.0.0.1:3000
}
CADDY
fi
systemctl enable caddy
systemctl restart caddy

# ---- firewall ----------------------------------------------------------------
echo "==> Configuring firewall (22, 80, 443)"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx HTTP' >/dev/null 2>&1 || ufw allow 80/tcp >/dev/null
ufw allow 'Nginx HTTPS' >/dev/null 2>&1 || ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

echo ""
echo "============================================================="
echo "  KojoRopa deployed."
echo ""
if [ -n "$DOMAIN" ]; then
  echo "  Site:      https://${DOMAIN}"
  echo "  (Caddy ordered a Let's Encrypt cert — first request may be slow)"
else
  echo "  Site:      http://${IP}"
  echo "  (add a domain + HTTPS later: set DOMAIN and rerun, then edit /etc/caddy/Caddyfile)"
fi
echo "  Admin:     https://${DOMAIN:-$IP}/admin"
echo "  Password:  ${ADMIN_PASSWORD}"
echo "  Moolre webhook URL: https://${DOMAIN:-$IP}/api/webhook/moolre"
echo ""
echo "  BEFORE going live, edit /opt/kojoropa/.env and set:"
echo "    - NEXT_PUBLIC_SITE_URL"
echo "    - NEXT_PUBLIC_CONTACT_EMAIL"
echo "    - CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET"
echo "    - MOOLRE_API_USER / PUB_KEY / ACCOUNT_ID / SECRET"
echo "    - (optional) ADMIN_TOTP_SECRET for 2FA"
echo "  then run:  sudo bash /opt/kojoropa/app/deploy/deploy.sh"
echo "============================================================="
