# Frontend — reused from `frontend/web`

This folder holds no forked React source. `scripts/hf-poc-assemble.sh`
copies the real `frontend/web` directory here (as `huggingface/frontend/web`,
gitignored) before the Docker build, and `huggingface/Dockerfile`'s Node
builder stage runs `pnpm build` against that copy unchanged.

## `gr.Server`-specific serving considerations

- **Same-origin API calls.** Both the API and the built React app are
  served by the one `gr.Server` instance on port 7860 (see
  `huggingface/backend/main.py`), so the frontend's existing relative
  `/api/v1/*` fetch calls work unchanged — no separate API base URL
  needed for this deployment.
- **SPA fallback.** `gr.Server`'s documented routing priority ("your
  custom routes take priority over Gradio's default routes") means a
  catch-all `@app.get("/{full_path:path}")` route, registered *after*
  all `app.include_router()` calls in `main.py`, is what serves
  `index.html` for any client-side route (e.g. `/projects/abc`) instead
  of 404ing. Static assets (`/assets/*`, Vite's build output) are
  mounted separately via `StaticFiles` before the fallback route.
- No other `gr.Server`-specific frontend changes were needed — confirm
  this still holds against `gr.Server`'s current docs before assuming it
  during a future update, since the library was published April 2026 and
  is still evolving (see ADR-022).
