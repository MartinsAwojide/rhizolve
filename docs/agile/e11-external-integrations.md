# E11 — External MCP Integrations

**Epic statement:** Teams using existing quality management, issue tracking, or maintenance systems need Rhizolve to connect to those systems to pull context and push actions so that investigations are informed by existing data and corrective actions flow into existing workflows.

**Sprints:** SP22 (translation layer + Twenty.com), SP23 (Plane.so + ERPNext)  
**Refs:** [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Context translation layer converts raw external data to `ExternalContext` (rule-based first, LLM when needed)
- Freshness governance re-pulls context on depth change only if last pull was beyond threshold
- Twenty.com integration pulls customer and issue context (services/consulting domain)
- Plane.so integration pulls issues and creates tickets for countermeasures (software/IT domain)
- ERPNext integration pulls maintenance history and creates work orders (manufacturing/field domain)

---

## Spike

*("SP-##" below is a spike ID, unrelated to the "SP##" sprint numbers in `docs/build-plan/sprint-map.md` — see AGENTS.md.)*

**SP-15 — Open source MCP availability**  
Time-box: 2 days.  
Questions:
- Does Twenty.com have an existing MCP server or must we wrap its REST/GraphQL API?
- Does Plane.so's MCP server (confirmed earlier) work with Streamable HTTP transport?
- Does ERPNext have an MCP server or must we wrap Frappe REST API?

Output: Integration approach per system (existing MCP server / FastMCP wrapper / custom adapter). At least one tool from each system returning real data. Documented in `docs/integrations/`.

---

## US-67 — Context translation layer converts external data to investigation context

**As a** developer, **I want** a translation layer that converts raw external system data into structured investigation context, **so that** hypothesis generation is enriched regardless of source system format.

**Acceptance criteria:**
- Structured data: rule-based mapping extracts fields without LLM call
- Unstructured data: LLM summarisation extracts maturity signals, domain hints, magnitude signals
- Mixed: rule-based first; LLM only processes unresolved fields
- Source unavailable: returns partial context with `source_unavailable: True` — never blocks investigation

**Tasks:**
- T01: Write `ExternalContext` Pydantic model with `maturity_signals`, `past_issues`, `domain_hints`, `magnitude_signals`, `source_unavailable`, `confidence`
- T02: Write `RuleBasedMapper` base class with per-system field mappings
- T03: Write `LLMSummariser` invoked when `RuleBasedMapper` confidence < 0.7
- T04: Write `ContextTranslator.translate(raw_data, source_system)` orchestrating rule-based then LLM
- T05: Write `merge_external_contexts(contexts) -> str` combining multiple sources into one domain context string

**Tests:**
```python
@pytest.mark.asyncio
async def test_llm_not_called_for_structured_data(mock_llm, structured_plane_data):
    translator = ContextTranslator(RuleBasedMapper(), mock_llm)
    await translator.translate(structured_plane_data, "plane")
    mock_llm.summarise.assert_not_called()

@pytest.mark.asyncio
async def test_source_failure_returns_partial(mock_failing_client):
    context = await translator.translate({}, "erp_next")
    assert context.source_unavailable is True
```

---

## US-68 — Context freshness governs re-query on depth change

**Acceptance criteria:**
- Context pulled at investigation start; cached in `OverallState` with timestamp
- Depth increases + last pull within `freshness_threshold_days` (default 7): no re-pull
- Depth increases + last pull beyond threshold: silent re-pull; new context merged (not replaced)
- `freshness_threshold_days = 0` always re-pulls (test helper)

**Tasks:**
- T01: Add `external_context_cache: Optional[ExternalContextCache]` and `freshness_threshold_days: int = 7` to `OverallState`
- T02: Write `is_stale(cache, threshold_days) -> bool`
- T03: Update `why_generator` node to check freshness on depth > 1

**Tests:**
```python
def test_is_stale_beyond_threshold():
    cache = ExternalContextCache(pulled_at=datetime.utcnow() - timedelta(days=8), ...)
    assert is_stale(cache, threshold_days=7) is True

@pytest.mark.asyncio
async def test_no_repull_within_window(agent, mock_integrations):
    await run_to_depth_2(agent, "inv-001", freshness_threshold_days=7)
    assert mock_integrations.pull.call_count == 1
```

---

## US-69 — Twenty.com integration pulls customer and issue context

**Acceptance criteria:**
- Twenty.com connected to project → open issues, recent activity, company profile pulled at investigation start
- Translation extracts: maturity signals (recurring issues), domain hints (industry), magnitude signals (priority)
- Twenty.com unavailable → investigation starts without external context, warning logged

**Tasks:**
- T01: Write `backend/integrations/twenty/client.py` wrapping Twenty.com REST API (or MCP server per SP-15)
- T02: Write `TwentyRuleMapper` with field mappings: `issue.priority → magnitude_signals`, `issue.category → domain_hints`, `issue.recurrence_count → maturity_signals`
- T03: Add `twenty_company_id: Optional[str]` to `ProjectIntegrations` model and Alembic migration
- T04: Write `POST /api/v1/projects/{pid}/integrations/twenty` for Owner to configure

---

## US-70 — Plane.so integration pulls issues and creates countermeasure tickets

**Acceptance criteria:**
- Connected → Plane.so issues searched by phenomenon at investigation start
- Confirmed countermeasure → Plane.so issue created with label `rhizolve-rca`
- Plane.so unavailable → investigation continues without external context

**Tasks:**
- T01: Write `backend/integrations/plane/client.py` with `search_issues()` and `create_issue()`
- T02: Write `PlaneRuleMapper`: `issue.priority → magnitude_signals`, `issue.label_ids → domain_hints`
- T03: Call `create_issue()` in `countermeasure_generator` when Plane.so enabled
- T04: Add `plane_workspace_slug`, `plane_project_id` to `ProjectIntegrations`

**Tests:**
```python
@pytest.mark.asyncio
async def test_plane_ticket_created_on_countermeasure(mock_plane, agent, plane_project):
    await run_investigation_to_countermeasure(agent, plane_project.id, "inv-001")
    mock_plane.create_issue.assert_called_once()
```

---

## US-71 — ERPNext integration pulls maintenance history and creates work orders

**Acceptance criteria:**
- Connected → asset maintenance history and quality inspections pulled at start
- Reactive maintenance history signals maturity level 1–2
- Confirmed countermeasure → maintenance work order created in ERPNext
- ERPNext unavailable → investigation continues without context

**Tasks:**
- T01: Write `backend/integrations/erpnext/client.py` wrapping Frappe REST API with `get_maintenance_history()`, `get_quality_inspections()`, `create_work_order()`
- T02: Write `ERPNextRuleMapper`: `maintenance_type → maturity_signals`, `inspection.status → magnitude_signals`
- T03: Call `create_work_order()` in `countermeasure_generator` when ERPNext enabled
- T04: Add `erpnext_base_url`, `erpnext_asset_name` to `ProjectIntegrations`

**Tests:**
```python
def test_reactive_maintenance_signals_low_maturity(mock_erpnext):
    raw = [{"maintenance_type": "Reactive Maintenance"}] * 5
    context = ERPNextRuleMapper().map({"maintenance_records": raw})
    assert any("reactive" in s.lower() for s in context.maturity_signals)
