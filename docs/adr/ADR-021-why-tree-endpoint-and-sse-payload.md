# ADR-021 — Why-Tree Read Endpoint and SSE `node_update` Payload Enrichment

**Status:** Accepted
**Date:** 2026-07-12
**Sprint:** SP09 (US-35, why-tree xyflow graph)
**Refs:** [E05 Web Client](../agile/e05-web-client.md), [ADR-008](ADR-008-design-system-and-why-tree-library.md)

---

## Context

ADR-008 picked `@xyflow/react` + `d3-hierarchy` for the why-tree graph and
deferred the data-layer adapter work to US-35. Researching US-35's four
frontend-only tasks (T01-T04) found the data they assume doesn't exist:

- No REST endpoint returns the current `why_nodes` list. `FiveWhysAgent
  ._status()` reads `snapshot.values["why_nodes"]` internally
  (`backend/agent/five_whys_agent.py`) but never exposes it via a router.
- The SSE `node_update` event (`_run_and_publish`,
  `five_whys_agent.py:66-80`) carries only `{"node": graph_node_name,
  "investigation_id": ...}` — no node data. The AC "new nodes animate in
  within 3 seconds via SSE" isn't achievable without a payload change or a
  refetch-per-event fallback.

## Decision

1. **Add `GET /api/v1/projects/{project_id}/investigations/{investigation_id}/tree`**
   (`backend/api/why_tree.py`), returning the full current `why_nodes`
   snapshot plus a derived `conflict: bool` per node (joined against
   `Conflict` rows with `status=FLAGGED` on `branch_path`). Read-only,
   `Depends(get_project_member)` — same auth tier as the existing
   `stream.py` SSE endpoint.
2. **Enrich `node_update`'s payload with `updated_nodes`** when available,
   instead of leaving frontend clients to always refetch. LangGraph's
   `stream_mode="updates"` chunk is already `{graph_node_name:
   partial_state}` — if a node's partial state included a `why_nodes` key,
   that diff is attached to the published event as `updated_nodes`. No
   change needed in `backend/api/stream.py`, which forwards published JSON
   verbatim.
3. Frontend treats `updated_nodes` as the fast path (in-place upsert, no
   network round-trip) and falls back to refetching the new tree endpoint
   when a `node_update` event lacks it (e.g. a graph node that didn't
   touch `why_nodes`, or after an SSE reconnect where state may have
   drifted).

## Consequences

- The why-tree's source of truth for a full read is the LangGraph
  checkpoint (via `get_tree()`), not Postgres — consistent with how
  `_status()`/`_sync_investigation_row` already treat the checkpoint as
  authoritative and Postgres (`Investigation` row) as an aggregate mirror.
- `node_update` is no longer a fixed, minimal shape — consumers must treat
  `updated_nodes` as optional and handle its absence.
- New Pydantic schemas (`WhyNodeOut`, `AttachmentOut` in
  `backend/agent/schemas.py`) are introduced purely for this response —
  no existing schema mirrored the `WhyNode`/`Attachment` TypedDicts
  (`backend/agent/graph.py`) before this.

## Alternatives Considered

- **Poll-only, no SSE payload change.** Rejected: satisfying "within 3
  seconds" via polling alone means either an aggressive poll interval
  (wasteful) or accepting animation latency close to the interval; the
  SSE channel already exists and carries the data for free once the
  publish call is changed.
- **Always refetch the full tree on every `node_update`, never enrich the
  payload.** Rejected as the default path (kept only as the fallback) —
  every graph advance would cost a full round-trip even for a
  single-node change, and the partial `why_nodes` diff is already sitting
  in the `stream_mode="updates"` chunk at zero extra cost to compute.
- **Persist `why_nodes` into Postgres as first-class rows** (a `WhyNode`
  table) instead of reading the LangGraph checkpoint per request.
  Rejected: out of scope for this story, a bigger architectural change
  than the AC calls for, and `AGENTS.md`'s permissions gate schema
  changes to `WhyNode`/`OverallState` behind an explicit ask — no such
  change was requested here.
