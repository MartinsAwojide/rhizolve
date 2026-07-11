# ADR-015 — Audit Log Storage and Driver Cache

**Status:** Accepted
**Date:** 2026-07-11
**Sprint:** SP16 (US-23, US-25, backend slice, built together)
**Refs:** [E04 Project Collaboration](../agile/e04-project-collaboration.md), [ADR-006](ADR-006-project-collaboration.md), [ADR-007](ADR-007-state-interchange-format.md), [ADR-009](ADR-009-postgres-identity-storage.md), [ADR-014](ADR-014-sse-streaming-and-presence.md)

---

## Context

US-25 needs driver-only tree resets (soft-suspend or hard-tombstone a branch
and its descendants) logged as an audit event with driver identity, reset
type, branch path, and evidence reference (ADR-006's Tree Navigation
section). US-23 needs a driver resolved from active presence — most senior
steering-eligible role (Owner > Analyst > Contributor), ties broken by
earliest join time — and that resolution needs to gate `POST .../tree/reset`
via a `require_driver` dependency. Built together since the reset endpoint's
authorization *is* the driver-election feature; there is no independent
consumer of `require_driver` yet.

Two things didn't exist before this pair of stories: any audit-log storage
pattern, and any notion of a "current driver" cached anywhere.

## Decision

**Audit log lives in Postgres, in a new `audit_log` table, not in
LangGraph-checkpointed state or Redis.** A tree-reset audit record (driver
identity, reset type, branch path, evidence reference, timestamp) is a
compliance artifact, not investigation working state — it must outlive
Redis checkpoint retention/eviction and survive independent of any given
investigation's LangGraph thread lifecycle. This mirrors ADR-009's
Postgres-for-identity reasoning, extended to audit-trail data.
`models/audit_log.py`'s `AuditLog` follows `models/project_invitation.py`'s
existing pattern (int PK, `ForeignKey` to `projects.id`/`users.id`,
`Enum` for `reset_type`, `created_at: DateTime(timezone=True)`).
`investigation_id` is stored as a plain `String`, not a foreign key —
investigations have no Postgres row (identity lives entirely in Redis
checkpoints); inventing an FK to a nonexistent table was rejected.

**`soft_reset`/`hard_reset` tombstone via `status`, they never remove
`WhyNode` entries.** `_merge_why_nodes` (`agent/graph.py`) is a
union-by-`id` reducer — writing a shorter `why_nodes` list through
`aupdate_state` does not delete anything, the reducer re-adds any id
already present in existing state on the next merge. So "hard reset
deletes children" is implemented as `status = "deleted"` on the target
branch and all descendants (siblings untouched), with the report generator
(`_build_report_markdown`) and `_find_why_node` (both in `agent/graph.py`,
extended this pass) doing the actual hiding: `deleted` nodes are excluded
from the rendered report and from branch-path lookup entirely; `suspended`
nodes remain visible in the report (with a note) and remain findable, since
a driver may want to inspect or re-reset an already-suspended branch. A
missing `status` key is treated as `"active"` everywhere
(`node.get("status", "active")`), keeping every pre-existing
`tests/test_graph.py` fixture (none of which set `status`) behaviorally
unchanged.

`agent/tree_navigation.py`'s `soft_reset`/`hard_reset` are pure functions
over `dict[str, WhyNode]` (branch-path keyed), matching US-25's given test
shape exactly. `FiveWhysAgent.reset_tree` (`agent/five_whys_agent.py`)
adapts the real flat `list[WhyNode]` runtime shape (per ADR-007's
cross-engine interchange contract — `why_nodes` is an array, not an
object, since it's shared with Koog/Android) to and from this dict via
`_why_nodes_to_tree`/`_tree_to_why_nodes`, isolating the conversion to one
call site rather than changing `WhyNode`'s canonical shape.

**Driver identity is cached in Redis under `driver:{investigation_id}`,
recomputed on every presence heartbeat, not recomputed per gated request.**
`core/presence.py`'s `PresenceTracker.heartbeat` now also accepts `role`
and carries `joined_at` forward across repeated heartbeats (read-before-write
of the previous record, same pattern already used for `is_new`/
`editing_changed` detection), computes `resolve_driver(snapshot)`
(`core/driver.py`, mirrors ADR-006's reference algorithm verbatim) after
building the active-participant snapshot, and writes the result to the
`driver:{investigation_id}` key with the same TTL as presence itself.
`require_driver` (`api/middleware/driver.py`) is therefore a single Redis
`GET` — no full `list_active` scan + `resolve_driver` recompute on every
driver-gated action. Presence heartbeats already happen every 4 seconds
(ADR-006) and already perform the full active-participant scan to build
the snapshot returned to the client, so computing the driver there is
marginal-free cost. Trade-off: driver-authorization staleness is bounded
by the same 8-second TTL window ADR-006 already accepts for driver-transfer
latency — no new staleness budget was introduced by this cache.

`api/presence.py` publishes a `driver_changed` event (same `{type, payload}`
envelope and channel as US-27/US-22's other presence events) whenever the
heartbeat's computed driver differs from the previously cached value.

**`require_driver` does not stack `require_project_role` on top.** Per
ADR-006 "Approval: Driver only," driver status alone is sufficient — driver
status already implies active project membership (presence heartbeats
require `get_project_member`), and `resolve_driver`'s solo-fallback branch
means a non-steering-eligible member (e.g. an Operator, alone in the
session) can legitimately be the driver. Adding a role floor on top would
contradict that fallback.

## Consequences

**Positive:**
- Audit trail survives Redis eviction/investigation-thread lifecycle
  independently — queryable via normal Postgres tooling.
- `require_driver` is cheap (one `GET`), safe to place on every future
  steering-gated endpoint (e.g. quorum-advance in a later story) without a
  new caching decision each time.
- No `WhyNode`/`OverallState` shape change beyond what ADR-013 already
  introduced (`status` field existed before this pair of stories; this pass
  only adds enforcement/filtering behavior around it).

**Negative:**
- Driver-authorization staleness is bounded by 8 seconds (same as presence
  itself) — a participant who just disconnected could theoretically still
  pass `require_driver` for up to that window. Accepted, matches ADR-006's
  own driver-transfer latency budget.
- `audit_log` rows are never automatically pruned — no retention policy
  defined this pass; deferred to a future story if audit-log volume becomes
  a concern.

## Alternatives Considered

**Audit log inside LangGraph/Redis-checkpointed state:** Rejected — ties
audit durability to Redis checkpoint retention, and would be a
`WhyNode`/`OverallState` shape change requiring the ask-first process
AGENTS.md flags for that specific state, for no benefit over a normal
Postgres table.

**`require_driver` recomputing `resolve_driver` fresh on every gated
request:** Rejected — an unnecessary `SCAN` + `MGET` per driver-gated
action when the presence heartbeat (already running every 4s) can compute
and cache the same result for free.

**Actually removing nodes from `why_nodes` on hard reset:** Rejected —
`_merge_why_nodes`'s union-by-id reducer makes this impossible without
either changing the reducer (a bigger, riskier `OverallState` semantics
change) or accepting that removed nodes silently reappear on the next
graph write; tombstoning via `status` avoids both problems and gives the
audit trail a durable, findable node instead of a lookup dead end.
