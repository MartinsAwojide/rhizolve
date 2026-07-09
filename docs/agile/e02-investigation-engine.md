# E02 — Investigation Engine

**Epic statement:** Anyone investigating a problem needs an AI-assisted structured investigation workflow from observation to verified root cause so that the investigation is rigorous, evidence-based, and produces a defensible outcome.

**Sprints:** SP02 (chat + memory), SP03 (graph + steering)  
**Refs:** [ADR-005](../adr/ADR-005-async-redis-store.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Conversational agent routes Shallow questions to direct answers and Deep questions to the 5 Whys graph
- `/btw` opens an independent parallel thread without interrupting the investigation
- Cross-session memory persists, auto-compacts, and informs future conversations
- The LangGraph graph runs from intake to report with all nine nodes
- Four steering interrupt points let the user guide the investigation at every critical decision
- Context injection (`aupdate_state`) works at any investigation state
- Verbose/Quiet mode governs how the agent communicates parameter extraction

---

## Spike

**SP-02 — `interrupt_after` sequencing with conditional edges — DONE**  
Time-box: 1 day. Question: When `interrupt_after=["root_cause_validator"]` is set, does the graph pause after the node completes but before the conditional edge router runs? Output: Confirmed sequencing with a minimal test graph. Any workaround noted. Done when: 3-node test graph demonstrates correct pause-then-route behaviour.

**Finding:** the router runs in the same superstep as the interrupted node, before execution suspends. `interrupt_after=["b"]` on a graph `a -> b -(router)-> c|d` produces `snapshot.next == ("c",)` immediately after the pause — the router has already resolved and queued its target, it just hasn't executed yet. No workaround needed: `interrupt_before` on the *router's targets* (e.g. `interrupt_before=["gemba_dispatcher"]`, as US-11 T07 and US-12 T01 already specify) is the correct pattern for pausing before a routed node runs, not `interrupt_after` on the router's source. See `backend/tests/test_interrupt_sequencing.py`.

---

## SP02 Stories — Chat + Memory

### US-07 — Shallow mode answers questions directly without invoking the graph

**As a** user, **I want** to ask general questions and get direct answers, **so that** I can use Rhizolve as a knowledgeable assistant without triggering a full investigation.

**Acceptance criteria:**
- Shallow mode response arrives in < 3 seconds without graph invocation
- `/btw` prefix in any mode opens an independent thread; main thread state is unchanged after `/btw` thread closes
- Shallow mode in response to `/btw` in Deep mode behaves as a normal message — no separate thread

**Tasks:**
- T01: Write `backend/agent/conversation.py` with `ConversationalAgent` handling Shallow/Deep routing
- T02: Implement `/btw` prefix detection; create ephemeral parallel thread with separate `thread_id`
- T03: Write `POST /api/v1/chat` accepting `message`, `mode`, `thread_id`, `verbose`

**Tests:**
```python
@pytest.mark.asyncio
async def test_shallow_does_not_invoke_graph(async_client, mock_graph):
    r = await async_client.post("/api/v1/chat", json={"message": "What is 5 Whys?", "mode": "shallow"})
    assert r.status_code == 200
    mock_graph.ainvoke.assert_not_called()

@pytest.mark.asyncio
async def test_btw_creates_independent_thread(async_client):
    r = await async_client.post("/api/v1/chat", json={
        "message": "/btw what is FMEA?", "mode": "deep", "thread_id": "main-001"
    })
    assert r.json()["thread_id"] != "main-001"
```

---

### US-08 — Agent recognises investigation intent and confirms before starting

**As a** user, **I want** the agent to confirm before starting a deep investigation, **so that** I am always in control of when a full graph run begins.

**Acceptance criteria (mode-switch card, from SP-00b wireframe):**
- On detecting investigation intent, the agent renders an inline mode-switch card with a "switching to deep mode" pill, the extracted settings pre-filled (phenomenon, domain, system/process context, maturity + its inheritance source), and three actions: `Start investigation`, `Edit settings`, `Just answer instead`
- Verbose mode: the card is shown prominently and the agent waits for explicit confirmation before graph invocation
- **Quiet mode: the same card is shown but less prominent (collapsed/de-emphasised), not skipped entirely** (SP-00b decision) — the mode-pill flip plus the compact card is the signal; the user can still expand and edit before it proceeds
- **`Just answer instead` gives a shallow answer but leaves deep mode primed** (SP-00b decision) — the composer mode-pill stays on `deep`, so the user can escalate on their next message without re-triggering intent detection; it does not flip back to shallow
- The composer mode-pill is always manually overridable regardless of what intent detection decided
- User declining (`Just answer instead`) does not invoke the graph

**Tasks:**
- T01: Write `backend/agent/intent.py` with `classify_intent(message)` returning `shallow | deep`
- T02: Write the mode-switch card payload (extracted settings + three actions) returned to the client on `deep` intent; `ModeSwitchCard.tsx` renders it (E05)
- T03: Add a `prominence: "full" | "compact"` field to the card payload driven by the user's Verbose/Quiet preference — same card, two densities, never omitted
- T04: On `Just answer instead`, return a shallow response but keep the session's active mode at `deep` so the next message re-enters the deep path without re-detection
- T05: Wire `Start investigation` to graph invocation; `Just answer instead` to a shallow response with mode-pill held on deep

**Tests:**
```python
@pytest.mark.asyncio
async def test_quiet_mode_still_returns_card_compact(async_client, quiet_user):
    r = await async_client.post("/api/v1/chat", json={
        "message": "Trucks keep hitting the loading-bay walls, help me find out why",
        "mode": "deep", "verbosity": "quiet"})
    card = r.json()["mode_switch_card"]
    assert card is not None
    assert card["prominence"] == "compact"

@pytest.mark.asyncio
async def test_just_answer_keeps_deep_mode_primed(async_client):
    r = await async_client.post("/api/v1/chat", json={
        "message": "why do our trucks keep hitting walls", "mode": "deep",
        "action": "just_answer"})
    assert r.json()["graph_invoked"] is False
    assert r.json()["active_mode"] == "deep"  # primed, not flipped back to shallow
```

---

### US-09 — Agent extracts investigation parameters from conversation

**As a** user, **I want** the agent to extract phenomenon, domain, and system context from what I said, **so that** I do not repeat myself when setting up an investigation.

**Acceptance criteria:**
- Extracted parameters appear as pre-populated defaults in investigation settings panel
- Verbose: agent shows extraction, asks for confirmation or correction
- Quiet: agent skips the conversational confirmation prose but still surfaces the compact mode-switch card (see US-08) — "silent" means no chat back-and-forth, not no card
- Insufficient context: agent asks only for missing fields, not all fields

**Tasks:**
- T01: Write `backend/agent/extractor.py` with `extract_investigation_params(conversation_history)` using structured LLM output
- T02: Write `ExtractionOutput` Pydantic model: `phenomenon`, `domain`, `system_or_process_context`, `confidence` per field
- T03: Write partial extraction handler — ask only for fields with confidence < 0.7
- T04: Write `GET /api/v1/investigations/settings/defaults` returning extracted + static defaults

**Tests:**
```python
@pytest.mark.asyncio
async def test_extracts_phenomenon_from_conversation(mock_llm):
    history = [{"role": "user", "content": "Our glue tank keeps overflowing on line 3"}]
    params = await extract_investigation_params(history)
    assert params["confidence"]["phenomenon"] > 0.7
```

---

### US-10 — Cross-session memory persists and auto-compacts

**As a** user, **I want** the agent to remember my expertise, preferences, and past investigations across sessions, **so that** every new conversation benefits from our shared history.

**Acceptance criteria:**
- Memory loaded on conversation start; past investigation summaries available
- Compaction triggered automatically when token count exceeds 80% of context window
- `/btw` exchanges marked `ephemeral: True`; compacted at 2× normal rate
- Completed investigation adds summary to memory as a significant event

**Tasks:**
- T01: Write `backend/agent/memory.py` with `UserMemory` class using `AsyncRedisStore` at `("memory", user_id)`
- T02: Write `load_memory(user_id)`, `compact_memory(user_id, conversation_history, llm)`, `add_investigation_summary(user_id, investigation)`
- T03: Write compaction trigger logic checking token count before each agent call
- T04: Mark `/btw` exchanges with `ephemeral: True`

**Tests:**
```python
@pytest.mark.asyncio
async def test_compaction_triggered_at_threshold(mock_llm, user_id):
    long_history = [{"role": "user", "content": "x" * 500}] * 200
    await compact_memory(user_id, long_history, mock_llm)
    mock_llm.ainvoke.assert_called_once()
```

---

## SP03 Stories — Graph + Steering

### US-11 — LangGraph 5 Whys graph with full branching and Gemba checks

**As a** user, **I want** the full 5 Whys methodology running with branching hypothesis trees and Gemba verification, **so that** the investigation is rigorous and evidence-based.

**Acceptance criteria:**
- Graph runs from `intake` through all nine nodes to `report_generator`
- Multiple hypotheses at a depth level queued and dispatched sequentially
- NOK Gemba → goes deeper; OK Gemba → branch closes; max depth → routes to countermeasure
- Report generated as markdown to `investigations/{id}.md`

**Tasks:**
- T01: Build `StateGraph` in `backend/agent/graph.py` with all nine nodes
- T02: Implement `_why_router`, `_gemba_router`, `_validate_router`, `_check_complete_router`
- T03: Implement `_merge_why_nodes` reducer
- T04: Implement `why_generator` with Serper + Wikipedia tool binding
- T04a: Implement `gemba_dispatcher`'s real body — pop next `pending_hypothesis` into `active_hypothesis` + append a new pending `WhyNode`. Buildable immediately after T04; no other blockers. — DONE
- T04b: Build the `FiveWhysAgent` wrapper class, **partial**: `start_investigation` + `submit_gemba` only. Needs T04, T04a, and the SP-02 spike (done, see Spike section above). `submit_gemba` writes the Gemba result via `graph.aupdate_state(config, {"why_nodes": [...]}, as_node="gemba_check")`, riding the T03 merge reducer — `gemba_check` itself stays a no-op stub. Unlocks `test_graph_reaches_hypothesis_review_on_start`. — DONE. `FiveWhysAgent.__init__` compiles with `interrupt_before=["gemba_dispatcher", "gemba_check"]` (the only way to stop the graph from looping indefinitely through the stub nodes) — this preempts the `interrupt_before` half of T07's scope, so **T07 now only needs to add `interrupt_after=["root_cause_validator", "countermeasure_generator"]`** once T05/T06 land.
- T04c: Finish the `FiveWhysAgent` wrapper — `submit_validator_review`, `submit_countermeasure_review`, `inject_context`. Blocked on T05 (`root_cause_validator`, `countermeasure_generator`) and T06 (`report_generator`). Unlocks the remaining two given integration tests.
- T05: Implement `root_cause_validator` and `countermeasure_generator` with structured output — DONE. `root_cause_validator` syncs `current_depth`/`current_branch_path` to the just-validated `WhyNode` (no increment); the depth increment for drilling deeper moved into `why_generator` itself (`active_hypothesis["depth"] + 1`), correcting an off-by-one found while tracing T04's original plan (incrementing in `root_cause_validator` would have truncated the last legitimate depth level before `_validate_router`'s existing `>=` check ever saw it). **Hotfix** (found while starting T06): `root_cause_validator`, `countermeasure_generator`, and `FiveWhysAgent.submit_gemba` all unconditionally accessed `active_hypothesis` and crashed with `KeyError` whenever `why_generator` returns zero hypotheses on its very first call (a real, live-reachable path via `why_generator`'s `content or "[]"` fallback, and one that `_why_router`'s existing, unchanged routing to `root_cause_validator` on empty `pending_hypotheses` explicitly allows). Fixed by guarding all three with `.get("active_hypothesis")`/`None` checks, matching `_validate_router`'s existing defensive pattern. **Known follow-up, not yet fixed:** with the guard in place, a *persistently* empty `why_generator` (with `max_depth > 1`) now loops `why_generator ↔ root_cause_validator` with no interrupt on that cycle, risking `GraphRecursionError` in production — deciding what should happen when the model repeatedly generates zero hypotheses is a real product-robustness question, not addressed by this hotfix.
- T06: Implement `report_generator` writing markdown report — DONE. Introduces `INVESTIGATIONS_DIR` config (`backend/core/config.py`, defaults to `investigations`), a pure `_build_report_markdown()` helper (why-tree + root-cause section, no I/O — the seam E08 US-54 later extends with TL;DR/fault-tree/compliance sections), and a sync `pathlib.Path.write_text()` disk write (no new async-file dependency). `backend/investigations/` added to root `.gitignore`.
- T07: ~~Compile with `interrupt_before=["gemba_check", "gemba_dispatcher"]` and~~ `interrupt_after=["root_cause_validator", "countermeasure_generator"]` — the `interrupt_before` half was already done by T04b's `FiveWhysAgent.__init__` (see note there); T07 now only needs to add `interrupt_after` once T05/T06 land

