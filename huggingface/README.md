---
title: Rhizolve POC
emoji: 🌱
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
suggested_hardware: cpu-basic
---

# Rhizolve — Public POC

A public proof-of-concept deployment of Rhizolve (AI-assisted 5 Whys
root-cause investigation platform), served via [`gr.Server`](https://gradio.app/guides/server-mode)
instead of plain FastAPI. See [ADR-022](../docs/adr/ADR-022-huggingface-poc-gr-server-deployment.md)
for why this is a separate deployment from the main app — the main app
(`backend/`, `frontend/web/`) is untouched and stays on plain FastAPI.

## Prerequisites before this deploys anywhere

This folder builds an image; it does not deploy itself. Before
`.github/workflows/deploy-hf-poc.yml` does anything real:

1. Create a Hugging Face Space at [huggingface.co/new-space](https://huggingface.co/new-space),
   SDK = **Docker**.
2. Add a fine-grained [access token](https://huggingface.co/settings/tokens)
   (write access to that Space) as a GitHub repository secret named
   `HF_TOKEN`.
3. Set the `HF_SPACE_ID` GitHub repository variable to `username/space-name`.
4. In the Space's own **Settings → Repository secrets**, add:
   `REDIS_URL`, `OPENROUTER_API_KEY`, `SERPER_API_KEY`, `REPORT_SIGNING_KEY`.
5. This README's `suggested_hardware: cpu-basic` is a hint only (shown
   if someone duplicates the Space) — it does not assign hardware.
   Confirm CPU Basic (free) is actually selected under Settings →
   Hardware after creating the Space.

## Local build

```bash
./scripts/hf-poc-assemble.sh   # copies real backend/{agent,core,models,api}
                                # and frontend/web into this folder (gitignored)
docker build -f huggingface/Dockerfile huggingface
docker run -p 7860:7860 --env-file backend/.env <image-id>
curl http://localhost:7860/api/v1/health
```

## Why this folder exists instead of modifying the main app

- HF Docker Spaces require the `Dockerfile`/`README.md` at the Space
  repo's root — there's no way to point a Space at a subdirectory
  Dockerfile.
- `huggingface/hub-sync`'s `subdirectory` parameter syncs only this
  folder as the Space root, so this folder must be self-contained.
- `huggingface/backend/main.py` is the only thing actually committed
  here for the backend — `agent/`, `core/`, `models/`, `api/` are the
  real `backend/` package, copied in at CI/build time (never duplicated
  in git). `backend/` remains the single source of truth.
