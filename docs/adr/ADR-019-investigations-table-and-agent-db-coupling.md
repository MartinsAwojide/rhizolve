# ADR-019 — Investigations Table and Agent/DB Coupling

**Status:** Accepted
**Date:** 2026-07-12
**Sprint:** SP07 (US-32, dashboard backend slice)
**Refs:** [E05 Web Client](../agile/e05-web-client.md), [ADR-007](ADR-007-state-interchange-format.md), [ADR-017](ADR-017-conflict-detection-and-resolution.md)

---

## Context

US-32's dashboard needs org-scoped metrics (active investigation count,
root causes found, average depth to cause, Gemba completion rate) and a
cross-project "needs attention" rail (conflicts, quorum-pending
investigations). None of this was computable as a plain SQL query:
investigation state lives only in markdown files
(`backend/investigations/*.md`) and Redis/LangGraph checkpoints
(`AsyncRedisSaver`, `core/memory.py`) — there is no Postgres row per
investigation, no investigation-ID registry, at all.

## Decision

1. **New `investigations` table** (`models/investigation.py`,
   `8530eb789802_create_investigations_table`): `id` (= investigation_id),
   `project_id` (FK), `status`, `interrupt_type`, `current_depth`,
   `root_cause_found`, `node_count`, `node_pending_count`,
   `awaiting_quorum`, timestamps. This is a derived cache of LangGraph
   state, not a new source of truth — the checkpointer remains
   authoritative; this table exists purely so dashboard queries don't have
   to walk Redis checkpoints or markdown files.

2. **Pinned formulas**, load-bearing for the dashboard's numbers:
   - `node_count = len(why_nodes)`; `node_pending_count = count(gemba_result == "pending")`
   - `root_cause_found = any(n.is_root_cause for n in why_nodes)`
   - "average depth to cause" = `AVG(current_depth) WHERE root_cause_found`
   - "Gemba completion rate" = `1 - SUM(node_pending_count)/SUM(node_count)`, org-wide
   - `awaiting_quorum = interrupt_type in {hypothesis_review, validator_review, countermeasure_review}`
     — this is "parked at a multi-party review interrupt," **not** a live
     `ReadyTracker`/`PresenceTracker` snapshot. An investigation can sit
     `awaiting_quorum=true` for days with nobody online; that's correct
     for a dashboard rail (it means "someone needs to act"), whereas a
     live-presence-only definition would make the rail almost always
     empty and reflect only the current instant.

3. **Sync centralizes in `FiveWhysAgent._status()`**
   (`agent/five_whys_agent.py`), not in each API route. The constructor
   gains an optional `db_sessionmaker: async_sessionmaker[AsyncSession] |
   None = None` (mirrors the existing optional `pubsub` parameter — stays
   optional so agent unit tests that construct `FiveWhysAgent(checkpointer)`
   with no DB access keep passing unmodified). `_status()` is already
   called at the end of every mutating method (`start_investigation`,
   `submit_gemba`, `submit_hypothesis_review`, `submit_validator_review`,
   `submit_countermeasure_review`, `reset_tree`) — when a
   `db_sessionmaker` is present, it upserts the `Investigation` row there,
   in one place, via a Postgres `ON CONFLICT (id) DO UPDATE`.

   **This explicitly amends ADR-017's "agent stays DB-agnostic"
   principle.** ADR-017 kept `Conflict` persistence in the API layer
   (`api/gemba.py`, `api/conflicts.py`) specifically so the agent wouldn't
   need a DB dependency. That worked for conflicts because there was
   exactly one write site. Investigation-row sync has 6+ call sites across
   distinct routes (`api/gemba.py`, `api/five_whys_advance.py`,
   `api/tree_navigation.py`, `api/investigations.py`) — duplicating the
   sync logic at each one risks drift (a new route added later forgetting
   to sync) far more than it risks coupling. The tradeoff was made
   deliberately: **one sync point, agent gains a DB dependency** was
   chosen over **zero agent DB dependency, 6+ duplicated sync sites**.

   `api/main.py`'s lifespan was reordered so `db_engine`/`db_sessionmaker`
   are constructed before `FiveWhysAgent`, so the sessionmaker can be
   passed into the constructor.

## Consequences

- Any new mutating agent method must call `_status()` (or equivalent) to
  stay in sync with the investigations table — this is now implicit
  behavior of the agent, not something each new route has to remember.
- The investigations table can drift from the checkpointer if `_status()`
  isn't called after a state mutation, or if a mutation happens through a
  path that bypasses the agent entirely (none currently exist).
- Dashboard queries are only as fresh as the last `_status()` call for
  each investigation — acceptable for an aggregate dashboard, not
  appropriate for anything requiring real-time consistency.

## Alternatives Considered

- **Sync at each of the 6+ API route call sites**, following ADR-017's
  precedent exactly. Rejected: duplication and drift risk outweigh the
  layering purity, given how many call sites exist here versus
  conflict-persistence's single site.
- **Defer real backend endpoints, ship UI only with MSW-mocked data.**
  Rejected by the user in favor of building the real data path now,
  since deferring doesn't remove the underlying gap, just postpones it.
- **Live presence-based `awaiting_quorum`** (reading `ReadyTracker`/
  `PresenceTracker` inside `_status()`). Rejected: makes the attention
  rail reflect only the current instant, likely empty most of the time —
  wrong shape for an async "what needs my attention" dashboard signal.
