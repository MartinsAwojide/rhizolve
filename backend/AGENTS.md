# AGENTS.md — backend/

Python 3.12, managed with `uv`. FastAPI + LangGraph. Redis via `langgraph-checkpoint-redis` (`AsyncRedisSaver` + `AsyncRedisStore`).

## Commands

- Install deps: `uv sync`
- Dev server (hot reload already configured in the container): `uvicorn api.main:app --reload --port 7860`
- Tests: `uv run pytest` — coverage gate: `uv run pytest --cov=backend --cov-fail-under=80`
- Lint: `uv run ruff check .` — fix: `uv run ruff check . --fix`
- Format: `uv run ruff format .`
- Type check: `uv run mypy .`
- Add a dependency: `uv add <package>` (never hand-edit `pyproject.toml` deps)
- Add a dev-only dependency: `uv add --dev <package>`

## Code style

- All I/O is `async def` + `await`. No blocking sync calls in a route handler or graph node.
- Pydantic v2 for every request/response schema and every piece of graph state — no raw dicts crossing a function boundary a model could type instead.
- Structured LLM output over string parsing, matching the existing pattern:
```python
class RootCauseDecision(BaseModel):
    is_root_cause: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    probe_direction: str
```

## Testing

- `pytest-asyncio` — follow the explicit `@pytest.mark.asyncio` convention already used in existing test files.
- Every new route needs at least one 403 test for a wrong-role case (see `tests/test_rbac.py`). RBAC is enforced via `Depends`, not decorators — the wiring is what tends to slip, not the model logic.
- Anything touching `AsyncRedisSaver` or `AsyncRedisStore` directly runs against a real `redis:8-alpine` service container in CI, not a mock.

## Boundaries

- Never write a `MembershipScope` check inline inside a route handler body — it must be a `Depends`. FastMCP auto-generates MCP tools from this same FastAPI app; an inline check in a handler body gets bypassed by an MCP-mediated call. See `docs/adr/ADR-006-project-collaboration.md`.
- Never call PDF/report generation from a `GET` route handler. Reports generate eagerly inside `report_generator` at graph completion; `GET` routes only read the already-generated artifact from storage. See `docs/agile/e08-reporting-compliance.md` (US-55).
- `FastMCP.from_openapi()` is deprecated and breaks under `fastmcp>=3.0.0`. Use `OpenAPIProvider` + `FastMCP(providers=[...])`. See `docs/adr/ADR-001-fastapi-gradio-server.md`.

## Definition of Done (backend)

- [ ] `uv run ruff check .` and `uv run mypy .` clean
- [ ] `uv run pytest` green, new logic covered
- [ ] Any new context-bearing route has both an RBAC test and a `MembershipScope` test
