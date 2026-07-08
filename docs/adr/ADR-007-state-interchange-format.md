# ADR-007 — Investigation State Interchange Format

**Status:** Accepted  
**Date:** 2026-07-04  
**Refs:** [Product Brief](../product-brief.md), [ADR-002](ADR-002-redis-checkpointer.md), [ADR-003](ADR-003-inference-search-routing.md)

---

## Context

Rhizolve runs two graph execution engines:

- **Server:** LangGraph `StateGraph` in Python, checkpointed in Redis via `AsyncRedisSaver`
- **Android:** Koog graph in Kotlin, persisted in Room DB via `InvestigationDao`

The Android app operates in three modes (see ADR-003). When signal transitions between modes — specifically when a user moves from strong connectivity (Koog calling OpenRouter) to no connectivity (Koog calling Cactus) and back — the investigation continues on device. When the user returns to connectivity, the on-device investigation state must be handed back to the server so LangGraph can continue.

This creates a bidirectional state transfer requirement:

```
LangGraph (server) → Koog (Android)    when signal drops during server-run investigation
Koog (Android) → LangGraph (server)    when signal restores during device-run investigation
```

Without a canonical state format, either graph cannot resume an investigation started by the other.

---

## Decision

A canonical JSON investigation state schema is defined in `docs/schemas/investigation-state.json`. Both LangGraph (`OverallState`) and Koog (`FiveWhysState`) read and write this schema. A dedicated sync endpoint handles bidirectional transfer.

### Canonical Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "title": "RhizolveInvestigationState",
  "type": "object",
  "required": ["investigation_id", "project_id", "phenomenon", "domain",
               "system_or_process_context", "max_depth", "current_depth",
               "current_branch_path", "why_nodes", "pending_hypotheses"],
  "properties": {
    "investigation_id": { "type": "string" },
    "project_id": { "type": "string" },
    "phenomenon": { "type": "string" },
    "domain": { "type": "string" },
    "system_or_process_context": { "type": "string" },
    "max_depth": { "type": "integer", "minimum": 2, "maximum": 7 },
    "current_depth": { "type": "integer" },
    "current_branch_path": { "type": "string" },
    "domain_context": { "type": "string" },
    "why_nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "branch_path", "depth", "hypothesis",
                     "gemba_result", "gemba_notes", "is_root_cause", "countermeasure"],
        "properties": {
          "id": { "type": "string" },
          "branch_path": { "type": "string" },
          "depth": { "type": "integer" },
          "hypothesis": { "type": "string" },
          "gemba_result": { "enum": ["OK", "NOK", "ROOT_CAUSE", "pending"] },
          "gemba_notes": { "type": "string" },
          "is_root_cause": { "type": "boolean" },
          "countermeasure": { "type": "string" },
          "status": { "enum": ["active", "closed", "suspended", "deleted"] },
          "model_attribution": { "type": "string" },
          "attachments": { "type": "array" }
        }
      }
    },
    "pending_hypotheses": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["hypothesis", "branch_path", "depth", "gemba_instructions"],
        "properties": {
          "hypothesis": { "type": "string" },
          "branch_path": { "type": "string" },
          "depth": { "type": "integer" },
          "gemba_instructions": { "type": "string" },
          "domain_context": { "type": "string" }
        }
      }
    },
    "active_hypothesis": { "type": ["object", "null"] },
    "report_path": { "type": "string" },
    "maturity_level": { "type": "integer", "minimum": 1, "maximum": 5 },
    "transferred_from": { "enum": ["langgraph", "koog", null] },
    "transferred_at": { "type": ["string", "null"], "format": "date-time" }
  }
}
```

### Sync Endpoints

```python
# backend/api/routes/sync.py

@router.get("/projects/{project_id}/investigations/{investigation_id}/sync")
async def export_state(project_id: str, investigation_id: str,
                        member: ProjectMember = Depends(require_project_member),
                        agent: FiveWhysAgent = Depends(get_agent)) -> dict:
    """Export current LangGraph state as canonical JSON for Koog to consume."""
    config = {"configurable": {"thread_id": make_thread_id(project_id, investigation_id)}}
    snapshot = await agent.graph.aget_state(config)
    return serialize_to_canonical(snapshot.values)

