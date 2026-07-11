# ADR-014 — SSE Streaming and Presence

**Status:** Accepted
**Date:** 2026-07-11
**Sprint:** SP16 (US-27, US-22, backend slice, built together)
**Refs:** [E04 Project Collaboration](../agile/e04-project-collaboration.md), [ADR-006](ADR-006-project-collaboration.md), [ADR-007](ADR-007-state-interchange-format.md), [ADR-013](ADR-013-gemba-attachment-storage.md)

---

## Context

US-27 needs investigation updates delivered live over SSE; US-22 needs presence
built on the same transport, since presence events (`user_joined`/`user_editing`)
are meant to ride the same connection as investigation state events. Building
both together — no separate transport makes sense for US-22 alone. Backend-only
this pass (React hook/components deferred, same split as US-21). Two things
didn't exist before this story: any pub/sub abstraction, and any
streaming-execution pattern for `FiveWhysAgent`'s LangGraph calls.

## Decision

**`graph.astream(stream_mode="updates")` replaces `graph.ainvoke(None, config)`**
at all 6 resumption call sites in `FiveWhysAgent` (`agent/five_whys_agent.py`),
including `start_investigation`'s initial run — converted for execution-model
consistency even though the AC set doesn't strictly require the very first run
to stream (the client hasn't opened the investigation screen yet when it's
created). State-equivalence holds because no node in `agent/graph.py` calls
`interrupt()` — all pausing is via compile-time `interrupt_before`/
`interrupt_after` in `FiveWhysAgent.__init__`'s `.compile(...)`. So
`stream_mode="updates"` chunks are uniformly `{node_name: partial_state}`, with
no `__interrupt__` special case, and a fully-drained astream loop stops at the
same point `ainvoke` would — proven both by inspection (no `interrupt()` calls
anywhere) and empirically (`tests/test_five_whys_agent_streaming.py` asserts
`_status()` output is identical to what the ainvoke-based test suite already
expects). The astream loop is never broken out of early — always drained to
exhaustion, matching `ainvoke`'s run-to-completion semantics.

**Pub/sub built on the existing `app.state.redis` client, not a new
connection.** New `core/pubsub.py`'s `RedisPubSub` wraps the raw
`redis.asyncio` client already instantiated in `api/main.py`'s `lifespan()`
(used today by `/health`) — no new `redis.from_url()` factory.
`core/memory.py`'s `AsyncRedisSaver`/`AsyncRedisStore` (LangGraph checkpointing)
are untouched and unrelated. `RedisPubSub.subscribe()` opens its own pooled
connection per subscription (`redis_client.pubsub()`), never blocking the
shared client other handlers use.

**SSE route includes `project_id`, gated by plain `get_project_member`.**
`GET /{project_id}/investigations/{investigation_id}/stream` — not the story's
literal `project_id`-less form — matches every other route's pattern for
resolving membership (no server-side investigation→project lookup exists
otherwise). Gated by `get_project_member` alone (any active member, internal
or external), same precedent as ADR-013's attachment GET route — no
`require_internal_scope`, since ADR-006 doesn't list `stream`/`presence` in
`EXTERNAL_PERMITTED_ACTIONS`/`EXTERNAL_DENIED_ACTIONS` at all, and the stream
is a read-only mirror of state external members can already reach via
existing GET endpoints.

**Presence via snapshot-on-heartbeat, not Redis keyspace notifications.**
`core/presence.py`'s `PresenceTracker` recomputes the active-member list on
every heartbeat rather than listening for `expired` keyspace events. Chosen
because: (a) `redis:8-alpine` in `tests/scripts/redis_test_up.sh` doesn't
enable keyspace notifications by default — testing it for real per AGENTS.md's
real-infra mandate would require global `CONFIG SET notify-keyspace-events Ex`
plus a cross-cutting listener on `__keyevent@0__:expired` shared with any
future TTL'd key elsewhere in the app; (b) Redis key expiry is lazy anyway, so
keyspace notifications don't give a harder real-time bound than
recompute-on-heartbeat; (c) recompute meets the AC's 8-second bound (2× the
4-second heartbeat, per ADR-006) directly — a departed user's key expires
within 8s, and the next heartbeat from any other still-connected participant
(≤4s later) sees the smaller set and broadcasts a `presence_snapshot`.
Keyspace notifications remain a deferred "precise push" alternative if
snapshot-on-heartbeat proves too chatty/laggy in practice.

