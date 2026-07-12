#!/usr/bin/env bash
# Starts everything needed for a local Rhizolve dev run: Postgres, Redis,
# backend (uvicorn --reload), frontend (vite dev). Runs in the foreground;
# Ctrl+C tears everything down.
#
# Prerequisites (not started by this script):
#   - backend/.env with CLERK_SECRET_KEY set
#   - frontend/web/.env.local with VITE_CLERK_PUBLISHABLE_KEY set
#   - Docker, uv, pnpm installed
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/web"

POSTGRES_CONTAINER="rhizolve-dev-postgres"
REDIS_CONTAINER="rhizolve-dev-redis"
POSTGRES_PORT=5432
REDIS_PORT=6379
BACKEND_PORT=7860
FRONTEND_PORT=5173

LOG_DIR="$ROOT_DIR/scripts/.dev-logs"
mkdir -p "$LOG_DIR"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo
  echo "Shutting down..."
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  docker stop "$POSTGRES_CONTAINER" "$REDIS_CONTAINER" >/dev/null 2>&1 || true
  echo "Stopped."
}
trap cleanup EXIT INT TERM

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not found" >&2
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "WARNING: $BACKEND_DIR/.env not found -- copy .env.example and set CLERK_SECRET_KEY" >&2
fi
if [[ ! -f "$FRONTEND_DIR/.env.local" ]]; then
  echo "WARNING: $FRONTEND_DIR/.env.local not found -- copy .env.example and set VITE_CLERK_PUBLISHABLE_KEY" >&2
fi

echo "Starting Postgres on :$POSTGRES_PORT..."
if [[ "$(docker ps -aq -f name="^${POSTGRES_CONTAINER}$")" ]]; then
  docker start "$POSTGRES_CONTAINER" >/dev/null
else
  docker run -d --name "$POSTGRES_CONTAINER" \
    -e POSTGRES_USER=rhizolve -e POSTGRES_PASSWORD=rhizolve -e POSTGRES_DB=rhizolve \
    -p "${POSTGRES_PORT}:5432" postgres:16-alpine >/dev/null
fi

echo "Starting Redis on :$REDIS_PORT..."
if [[ "$(docker ps -aq -f name="^${REDIS_CONTAINER}$")" ]]; then
  docker start "$REDIS_CONTAINER" >/dev/null
else
  docker run -d --name "$REDIS_CONTAINER" -p "${REDIS_PORT}:6379" redis:8-alpine >/dev/null
fi

echo "Waiting for Postgres..."
for _ in $(seq 1 30); do
  docker exec "$POSTGRES_CONTAINER" pg_isready -U rhizolve >/dev/null 2>&1 && break
  sleep 0.5
done

echo "Waiting for Redis..."
for _ in $(seq 1 20); do
  docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1 && break
  sleep 0.5
done

echo "Applying database migrations..."
(cd "$BACKEND_DIR" && uv run alembic upgrade head)

echo "Starting backend on :$BACKEND_PORT (log: $LOG_DIR/backend.log)..."
(cd "$BACKEND_DIR" && uv run uvicorn api.main:app --reload --port "$BACKEND_PORT") \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

echo "Starting frontend on :$FRONTEND_PORT (log: $LOG_DIR/frontend.log)..."
(cd "$FRONTEND_DIR" && VITE_API_PROXY_TARGET="http://localhost:${BACKEND_PORT}" pnpm dev --port "$FRONTEND_PORT") \
  > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo
echo "Backend:  http://localhost:$BACKEND_PORT/api/v1/health"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Logs:     $LOG_DIR/{backend,frontend}.log"
echo "Ctrl+C to stop everything."
echo

wait "$BACKEND_PID" "$FRONTEND_PID"
