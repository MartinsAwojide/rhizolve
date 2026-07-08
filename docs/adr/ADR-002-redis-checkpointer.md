# ADR-002 — `AsyncRedisSaver` Replaces `AsyncSqliteSaver`

**Status:** Accepted  
**Date:** 2026-07-04  
**Refs:** [Product Brief](../product-brief.md)

## Context

`AsyncSqliteSaver` writing to `investigations/memory.db` has three production blockers: HF Spaces ephemeral filesystem loses state on redeploy; SQLite does not support concurrent writers across multiple processes; no native namespace isolation for multi-project concurrent investigations.

## Decision

Replace with `AsyncRedisSaver` from `langgraph-checkpoint-redis`. Thread IDs namespaced as `{project_id}:{investigation_id}`.

```python
# backend/core/memory.py
from langgraph.checkpoint.redis.aio import AsyncRedisSaver

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

async def make_checkpointer():
    ctx = AsyncRedisSaver.from_conn_string(REDIS_URL)
    checkpointer = await ctx.__aenter__()
    await checkpointer.asetup()  # creates RediSearch indices (idempotent)
    return checkpointer, ctx
```

Redis 8.0+ required — RedisJSON and RediSearch bundled in core. Development: `redis:8-alpine`. Production: Upstash Redis (HF Spaces compatible).

## Consequences

**Positive:** Survives redeploys, concurrent writers, project-level isolation via key prefix, O(3) network round trips regardless of checkpoint history length (v0.4.1+ redesign).

**Negative:** Redis 8.0+ required; Upstash free tier for pilot; `asetup()` must be called on startup.

## Alternatives Considered

`AsyncPostgresSaver`: Production-grade but adds Postgres dependency. Viable at scale — revisit if Redis cost becomes a concern at Phase 4.

`ShallowRedisSaver`: Stores only latest checkpoint. Rejected — full history required for `interrupt_before`/`interrupt_after` to resume correctly from any interrupt point.
