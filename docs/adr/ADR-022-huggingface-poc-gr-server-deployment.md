# ADR-022 — Public POC Deployment via `gr.Server`, Separate from Main App

**Status:** Accepted
**Date:** 2026-07-12
**Sprint:** SP10 (US-37, deployment)
**Refs:** [E05 Web Client](../agile/e05-web-client.md), [ADR-001](ADR-001-fastapi-gradio-server.md)

---

## Context

US-37 originally assumed a plain-FastAPI multi-stage Dockerfile per
ADR-001 (React static build + FastAPI at one port, HF Spaces
compatible). Mid-planning, research surfaced `gradio.Server` — a FastAPI
subclass Hugging Face published April 2026 (after most training data;
verified via `huggingface.co/blog/introducing-gradio-server` and
`gradio.app/guides/server-mode` on the date of this ADR) that adds
Gradio's queuing/SSE/`gradio_client` engine on top of a fully
FastAPI-compatible surface — `app.include_router()`, existing
decorators, and middleware all work unchanged; migration is literally
"replace `FastAPI()` with `Server()`".

ADR-001 also framed Gradio as pilot scaffolding "retired at the end of
E05" — but no Gradio UI (`gr.mount_gradio_app`, `ui/gradio_app.py`) was
ever actually built, so there was nothing to retire. US-37/38 are E05's
last stories, making this the natural point to settle Gradio's role for
good rather than build-then-immediately-retire a throwaway pilot UI.

## Decision

1. **The main app stays plain FastAPI, untouched.** `backend/api/main.py`
   is not migrated to `gr.Server` — the user explicitly wants the
   production app decoupled from a brand-new, still-maturing library
   rather than adopting it wholesale.
2. **A separate `huggingface/` folder at the repo root** hosts a public
   proof-of-concept deployment using `gr.Server`, with its own
   `backend/` and `frontend/`. `huggingface/backend/main.py` mirrors
   `backend/api/main.py`'s 18-router list and lifespan almost exactly,
   swapping `FastAPI(lifespan=lifespan)` for `gr.Server(lifespan=lifespan)`
   and adding a static/SPA-fallback mount for the built React app.
3. **No source duplication in git.** HF Docker Spaces require the
   Dockerfile and README at the Space repo's root — confirmed via
   `huggingface.co/docs/hub/en/spaces-config-reference` there is no
   field to point a Space at a subdirectory Dockerfile. The
   `huggingface/hub-sync` GitHub Action's `subdirectory` parameter
   ("useful for monorepos") solves this by syncing only `huggingface/`'s
   contents as the Space root. Since that means `huggingface/backend/`
   can't `import` across to `../backend/agent`, `../core`, etc. at
   HF's build time, a CI step (`.github/workflows/deploy-hf-poc.yml`)
   copies `backend/{agent,core,models,api}` into `huggingface/backend/`
   on the GitHub Actions runner's disk **before** the sync action runs —
   never committed to git (`.gitignore`'d). `backend/` remains the sole
   source of truth; `huggingface/backend/` only commits the new
   `gr.Server` bootstrap file.

## Consequences

- `backend/`'s 18 routers must stay framework-agnostic (`APIRouter`
  objects with no `FastAPI`-specific assumptions) for the CI-copy +
  reimport trick to keep working — true today, and worth preserving
  going forward.
- The POC's actual deploy (creating the HF Space, adding `HF_TOKEN` +
  app secrets to GitHub/the Space) is a manual step only the user can
  do — this ADR and its implementation don't produce a live URL by
  themselves.
- `huggingface/backend/pyproject.toml` duplicates (rather than
  references) `backend/pyproject.toml`'s runtime dependency list plus
  `gradio` — kept manually in sync, a known POC-scope tradeoff, not
  automated.
- Any future change to `backend/api/main.py`'s router list must be
  mirrored by hand into `huggingface/backend/main.py` — no automatic
  sync of that specific file (only the `agent/core/models/api`
  directories are CI-copied; the two `main.py` entrypoints are
  deliberately separate, since one is gr.Server-specific).

## Alternatives Considered

- **Migrate the main app to `gr.Server`.** Rejected — decouples
  production from a library that's weeks old at time of writing; the
  user wants the option to adopt or drop it later without touching the
  primary deployment.
- **Duplicate full backend/frontend source into `huggingface/` in git.**
  Rejected — permanent drift risk between two committed copies of the
  same business logic; the CI-time disk-only copy achieves the same
  self-contained-folder requirement (needed for HF's subdirectory sync)
  without a second source of truth.
- **Sync the whole monorepo to the Space (default `subdirectory: .`)
  instead of just `huggingface/`.** Rejected — would require the
  Dockerfile to live at the true repo root, defeating the isolation the
  user asked for, and would ship unrelated folders (`mobile/`, `docs/`)
  into the Space repo for no benefit.