**Editing-state changes publish immediately on heartbeat receipt, not
deferred to the next tick.** The 2-second editing-indicator-clear AC can't
ride the 4-second heartbeat cadence. `presence_heartbeat` compares the
incoming `editing` flag to the previously stored value and publishes
`user_editing` synchronously within that same request when it changes — the
client is expected to send an out-of-cycle heartbeat with `editing=false`
promptly on blur, not wait for the next scheduled tick. This is a
client-send-timing contract, not a separate short-lived TTL.
Crash-while-editing (no `editing=false` ever sent) is covered by the normal
8-second presence-key expiry, not a dedicated 2-second editing TTL.

**Single multiplexed channel/envelope for node-update and presence events.**
Channel: `stream:{project_id}:{investigation_id}`. Envelope:
`{"type": str, "payload": dict}` JSON. Types: `"node_update"`
(`{"node": str, "investigation_id": str}` — deliberately not the raw state
diff, to keep payloads small and avoid a second serialization format
alongside ADR-007's canonical `WhyNode` shape; clients refetch full state via
existing GET endpoints), `"user_joined"`, `"user_editing"`, `"presence_snapshot"`.
No dedicated `user_left` event — a client infers departure from a
`presence_snapshot` showing a smaller set than the previous one, keeping the
heartbeat handler simple.

**Endpoint disconnect handling.** The SSE handler polls
`request.is_disconnected()` on a fixed interval (1s) rather than only after
an event arrives — an idle stream with no traffic must still notice a client
disconnect and release its pub/sub connection. Implemented by keeping a
single pending `gen.__anext__()` task alive across poll timeouts (never
cancelling and recreating it), since cancelling a pending `__anext__()` on
every timeout unwinds the generator's `finally` block and tears down the
pub/sub subscription prematurely — discovered via `RuntimeError: async
generator raised StopAsyncIteration` when the naive
`asyncio.wait_for(gen.__anext__(), ...)` pattern was tried first.

## Consequences

**Positive:**
- Single execution model (`astream`) for all `FiveWhysAgent` graph resumptions,
  ready for future per-node UI progress without another refactor.
- No premature Redis feature dependency (keyspace notifications) or new
  connection-management surface.
- First real transport for live investigation updates — closes a gap that
  predates this story, matching the precedent ADR-013 set for the first REST
  gemba surface.

**Negative:**
- Pub/sub is fire-and-forget — no replay. A client that reconnects after a
  drop (browser `EventSource`'s native auto-reconnect, not built here) misses
  events published during the gap; correctness after reconnect relies on the
  client refetching current state via existing GET endpoints, not stream
  history. Accepted limitation, not built around.
- Single-Redis-instance assumption (same caveat as ADR-013's single-backend-
  instance note) — presence keys and pub/sub both live in one Redis, fine for
  the current deployment, revisit if that changes.
- A future story introducing real `interrupt()` calls inside a graph node
  (distinct from today's compile-time `interrupt_before`/`interrupt_after`)
  would need an `"__interrupt__"` branch in the publish loop — not needed now,
  flagged for forward compatibility.

**Test-infrastructure note (not a design decision, but load-bearing for
anyone extending these tests):** `httpx.ASGITransport` (used by this
project's `authed_client`/`async_client` fixtures) is not a true streaming
transport — it awaits the whole ASGI `app()` coroutine to completion,
buffering every `send()` into memory, before returning any `Response`. An
intentionally-infinite SSE generator can never let `app()` return, so
`client.stream()` against `.../stream` deadlocks regardless of how the
endpoint handles disconnects. `tests/test_stream_api.py`'s two body-consuming
tests call `stream_investigation()` directly and drive its
`StreamingResponse.body_iterator` by hand instead of going through httpx; the
403 test is unaffected since `get_project_member` raises during dependency
resolution, before any `StreamingResponse` exists.

## Alternatives Considered

**Redis keyspace notifications for presence:** Rejected for this pass — see
Decision section above; test-infra and lazy-expiry reasoning apply.

**WebSocket transport instead of SSE:** Rejected — the story (US-27's AC)
explicitly specifies SSE and browser `EventSource`.

**Publishing full state diffs instead of `{node, investigation_id}`:**
Rejected — keeps event payloads small, avoids introducing a second
serialization format that would need to stay in sync with ADR-007's canonical
`WhyNode` interchange shape; clients already have a GET endpoint to fetch full
state on demand.
