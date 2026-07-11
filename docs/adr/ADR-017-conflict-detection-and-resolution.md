# ADR-017 — Field Sync Conflict Detection and Resolution

**Status:** Accepted
**Date:** 2026-07-11
**Sprint:** SP06 (US-26, backend slice)
**Refs:** [E04 Project Collaboration](../agile/e04-project-collaboration.md), [ADR-006](ADR-006-project-collaboration.md), [ADR-015](ADR-015-audit-log-and-driver-cache.md), [ADR-016](ADR-016-quorum-and-advance-routes.md)

---

## Context

US-26's acceptance criteria require detecting a conflict when a synced
Gemba result targets a why-tree branch that has already been closed
elsewhere, notifying the driver, storing the conflict for audit, and
letting the driver resolve it (accept the existing conclusion, or reset the
branch). The story's own task list (T02) names `GembaSyncWorker` as the
detection trigger, but that worker is an Android `WorkManager` component —
it has no backend-side existence to hook into. Without picking a concrete
backend call site, `detect_conflict` (T01) would be a pure function with no
caller, and the resolve route (T03) would have nothing to act on.

## Decision

1. **Detection site: `FiveWhysAgent.submit_gemba`.** This is the one
   existing path that ever writes a `gemba_result` onto a `WhyNode`
   (`agent/five_whys_agent.py:101`) — live submissions and Android-synced
   offline submissions both flow through it. Before applying an incoming
   result, `submit_gemba` now calls `core.conflict.detect_conflict` against
   the node found via the existing `active_hypothesis` pointer. If the
   target branch is already closed (`gemba_result != "pending"`),
   `submit_gemba` returns `{"conflict": True, branch_path,
   existing_result, incoming_result, incoming_notes}` instead of mutating
   `why_nodes`. No new agent method or graph node was added — this keeps
   the check inside the one place the write already happens.

2. **Closed = non-pending, no value comparison.** `detect_conflict`
   (`core/conflict.py`) treats any branch whose `gemba_result` isn't
   `"pending"` as closed, and flags a conflict regardless of whether the
   incoming result matches the existing one. This matches the acceptance
   criterion literally ("Conflict detected when synced Gemba result's
   branch is already closed") rather than inferring an unstated
   same-value exception — a driver re-confirming a duplicate sync is still
   surfaced, and dropping that silently would hide double-submits.

3. **New `conflicts` table, not reuse of `audit_log`.** A flagged conflict
   has a resolution lifecycle (`flagged` → `resolved`) and a resolver
   identity that `audit_log` (append-only, one row per action) doesn't
   model. `models/conflict.py` follows `models/audit_log.py`'s existing
   pattern (project/investigation FK shape, `Enum` columns) but is its own
   table (`ConflictStatus`, `ConflictResolution`), migrated in
   `6c7de7589cb8_create_conflicts_table`.

4. **Persistence and pubsub live in the API layer, not the agent.**
   `api/gemba.py`'s route persists the `Conflict` row and publishes
   `conflict_flagged` after calling `agent.submit_gemba`; the agent method
   itself stays DB- and pubsub-agnostic beyond the `_run_and_publish`
   `node_update` events it already emits. This mirrors `tree_navigation.py`
   reset route, which writes its own `AuditLog` row outside the agent call.

5. **Resolve route is driver-gated, not role-gated.** `POST
   .../conflicts/{id}/resolve` (`api/conflicts.py`) uses `require_driver`,
   consistent with US-23/25/26's pattern that tree-state mutations (accept
   an existing conclusion vs. reset a branch) are steering decisions, not
   open to any project member. `action=reset` delegates to the existing
   `FiveWhysAgent.reset_tree`, reusing `soft_reset`/`hard_reset`
   (`agent/tree_navigation.py`) rather than adding new reset logic.

## Consequences

- Conflict detection only fires for results that flow through
  `submit_gemba`. If a future sync path writes `gemba_result` some other
  way, it must route through `submit_gemba` or duplicate the check.
- `conflict_flagged`/`conflict_resolved` are new SSE event types; web/
  Android UI (T04, `ConflictResolutionPanel`) is not built in this slice.
- `accept` resolution does not mutate the why-tree — it only marks the
  conflict row resolved. The incoming synced result is logged (via the
  stored `incoming_result`/`incoming_notes`) but discarded, per the AC's
  "log as note" language.

## Alternatives Considered

- **New dedicated `POST .../gemba/sync` endpoint**, separate from live
  `submit_gemba_result`. Rejected: doubles the surface area for what is
  functionally the same write, and offline-synced results carry no
  different shape than live ones once they reach the backend.
- **T02 skipped entirely** (treating `GembaSyncWorker` as pure
  Android-side, out of scope for this backend slice). Rejected on review —
  it would leave `detect_conflict` and the resolve route with no real
  caller, same gap ADR-016 flagged and closed for quorum.
