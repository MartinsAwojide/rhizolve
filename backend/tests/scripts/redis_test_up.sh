#!/usr/bin/env bash
set -euo pipefail
docker run -d --rm --name rhizolve-test-redis -p 16379:6379 redis:8-alpine >/dev/null
echo "waiting for redis..."
for _ in $(seq 1 20); do
  if docker exec rhizolve-test-redis redis-cli ping >/dev/null 2>&1; then
    echo "redis ready on localhost:16379"
    exit 0
  fi
  sleep 0.5
done
echo "redis did not become ready in time" >&2
exit 1