**Tests:**
```python
@pytest.mark.asyncio
async def test_graph_reaches_hypothesis_review_on_start(agent):
    result = await agent.start_investigation(phenomenon="Glue overflowed", ...)
    assert result["status"] == "awaiting_gemba"
    assert result["interrupt_type"] == "hypothesis_review"

@pytest.mark.asyncio
async def test_nok_gemba_goes_deeper(agent):
    await run_to_gemba_check(agent, "inv-001")
    result = await agent.submit_gemba("inv-001", result="NOK", notes="Spring cracked")
    assert result["interrupt_type"] == "validator_review"

@pytest.mark.asyncio
async def test_max_depth_routes_to_countermeasure(agent):
    await run_to_validator_review(agent, "inv-001", depth=5, max_depth=5)
    result = await agent.submit_validator_review("inv-001", user_override_root_cause=False)
    assert result["interrupt_type"] == "countermeasure_review"
```

---

### US-12 — Four steering interrupt points with full override capability

**As a** user, **I want** to review, modify, and override AI decisions at four points, **so that** my domain knowledge takes precedence at every critical decision.

**Acceptance criteria:**
- Hypothesis review: user can remove, add, reorder hypotheses; trigger context-based regeneration
- Validator review: user can accept or override to root cause; provide custom probe direction
- Countermeasure review: user can accept, edit in place, or reject with feedback triggering regeneration
- User override of validator routes to countermeasure regardless of AI decision

