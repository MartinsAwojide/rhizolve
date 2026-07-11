# ADR-016 — Quorum Gate and Steering-Advance Routes

**Status:** Accepted
**Date:** 2026-07-11
**Sprint:** SP16 (US-24, backend slice, scope expanded to include 3 previously-unwrapped advance routes)
**Refs:** [E04 Project Collaboration](../agile/e04-project-collaboration.md), [ADR-006](ADR-006-project-collaboration.md), [ADR-014](ADR-014-sse-streaming-and-presence.md), [ADR-015](ADR-015-audit-log-and-driver-cache.md)

---

## Context

US-24's own tasks are narrow: a ready-toggle endpoint and a pure
`check_quorum` function. But `require_quorum` needs a real consumer to be
worth building now rather than later, and no "advance past a steering
interrupt" REST route existed at all — `submit_validator_review`,
`submit_countermeasure_review`, `submit_hypothesis_review`
(`agent/five_whys_agent.py`) were only ever called from tests. ADR-015
explicitly flagged this gap ("safe to place [`require_driver`] on every
future steering-gated endpoint (e.g. quorum-advance in a later story)") —
this is that story. Scope was expanded, by decision, to also wrap those 3
methods in REST routes this pass, so `require_driver`+`require_quorum` gate
something real immediately rather than sitting unused.

## Decision

**Ready state lives in a separate no-TTL Redis key namespace
(`ready:{investigation_id}:{user_id}`), not folded into `PresenceTracker`.**
Presence keys are TTL'd, ephemeral, and refreshed on a heartbeat cadence;
ready state is a durable-until-explicitly-toggled boolean with a different
lifecycle. Bundling both into `PresenceTracker` would conflate two
different semantics. `core/ready.py`'s `ReadyTracker` is a small standalone
class, mirroring the one-focused-tracker-per-concern pattern already
established by `PresenceTracker`/`RedisPubSub`. Staleness (a ready user who
disconnected) is handled entirely by `check_quorum` intersecting
`ready_user_ids` with `PresenceTracker.list_active()`'s current active set
at read time — not by giving the ready key its own TTL, which would just
duplicate the presence TTL's race window for no benefit.

**Majority threshold: `ready_count > steering_eligible_count / 2`,** applied
only to Owner/Analyst/Contributor (`core/driver.py`'s existing
`STEERING_ROLES`, reused rather than redefined). Two edge cases resolve the
AC's "solo investigator is always at quorum": `len(active) <= 1` returns
`True` unconditionally (covers a lone participant regardless of role), and
zero steering-eligible active participants also returns `True` (nothing to
gate on — a session with only Operators/Managers/Viewers present can't be
permanently blocked waiting for a role that never shows up).

**`require_quorum` is a separate dependency from `require_driver`, not
merged, chained in that order.** `api/middleware/quorum.py`'s
`require_quorum` mirrors `require_driver`'s shape exactly
(`api/middleware/driver.py`) — same `get_project_member` sub-dependency,
same `request.app.state.X` access pattern. Kept separate because they test
different things (identity vs. team consensus) and a caller should be able
to tell which check failed: `require_driver` runs first on every gated
route, so a non-driver gets "Only the current driver may perform this
action" rather than a quorum-shaped message; `require_quorum` runs second,
giving "Quorum not reached" only once driver status is already confirmed.
FastAPI caches `get_project_member` per request regardless of how many
dependencies request it, so chaining both costs one extra Redis round-trip
(`list_active` + `get_ready_ids`), not a duplicated membership query.

**The 3 new advance routes (`hypothesis-review`, `validator-review`,
`countermeasure-review` under `api/five_whys_advance.py`) get both gates;
`submit_gemba` (`api/gemba.py`) does not.** ADR-006's
`EXTERNAL_PERMITTED_ACTIONS` already lists gemba submission as available to
external Operator/Contributor by design — it's field evidence capture, not
a steering decision. Hypothesis/validator/countermeasure review are the
literal "driver advances past a steering interrupt" actions the epic
describes; requiring both driver authority and team quorum on exactly
those three routes, and no others, follows directly from that distinction.
None of the three routes needed an explicit pubsub publish call: all three
`FiveWhysAgent` methods already end with `_run_and_publish`, which emits
`node_update` events per graph node advanced (see ADR-014) — the routes
just surface the agent methods' existing behavior over HTTP.

**`quorum_reached`/`quorum_lost` publish only on a before/after state
transition,** computed by calling `check_quorum` twice around the toggle in
`api/quorum.py`'s `toggle_ready` — mirrors `driver_changed`'s
before/after-compare pattern in `core/presence.py` (ADR-015). A toggle that
doesn't cross the threshold (e.g. a 4th non-steering member readying, or
readying when already at quorum) produces no event.

## Consequences

**Positive:**
- `require_driver`+`require_quorum` now have 3 real callers, proving the
  composition works rather than sitting speculative.
- Ready-state's no-TTL design keeps `check_quorum` simple — no time-based
  edge cases inside the quorum function itself, all staleness handling
  lives in one place (`list_active` intersection).
- Solo/zero-steering-eligible edge cases are handled explicitly and
  tested, rather than left to fall out of the majority formula by accident.

**Negative:**
- A `ready:*` key never expires on its own if a user readies then
  disconnects without un-readying — harmless for `check_quorum` (filtered
  by the active-list intersection) but means stale ready keys accumulate
  in Redis for departed users across the lifetime of an investigation. No
  cleanup job exists this pass; acceptable since the keys are small and
  the intersection makes them functionally inert once the user leaves.
- The 3 new advance routes don't validate that the caller is calling the
  *correct* one for the investigation's current interrupt type (e.g.
  nothing stops a request to `/validator-review` when the investigation is
  actually paused at `hypothesis_review`) — the underlying
  `FiveWhysAgent` methods already no-op safely in that case (matching
  existing behavior for `submit_gemba`/`reset_tree`), so this is consistent
  with the rest of the surface, not a new gap introduced here.

## Alternatives Considered

**Folding ready-state into `PresenceTracker`:** Rejected — see Decision
section; different key lifecycle (no TTL vs. TTL'd), would conflate two
concerns into one class.

**TTL on ready keys matching presence's 8s:** Rejected — redundant with
the active-list intersection `check_quorum` already performs; would also
require re-arming the ready TTL on some cadence unrelated to the user's
actual readiness action, adding complexity for no correctness gain.

**Merging `require_quorum` into `require_driver` as one combined
dependency:** Rejected — loses the ability to distinguish "you're not the
driver" from "the team isn't ready yet" in the 403 response, which matters
for a UI trying to explain why an action is blocked.

**Deferring the 3 advance routes to a future story, leaving
`require_quorum` unused this pass:** Rejected per the scope-expansion
decision — an untested, uncalled dependency is worse than the larger diff
of wrapping the 3 methods now, especially since `_run_and_publish` already
does the SSE-publishing work; the routes are thin wrappers.
