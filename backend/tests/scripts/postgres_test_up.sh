#!/usr/bin/env bash
set -euo pipefail
docker run -d --rm --name rhizolve-test-postgres -p 15432:5432 \
  -e POSTGRES_USER=rhizolve -e POSTGRES_PASSWORD=rhizolve -e POSTGRES_DB=rhizolve \
  postgres:16-alpine >/dev/null
echo "waiting for postgres..."
for _ in $(seq 1 30); do
  if docker exec rhizolve-test-postgres pg_isready -U rhizolve >/dev/null 2>&1; then
    echo "postgres ready on localhost:15432"
    exit 0
  fi
  sleep 0.5
done
echo "postgres did not become ready in time" >&2
exit 1
