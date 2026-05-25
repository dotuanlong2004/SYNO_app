#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/4] Starting Docker services..."
docker start postgres-db redis-server >/dev/null 2>&1 || true

echo "[2/4] Installing backend dependencies..."
cd "$ROOT_DIR/backend"
npm install

echo "[3/4] Installing admin_web dependencies..."
cd "$ROOT_DIR/admin_web"
npm install

echo "[4/4] Launching backend and admin web..."
cd "$ROOT_DIR/backend"
nohup npm start > ../backend.log 2>&1 &

cd "$ROOT_DIR/admin_web"
nohup npm run dev -- --port 5174 > ../admin_web.log 2>&1 &

echo
echo "=========================================="
echo "Services started successfully!"
echo "Backend API : http://127.0.0.1:3000"
echo "Admin Web   : http://127.0.0.1:5174"
echo "Logs        : backend.log, admin_web.log"
echo "=========================================="
echo
