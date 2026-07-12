#!/usr/bin/env bash
# Assembles the huggingface/ Docker Space POC's build context by copying
# the real backend/{agent,core,models,api} and frontend/web source into
# huggingface/backend/ and huggingface/frontend/web (disk-only — these
# copies are gitignored, never committed). See ADR-022.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HF_DIR="$ROOT_DIR/huggingface"

echo "Assembling backend source into $HF_DIR/backend..."
rm -rf "$HF_DIR/backend/agent" "$HF_DIR/backend/core" "$HF_DIR/backend/models" "$HF_DIR/backend/api"
cp -r "$ROOT_DIR/backend/agent" "$HF_DIR/backend/agent"
cp -r "$ROOT_DIR/backend/core" "$HF_DIR/backend/core"
cp -r "$ROOT_DIR/backend/models" "$HF_DIR/backend/models"
cp -r "$ROOT_DIR/backend/api" "$HF_DIR/backend/api"

echo "Assembling frontend source into $HF_DIR/frontend/web..."
rm -rf "$HF_DIR/frontend/web"
cp -r "$ROOT_DIR/frontend/web" "$HF_DIR/frontend/web"
rm -rf "$HF_DIR/frontend/web/node_modules" "$HF_DIR/frontend/web/dist"

echo "Done."
