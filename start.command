#!/bin/bash
# Double-click this file in Finder to run ធៀបអនឡាញ (Theab Online) on your Mac.
cd "$(dirname "$0")" || exit 1
clear
echo "=============================================="
echo "  ធៀបអនឡាញ · Theab Online — starting up"
echo "=============================================="

# 1) Node.js
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "❌ Node.js is not installed."
  echo "   Opening https://nodejs.org — download the LTS version, install it,"
  echo "   then double-click start.command again."
  open "https://nodejs.org/en/download"
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Node.js $(node -v) is too old. Please install Node 20 or newer from https://nodejs.org"
  open "https://nodejs.org/en/download"
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✓ Node.js $(node -v)"

# 2) Dependencies (first run only, or after updates)
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  echo ""
  echo "📦 Installing packages (first time takes 1–3 minutes)..."
  npm install --no-audit --no-fund || { echo "❌ npm install failed"; read -n 1 -s -r -p "Press any key..."; exit 1; }
  touch node_modules
fi

# 3) First-time setup: secret key, database, templates, your admin account
if [ ! -f .env.local ] || [ ! -d .data/pglite ]; then
  echo ""
  echo "🛠  First-time setup — create your ADMIN account"
  read -r -p "   Admin email: " ADMIN_EMAIL
  while true; do
    read -r -s -p "   Admin password (min 8 characters): " ADMIN_PW; echo ""
    [ ${#ADMIN_PW} -ge 8 ] && break
    echo "   Password too short, try again."
  done
  SEED_ADMIN_EMAIL="$ADMIN_EMAIL" SEED_ADMIN_PASSWORD="$ADMIN_PW" npm run setup || { echo "❌ Setup failed"; read -n 1 -s -r -p "Press any key..."; exit 1; }
else
  # keep templates/migrations up to date after updates
  npm run db:migrate >/dev/null 2>&1
  npm run db:seed >/dev/null 2>&1
fi

# 4) Start
PORT="${PORT:-30001}"
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
# Keep guest links (APP_URL) pointing at the port we actually run on.
if [ -f .env.local ]; then
  if grep -q '^APP_URL=' .env.local; then
    python3 - "$PORT" <<'PY' 2>/dev/null || sed -i '' "s#^APP_URL=.*#APP_URL=http://localhost:$PORT#" .env.local
import sys,re
p='.env.local'; s=open(p).read()
s=re.sub(r'^APP_URL=.*$', f'APP_URL=http://localhost:{sys.argv[1]}', s, flags=re.M)
open(p,'w').write(s)
PY
  else
    echo "APP_URL=http://localhost:$PORT" >> .env.local
  fi
fi
echo ""
echo "🚀 Starting on http://localhost:$PORT"
echo "   Keep this window open while you use the app. Press Ctrl+C to stop."
echo ""
( sleep 6; open "http://localhost:$PORT" ) &
npx next dev -p $PORT
