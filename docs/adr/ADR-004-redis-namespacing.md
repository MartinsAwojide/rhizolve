# ADR-004 — Redis Namespace Isolation per Project

**Status:** Accepted  
**Date:** 2026-07-04  
**Refs:** [Product Brief](../product-brief.md), [ADR-002](ADR-002-redis-checkpointer.md)

## Context

Concurrent investigations across multiple projects share a single Redis instance. Without namespace isolation, `thread_id` collisions between projects are possible and cross-project data leakage is a risk.

## Decision

LangGraph `thread_id` is namespaced as `{project_id}:{investigation_id}`. Enforced at API layer before any Redis operation.

```python
# backend/core/threading.py
def make_thread_id(project_id: str, investigation_id: str) -> str:
    return f"{project_id}:{investigation_id}"

def parse_thread_id(thread_id: str) -> tuple[str, str]:
    parts = thread_id.split(":", 1)
    if len(parts) != 2:
        raise ValueError(f"Invalid thread_id format: {thread_id}")
    return parts[0], parts[1]
```

Validation rule: `project_id` and `investigation_id` must match `^[a-z0-9\-]+$`. Enforced at creation via Pydantic field validator. The `:` separator cannot appear in either component.

RBAC middleware verifies project membership before any graph operation — isolation is enforced in application code, not Redis configuration.

## Consequences

**Positive:** Zero Redis configuration for isolation; human-readable keys (`KEYS proj-abc:*`); scales to any number of concurrent projects.

**Negative:** RBAC enforcement is a discipline requirement — every route must call `require_project_member` before any Redis operation.

## Alternatives Considered

Separate Redis databases per project: Legacy feature, max 16 databases, no access control. Rejected.

Separate Redis instances per project: Strong isolation but operationally complex. Not justified until multi-org enterprise scale requires it.
