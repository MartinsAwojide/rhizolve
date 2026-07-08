# E01 — Foundation & Infrastructure

**Epic statement:** The engineering team needs a reproducible development and deployment environment so that every feature built on top of it is testable and deployable from day one.

**Sprint:** SP01 (2 weeks)  
**Hill:** Enables H1 — the foundation every other epic depends on  
**Refs:** [ADR-001](../adr/ADR-001-fastapi-gradio-server.md), [ADR-002](../adr/ADR-002-redis-checkpointer.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Single dependency truth: `uv` manages backend, `pnpm` manages frontend
- Containerised: `docker compose up` starts backend (7860), frontend (5173), Redis (6379)
- Testable: CI green on every push, ≥ 80% coverage on route handlers
- `system_or_process_context` is the field name everywhere — `equipment_context` does not exist in the codebase

---

## Spike

**SP-01 — Upstash Redis + `AsyncRedisSaver` HTTPS compatibility**  
Time-box: 0.5 day. Question: Does `AsyncRedisSaver.from_conn_string()` work with Upstash HTTPS REST URL or does it require native TCP? Output: Connection string format confirmed in ADR-002. Done when: `asetup()` passes against Upstash free tier.

---

## US-01 — Monorepo initialised with correct structure

**As a** developer, **I want** a single repo with clearly separated directories managed by `uv` and `pnpm`, **so that** I can install everything with one command and run the full stack without manual configuration.

**Acceptance criteria:**
- `docker compose up` starts all three services in < 30 seconds on a fresh clone
- `cd backend && uv sync` installs all Python deps without error
- `cd frontend/web && pnpm install` installs all Node deps without error
- `grep -r "equipment_context" backend/` returns empty
- `grep -r "equipment_context" frontend/` returns empty

**Tasks:**
- T01: Create structure: `backend/`, `frontend/web/`, `mobile/android/`, `docs/`, `infra/`
- T02: Init `uv` project in `backend/` with `pyproject.toml`, pin Python 3.12
- T03: Init `pnpm` + Vite + React 19 + TypeScript in `frontend/web/`
- T04: Migrate existing files into `backend/`; rename `equipment_context` → `system_or_process_context` in the same commit across all files
- T05: Write `infra/compose.yml` with `redis:8-alpine`, backend, frontend services
- T06: Add `.python-version` (3.12), `.nvmrc` (22)
- T07: Carry over root `AGENTS.md`, `CLAUDE.md` (imports `AGENTS.md`), and nested `AGENTS.md` in `backend/`, `frontend/web/`, `mobile/android/` from SP00 — these ship with the monorepo skeleton, not added later as an afterthought

**Tests:**
```python
def test_system_or_process_context_in_input_state():
    from schemas import InputState
    assert "system_or_process_context" in InputState.__annotations__

def test_no_equipment_context_anywhere():
    import subprocess
    r = subprocess.run(["grep", "-r", "equipment_context", "backend/"], capture_output=True, text=True)
    assert r.stdout == "", f"equipment_context still exists: {r.stdout}"
```

---

## US-02 — Backend runs in container with hot reload

**As a** developer, **I want** the FastAPI backend running in Docker with live reload on file changes, **so that** I develop without rebuilding the container.

**Acceptance criteria:**
- Container starts on port 7860
- `.py` file change reloads server within 2 seconds without container restart
- `GET /api/v1/health` returns `{"status": "ok", "redis": "connected"}` within 1 second of start

**Tasks:**
- T01: Write `backend/Dockerfile.dev` with `uvicorn --reload` entrypoint
- T02: Mount `./backend` as volume in `compose.yml`
- T03: Write `backend/api/main.py` with FastAPI app and `GET /api/v1/health`
- T04: Write `backend/core/config.py` loading all env vars with `python-dotenv`
- T05: Add `.env.example` with all required var names

**Tests:**
```python
@pytest.mark.asyncio
async def test_health_returns_ok(async_client):
    r = await async_client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
```

---

## US-03 — Frontend runs in container with HMR

**As a** developer, **I want** the React frontend in Docker with Vite HMR active, **so that** UI changes appear in the browser instantly.

**Acceptance criteria:**
- Container starts on port 5173
- `.tsx` file change updates browser within 1 second without full reload
- Frontend can call `/api/v1/health` without CORS errors

**Tasks:**
- T01: Write `frontend/web/Dockerfile.dev` with `vite --host` entrypoint
- T02: Mount `./frontend/web/src` as volume
- T03: Configure Vite proxy in `vite.config.ts` forwarding `/api` to `http://backend:7860`
- T04: Configure CORS in FastAPI to allow `http://localhost:5173`
- T05: Write minimal `App.tsx` calling `/api/v1/health`

---

## US-04 — Redis persists data across container restarts

**As a** developer, **I want** Redis to persist data across `docker compose restart`, **so that** investigation state is not lost during development.

**Acceptance criteria:**
- Redis starts on port 6379
- State survives `docker compose restart`; wiped by `docker compose down -v`
- `make_checkpointer()` initialises successfully on app start

**Tasks:**
- T01: Add `redis:8-alpine` with named volume and `--save 60 1` to `compose.yml`
- T02: Write `backend/core/memory.py` with `make_checkpointer()` returning `(AsyncRedisSaver, ctx)`
- T03: Write `make_store()` for `AsyncRedisStore` (used by E02 memory and E09 RAG)
- T04: Add `REDIS_URL` to `.env.example`
- T05: Wire Redis ping into `GET /api/v1/health`

**Tests:**
```python
@pytest.mark.asyncio
async def test_asetup_is_idempotent(checkpointer):
    await checkpointer.asetup()
    await checkpointer.asetup()  # must not raise

@pytest.mark.asyncio
async def test_state_persists_across_instances(redis_url):
    c1, ctx1 = await make_checkpointer()
    config = {"configurable": {"thread_id": "test-persist"}}
    await c1.aput(config, dummy_checkpoint(), {}, {})
    await ctx1.__aexit__(None, None, None)
    c2, ctx2 = await make_checkpointer()
    result = await c2.aget(config)
    assert result is not None
    await ctx2.__aexit__(None, None, None)
```

---

## US-05 — CI enforces quality gates on every push

**As a** developer, **I want** automated lint, type-check, and tests on every PR, **so that** broken code cannot merge to main.

**Acceptance criteria:**
- `ruff` violation blocks merge with file and line reported
- Failing test blocks merge with name and reason
- `mypy` type error blocks merge
- Route handler coverage ≥ 80%
- `equipment_context` presence in `backend/` or `frontend/` fails CI

**Tasks:**
- T01: `.github/workflows/ci-backend.yml`: `ruff check`, `mypy`, `pytest` with Redis service container
- T02: `.github/workflows/ci-frontend.yml`: `eslint`, `vitest --run`, `tsc --noEmit`
- T03: `.pre-commit-config.yaml`: `ruff format`, `ruff check --fix`, `mypy` fast mode
- T04: Branch protection on `main`: CI must pass, no force push
- T05: `pytest-cov` with `--cov-fail-under=80`
- T06: Grep check for `equipment_context` in both CI workflows

---

## US-06 — All seven ADRs reviewed and merged

**As a** team, **I want** all architectural decisions documented before implementation begins, **so that** every technical choice has a traceable rationale.

**Acceptance criteria:**
- ADR-001 through ADR-007 present in `docs/adr/` with Status, Context, Decision, Consequences, Alternatives
- All ADRs merged as first PR before any implementation work
- `product-brief.md` cross-references all seven in Section 13

**Tasks:**
- T01: Team ADR review (1 hour) — record any amendments
- T02: Merge ADRs as first PR in the project

**Phase gate:** All six criteria for US-01 through US-06 met before SP02 begins.
