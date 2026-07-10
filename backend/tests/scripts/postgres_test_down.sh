#!/usr/bin/env bash
set -euo pipefail
docker stop rhizolve-test-postgres >/dev/null 2>&1 || true
