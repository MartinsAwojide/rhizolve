# ADR-012 — Membership Scope: Schema and Implementation

**Status:** Accepted
**Date:** 2026-07-11
**Sprint:** SP04-SP05 (US-19a)
**Refs:** [E03 Identity & Access](../agile/e03-identity-access.md), [ADR-006](ADR-006-project-collaboration.md), [ADR-011](ADR-011-project-rbac-middleware.md)

---

## Context

ADR-006 designed `MembershipScope` (internal/external), `require_internal_scope()`,
and `serialize_why_tree()` as a second, independent authorization axis on top
of role — an `EXTERNAL`-scoped Contributor must be blocked from
context/RAG/integration/audit/report endpoints even though the role matrix
alone would allow a Contributor through. Per the doc's own words, "this is
the actual implementation... without this story it is architecture with no
code behind it." Confirmed via grep: none of `MembershipScope`,
`require_internal_scope`, `get_project_member`, `serialize_why_tree` existed
anywhere in `backend/` before this story — only in the ADR-006 text.

Two schema gaps blocked a literal implementation of ADR-006's design:

1. `Project` had no `org_id` column (only `owner_id`) — `member.scope` is
   defined as `user.org_id != project.org_id`, which requires both sides to
   exist.
2. `ProjectMember` had no `relationship()` declarations — only raw
   `project_id`/`user_id` FK columns. `member.user`/`member.project` didn't
   exist to back a computed `scope` property.

US-19a's T03 lists 5 target endpoints for `require_internal_scope`: context
injection, RAG search, external integration context, audit log, report
export. Only **context injection** (already role-gated per ADR-011) exists
today — the other 4 are later epics (E08/E09/E11), same situation ADR-011
already documented for role gating.

## Decision

**`Project.org_id`** — nullable FK to `organisations.id`, inherited directly
from the creator's `user.org_id` at `POST /api/v1/projects` time (not the
`maturity_level` pattern's extra `Organisation` row fetch — only the id is
needed). Nullable because a solo/no-org user can still create a project;
their project simply has no org boundary (everyone is `INTERNAL` on it,
since `None == None`).

**`ProjectMember.scope`** — a computed `@property`, never a stored column,
per ADR-006's explicit "never cached" requirement:

```python
@property
def scope(self) -> MembershipScope:
    if self.user.org_id == self.project.org_id:
        return MembershipScope.INTERNAL
    return MembershipScope.EXTERNAL
```
Backed by two new unidirectional `relationship()` declarations
(`ProjectMember.user`, `ProjectMember.project`) — no `back_populates`, since
nothing on `User`/`Project` needs the reverse side today.

**`api/middleware/scope.py`** — `get_project_member` (looks up the active
`ProjectMember` row, eager-loading `.user`/`.project` via `selectinload`
since the async session forbids implicit lazy loads) and
`require_internal_scope` (403s if `scope == EXTERNAL`), exactly per ADR-006's
spec — a `Depends`, not inline logic, so MCP tool calls (E10, proxying the
same route handlers) inherit the check automatically.

Wired into context injection **alongside** the existing
`require_project_role(Role.CONTRIBUTOR)` — role and scope are independent
gates, both required, each doing its own `ProjectMember` query (the same
"one extra join per authorized request" tradeoff ADR-006 already names).
RAG search/external integration/audit log/report export are **not wired** —
their routes don't exist yet; they'll pick up `require_internal_scope` when
their stories land.

**`serialize_why_tree(nodes, scope)`** — built as a pure function in new
`agent/serializers.py`, per T04's literal deliverable, but **not wired to
any route** (no why-tree endpoint exists). Deviates from ADR-006's own
snippet: that snippet assumes `WhyNode` is a Pydantic model with
`.model_dump(include=...)`; `WhyNode` is actually a `TypedDict`
(`agent/graph.py`) with no `domain_context`/RAG/integration fields on it at
all — `domain_context` lives on `OverallState`, not per-node, and RAG/
external-integration context don't exist in the schema yet. The
implementation instead strips to a `EXTERNAL_SAFE_FIELDS` allow-list
(`id`, `branch_path`, `depth`, `hypothesis`, `gemba_result`, `status`) for
`EXTERNAL` scope, keeping the current best analog of "structure vs detail"
(`gemba_notes`, `is_root_cause`, `countermeasure`, `model_attribution`,
`attachments` are the fields dropped). This function is the natural place to
extend that strip list once RAG/integration context actually attach to
why-tree responses.

## Consequences

**Positive:**
- `require_internal_scope` is real and tested, not just designed — closes
  the "architecture with no code behind it" gap ADR-006 called out.
- `Project.org_id` inheritance is automatic at creation, no extra step for
  callers.
- `serialize_why_tree` exists and is unit-tested now, ready to wire in when
  the why-tree endpoint (a later story) lands.

**Negative:**
- `get_project_member`/`require_internal_scope` duplicates a `ProjectMember`
  lookup already done by `require_project_role` on the same request when
  both are declared — an accepted cost, not a bug.
- `serialize_why_tree`'s redaction fields are an approximation against
  `WhyNode`'s current shape, not ADR-006's literal field list (which doesn't
  exist on `WhyNode` yet) — will need revisiting once RAG/integration
  context are actually attached to tree nodes.
- RAG search, external integration context, audit log, and report export
  remain unauthorized-by-scope simply because they don't exist — not a gap
  in this story, but worth tracking so it isn't forgotten when those routes
  are built.

## Alternatives Considered

No new alternatives beyond what ADR-006 already decided — this ADR is about
the concrete schema/implementation choices ADR-006 left open: where
`Project.org_id` comes from, and how `member.scope` loads its related rows
without lazy-load errors under an async session.