@router.post("/projects/{project_id}/investigations/{investigation_id}/sync")
async def import_state(project_id: str, investigation_id: str,
                        body: CanonicalInvestigationState,
                        member: ProjectMember = Depends(require_project_member),
                        agent: FiveWhysAgent = Depends(get_agent)) -> dict:
    """Import Koog state into LangGraph checkpoint for server to resume."""
    config = {"configurable": {"thread_id": make_thread_id(project_id, investigation_id)}}
    langgraph_state = deserialize_from_canonical(body)
    await agent.graph.aupdate_state(config, langgraph_state)
    return {"status": "synced", "thread_id": make_thread_id(project_id, investigation_id)}
```

### Kotlin Serialiser

```kotlin
// mobile/android/sync/StateSerializer.kt
object StateSerializer {
    fun toJson(state: FiveWhysState): JsonObject =
        buildJsonObject {
            put("investigation_id", state.investigationId)
            put("project_id", state.projectId)
            put("phenomenon", state.phenomenon)
            put("domain", state.domain)
            put("system_or_process_context", state.systemOrProcessContext)
            put("max_depth", state.maxDepth)
            put("current_depth", state.currentDepth)
            put("current_branch_path", state.currentBranch)
            put("why_nodes", Json.encodeToJsonElement(state.whyNodes))
            put("pending_hypotheses", Json.encodeToJsonElement(state.pendingHypotheses))
            put("transferred_from", "koog")
            put("transferred_at", Clock.System.now().toString())
        }

    fun fromJson(json: JsonObject): FiveWhysState =
        FiveWhysState(
            investigationId = json["investigation_id"]!!.jsonPrimitive.content,
            projectId = json["project_id"]!!.jsonPrimitive.content,
            phenomenon = json["phenomenon"]!!.jsonPrimitive.content,
            domain = json["domain"]!!.jsonPrimitive.content,
            systemOrProcessContext = json["system_or_process_context"]!!.jsonPrimitive.content,
            maxDepth = json["max_depth"]!!.jsonPrimitive.int,
            currentDepth = json["current_depth"]!!.jsonPrimitive.int,
            currentBranch = json["current_branch_path"]!!.jsonPrimitive.content,
            whyNodes = Json.decodeFromJsonElement(json["why_nodes"]!!),
            pendingHypotheses = Json.decodeFromJsonElement(json["pending_hypotheses"]!!),
        )
}
```

### Pending Hypothesis Preservation

When LangGraph resumes from a Koog state, the `pending_hypotheses` queue is fully preserved. LangGraph does not regenerate hypotheses already in the queue. Fresh generation only occurs when the queue is empty at a new depth level.

---

## Consequences

**Positive:**
- Either graph can resume any investigation regardless of which started it
- No data loss on signal transition — investigation continues seamlessly
- Canonical schema is version-controlled and documentable for audit purposes
- `transferred_from` field provides provenance for every state transfer

**Negative:**
- Schema must be kept in sync between Python (`schemas.py`) and Kotlin (`StateSerializer.kt`) — a discipline requirement enforced by contract tests
- `aupdate_state` on LangGraph requires the full state to be valid — partial states from incomplete Koog investigations must be handled gracefully

**Contract tests:** A test in `backend/tests/test_state_interchange.py` and `mobile/android/androidTest/StateSerializerTest.kt` verify round-trip fidelity after every schema change. CI fails if either test fails.

---

## Alternatives Considered

**Separate state formats per graph:** Each graph manages its own format; sync endpoint translates on the fly. Rejected — translation logic becomes the source of truth, not the schema. Any translation bug silently corrupts investigation state.

**LangGraph checkpoint format directly on Android:** Serialise the Redis checkpoint format directly into Room. Rejected — LangGraph's internal checkpoint format is not a public API and changes without notice between versions.

**Restart investigation from scratch on reconnect:** Discard on-device state, regenerate hypotheses server-side on reconnect. Rejected — operators would lose their Gemba results and the investigation context built up during offline work. Explicitly unacceptable per product design.
