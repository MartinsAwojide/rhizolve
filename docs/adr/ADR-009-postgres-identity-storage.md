# ADR-009 — Postgres + SQLAlchemy for Identity and Collaboration Data

**Status:** Accepted
**Date:** 2026-07-10
**Sprint:** SP04 (US-15)
**Refs:** [E03 Identity & Access](../agile/e03-identity-access.md), [E04 Project Collaboration](../agile/e04-project-collaboration.md), [ADR-006](ADR-006-project-collaboration.md)

---

## Context

Every story before US-15 was satisfiable with Redis alone: `AsyncRedisSaver`
for LangGraph checkpoints, `AsyncRedisStore` for chat memory and user
preferences. US-15 is the first story needing genuinely relational data — a
`User` record keyed uniquely by `clerk_user_id`, with e04 soon adding
`Organisation`, `ProjectMember` (role, status), and e08 an append-only audit
log, all of which need real joins, uniqueness constraints, and query patterns
(duplicate-invite checks, org-membership lookups, RBAC role checks) that
Redis document storage handles increasingly awkwardly as they compound.

## Decision

**Postgres, accessed via SQLAlchemy's async engine (`asyncpg` driver), with
Alembic for schema migrations.**

- `core/db.py` provides `make_engine()`/`make_sessionmaker()` (built once in
  `api/main.py`'s `lifespan`, stored on `app.state` — mirrors the existing
  `app.state.redis`/`app.state.five_whys_agent` pattern) and a
  `get_db_session(request)` FastAPI dependency that yields a session per
  request from that shared sessionmaker. The engine is **not** opened per
  call the way `core/memory.py`'s `make_checkpointer()` is — that shape is
  fine for a handful of Redis connections per test, but would exhaust the
  Postgres connection pool under real request load.
- **Migrations run with a sync driver (`psycopg`), not `asyncpg`.** Alembic's
  async `env.py` template is comparatively fragile; `env.py` derives a sync
  `postgresql+psycopg://` URL from the app's `postgresql+asyncpg://`
  `DATABASE_URL` at migration time only. The app itself always uses
  `asyncpg`. This is a well-established pattern for keeping Alembic simple
  without giving up an async app engine.
- Real Postgres in tests, not mocked — `tests/scripts/postgres_test_up.sh`/
  `postgres_test_down.sh` (mirrors the existing `redis_test_up.sh`/
  `redis_test_down.sh` pair exactly), with `alembic upgrade head` run before
  the suite.
- First-login upsert (`core/auth.py`'s `_upsert_user`) uses
  `INSERT ... ON CONFLICT (clerk_user_id) DO UPDATE`, not select-then-insert
  — `get_current_user` upserts on every authenticated request (not just an
  explicit `/auth/sync` call), so two concurrent first-time requests from the
  same new user are a realistic race that a plain select-then-insert would
  lose to a unique-constraint violation.

## Consequences

**Positive:**
- Real relational queries (uniqueness, joins, future RBAC checks) instead of
  reimplementing them on top of Redis documents.
- Async app path stays consistent with the rest of the codebase (LangGraph,
  Redis) while migrations stay on the simpler sync tooling path.
- New CI service (`postgres:16-alpine`, mirrors the existing `redis` service
  block) and `DATABASE_URL`/`CLERK_SECRET_KEY` env wiring, consistent with
  how `OPENROUTER_API_KEY`/`SERPER_API_KEY` are already handled.

**Negative:**
- A second stateful service to run locally and in CI (previously only Redis).
- Two DB drivers in the dependency tree (`asyncpg` for the app, `psycopg` for
  Alembic) — a deliberate tradeoff to avoid Alembic's async template
  complexity, not an oversight.

## Alternatives Considered

- **Extend `AsyncRedisStore`** (store `User`/`Organisation`/`ProjectMember`
  as documents under new namespaces, matching how chat memory/preferences
  already work) — rejected. No real uniqueness enforcement, and e04's RBAC
  joins (role checks across project members, org-scope computation per
  ADR-006) would mean hand-rolling relational logic Postgres already
  provides, with more code and more room for subtle bugs as e04/e08 add more
  entities.
- **Async Alembic `env.py` (asyncpg throughout, including migrations)** —
  rejected for this pass. Works, but the async migration template adds
  meaningfully more moving parts for no behavioral benefit over running
  migrations with a plain sync driver; can be revisited if a real need
  arises (e.g. migrations needing to run inside the same async context as
  the app).