**Tasks:**
- T01: Add `interrupt_before=["gemba_dispatcher"]`, `interrupt_after=["root_cause_validator", "countermeasure_generator"]`
- T02: Add `user_override_root_cause: Optional[bool]`, `user_probe_direction: Optional[str]` to `OverallState`
- T03: Add `countermeasure_edit: Optional[str]`, `countermeasure_feedback: Optional[str]` to `OverallState`
- T04: Update `_validate_router` to check `user_override_root_cause` before AI decision
- T05: Update `countermeasure_generator` to include `countermeasure_feedback` in prompt when set
- T06: Update `report_generator` to use `countermeasure_edit` if set

**Tests:**
```python
@pytest.mark.asyncio
async def test_validator_override_routes_to_countermeasure(agent):
    await run_to_validator_review(agent, "inv-001")
    result = await agent.submit_validator_review("inv-001", user_override_root_cause=True)
    assert result["interrupt_type"] == "countermeasure_review"

@pytest.mark.asyncio
async def test_countermeasure_rejection_reruns_generator(agent, mock_llm):
    await run_to_countermeasure_review(agent, "inv-001")
    await agent.submit_countermeasure_review("inv-001", accepted=False, feedback="Needs poka-yoke element")
    assert mock_llm.countermeasure_llm.ainvoke.call_count == 2
```

