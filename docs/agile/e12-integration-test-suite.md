# E12 — Integration Test Suite

**Epic statement:** Teams building on Rhizolve's external integrations need a validated test suite against open source equivalents so that consumer-side MCP integrations are confirmed working before production systems are connected.

**Sprint:** SP24  
**Refs:** [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Three separate sample companies, one per platform, with realistic seed data
- Nine investigation scenarios across three domains with pre-defined phenomena and Gemba responses
- Full pytest integration suite runs all 9 scenarios against hosted demo instances
- Customer-facing showcase PDF generated per scenario + combined `rhizolve_showcase.pdf`
- All outputs audit-mergeable (AI TL;DR, fault tree, HMAC-signed report)

---

## Sample Companies

| Platform | Company | Domain | Pre-loaded data |
|----------|---------|--------|-----------------|
| ERPNext | Steelmark Manufacturing | Manufacturing | 3 assets, 12 months maintenance history, 5 open quality inspections, 8 past work orders |
| Plane.so | NovaSoft Engineering | Software / IT | 2 projects, 25 issues across priorities, 3 completed cycles |
| Twenty.com | Meridian Consulting | Services | 1 company, 15 open issues, 6 months activity, 3 contacts |

---

## Nine Scenarios

| ID | Platform | Phenomenon |
|----|----------|------------|
| S1 | ERPNext | Press Line A stopping unexpectedly mid-shift |
| S2 | ERPNext | Welding station producing out-of-spec parts |
| S3 | ERPNext | Conveyor belt speed inconsistency |
| S4 | Plane.so | Checkout API p99 latency spike |
| S5 | Plane.so | Database connection pool exhaustion at peak |
| S6 | Plane.so | CI pipeline failure rate increase after dependency upgrade |
| S7 | Twenty.com | Client deliverable quality declining over 3 engagements |
| S8 | Twenty.com | Repeated missed deadlines on data analytics projects |
| S9 | Twenty.com | Stakeholder escalation on communication gaps |

---

## US-72 — Sample company seed data created per platform

**Acceptance criteria:**
- `run_all.sh` seeds all three companies in < 5 minutes
- `teardown.sh` deletes all seed data for clean re-runs
- Each company meets the data volume targets in the table above

**Tasks:**
- T01: Write `tests/integration/seeds/erpnext_seed.py` creating Steelmark data via Frappe REST API
- T02: Write `tests/integration/seeds/plane_seed.py` creating NovaSoft data via Plane.so REST API
- T03: Write `tests/integration/seeds/twenty_seed.py` creating Meridian data via Twenty.com REST API
- T04: Write `tests/integration/seeds/run_all.sh` and `teardown.sh`
- T05: Store hosted demo URLs and API keys in `.env.integration` (gitignored)

**Tests:**
```python
@pytest.mark.integration
async def test_erpnext_seed_creates_steelmark(erpnext_client):
    assets = await erpnext_client.get_assets(company="Steelmark Manufacturing")
    assert len(assets) >= 3
```

---

## US-73 — Nine investigation scenarios defined with pre-scripted Gemba responses

**Acceptance criteria:**
- Each scenario file defines: `PHENOMENON`, `DOMAIN`, `SYSTEM_CONTEXT`, `GEMBA_RESPONSES`, `EXPECTED_CONTEXT_SIGNALS`
- `ScenarioRunner` drives investigation to completion using pre-scripted responses
- External context from the platform observably influences the hypothesis list

**Tasks:**
- T01: Write `tests/integration/scenarios/` with one file per scenario (9 total)
- T02: Write `ScenarioRunner` base class automating the full investigation flow
- T03: Write `EXPECTED_CONTEXT_SIGNALS` per scenario matching fields from the platform data

---

## US-74 — Full integration test suite runs against hosted demo instances

**Acceptance criteria:**
- `pytest -m integration` runs all 9 scenarios against hosted demos
- Scenario passes: report PDF saved to `tests/integration/outputs/{scenario_id}/`
- Scenario fails: full stack trace captured, partial state saved
- Hosted demo unreachable: affected scenarios marked `SKIP` not `FAIL`
- Each scenario completes in < 120 seconds

**Tasks:**
- T01: Write `tests/integration/conftest.py` loading `.env.integration`, skipping if demos unreachable
- T02: Write `tests/integration/test_suite.py` parametrised across all 9 scenarios
- T03: Register `integration` marker in `pytest.ini`
- T04: Add `ci-integration.yml` GitHub Actions workflow (nightly schedule, not per push)

**Tests:**
```python
@pytest.mark.integration
@pytest.mark.parametrize("scenario_id,scenario", ALL_SCENARIOS.items())
async def test_scenario_end_to_end(scenario_id, scenario, agent, output_dir):
    runner = ScenarioRunner(scenario, agent)
    start = time.time()
    result = await runner.run()
    assert result.final_state["status"] == "complete", f"{scenario_id} did not complete"
    assert Path(result.report_path).exists()
    assert time.time() - start < 120
```

---

## US-75 — Customer-facing showcase PDF generated per scenario

**Acceptance criteria:**
- Showcase PDF per scenario: AI TL;DR, phenomenon context, external data used, fault tree, root cause, countermeasure, "How Rhizolve helped" narrative (100-word LLM-generated)
- Rhizolve branding; no raw JSON or stack traces
- Combined `rhizolve_showcase.pdf` with executive summary table and all 9 scenarios
- Showcase PDF < 5MB; combined PDF has ≥ 11 pages (cover + summary + 9 scenarios)
- All reports HMAC-signed and audit-mergeable

**Tasks:**
- T01: Write `backend/report/templates/showcase_report.html.j2` — customer-facing template distinct from audit template
- T02: Write `generate_showcase_report(scenario_result, output_path, llm)`
- T03: Write `generate_how_it_helped(scenario_result, llm)` — 100-word narrative
- T04: Write `tests/integration/showcase/build_showcase.py` combining all 9 PDFs + cover page using `pypdf`
- T05: Add showcase build step to `ci-integration.yml` (runs after all scenarios pass)

**Tests:**
```python
@pytest.mark.integration
async def test_showcase_pdf_under_5mb(s1_result, tmp_path, mock_llm):
    path = await generate_showcase_report(s1_result, str(tmp_path / "showcase.pdf"), mock_llm)
    assert Path(path).stat().st_size < 5 * 1024 * 1024

@pytest.mark.integration
async def test_combined_showcase_has_correct_page_count(all_results, tmp_path):
    build_showcase(all_results, str(tmp_path / "rhizolve_showcase.pdf"))
    with open(tmp_path / "rhizolve_showcase.pdf", "rb") as f:
        assert len(PdfReader(f).pages) >= 11