---

### US-13 — Context injection updates investigation at any point

**As a** user, **I want** to add information mid-investigation without restarting, **so that** new context immediately informs the next node.

**Acceptance criteria:**
- `POST /api/v1/projects/{pid}/investigations/{iid}/context` updates `domain_context` via `aupdate_state`
- Multiple injections appended chronologically with timestamps
- Verbose mode: agent acknowledges injection conversationally

**Tasks:**
- T01: Write `POST .../context` endpoint calling `graph.aupdate_state`
- T02: Append format: `[{timestamp}] User: {context}`
- T03: Write `inject_context` method on `FiveWhysAgent`

**Tests:**
```python
@pytest.mark.asyncio
async def test_injected_context_appears_in_state(agent):
    await agent.start_investigation(...)
    await agent.inject_context("proj-001:inv-001", "Pump replaced 3 days ago")
    snapshot = await agent.graph.aget_state({"configurable": {"thread_id": "proj-001:inv-001"}})
    assert "Pump replaced 3 days ago" in snapshot.values["domain_context"]
```

---

### US-14 — Investigation settings pre-populated from conversation

**As a** user, **I want** settings pre-populated from what I already said, **so that** setup requires minimal additional input.

**Acceptance criteria:**
- Extracted values shown as editable pre-populated fields in settings panel
- User edits override extracted values; extracted override static defaults
- Last used domain stored in user memory for next session

**Tasks:**
- T01: Write `InvestigationSettings` Pydantic model with `dynamic_defaults: dict` and `merge()` method
- T02: Write `GET /api/v1/investigations/settings/defaults` for current conversation
- T03: Store `last_used_domain` in `AsyncRedisStore` at `("memory", user_id, "preferences")`

**Tests:**
```python
def test_user_edit_overrides_extracted():
    s = InvestigationSettings(extracted={"domain": "manufacturing"}, user_overrides={"domain": "aerospace"})
    assert s.resolved["domain"] == "aerospace"

def test_extracted_overrides_static_default():
    s = InvestigationSettings(extracted={"domain": "manufacturing"}, user_overrides={}, static_defaults={"domain": "general"})
    assert s.resolved["domain"] == "manufacturing"
```
