# E08 — Reporting & Compliance

**Epic statement:** Quality managers, auditors, and investigation leads need investigation outputs that are structured, attributable, and tamper-evident so that findings are defensible in audits and corrective action processes.

**Sprints:** SP17 (TL;DR + fault tree + markdown), SP18 (PDF + 8D + audit trail)  
**Refs:** [Product Brief](../product-brief.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- AI-generated TL;DR (< 150 words) prepended to every report
- Server-side fault tree SVG generated from `why_nodes` with status-based node colours
- Markdown report enhanced with TL;DR, fault tree reference, steering log, model attribution
- WeasyPrint PDF with Jinja2 template: cover page, branding, fault tree, compliance sections, page numbers
- AIAG 8D export as separate on-demand PDF (manufacturing/automotive domains only)
- HMAC-SHA256 report signing with `GET .../report/verify` endpoint
- Append-only Postgres audit log with INSERT-only DB rule
- ZIP download of all available formats per investigation
- ISO standard(s) selected at project creation influence report sections

---

## Spike

**SP-11 — Audit log storage**  
Time-box: 1 day. Question: Redis Streams (append-only but ephemeral without AOF config) vs Postgres append-only table (stronger durability guarantee) for ISO 9001 compliance? Output: Decision documented; migration written. Done when: Append-only constraint enforced at DB level and verified by a test that fails on UPDATE.

---

## US-51 — ISO standards selected at project creation

**Tasks:**
- T01: Add `compliance_standards: list[str]` to `Project` model; Alembic migration
- T02: Write `ComplianceProfile` mapping each standard to required report sections
- T03: Multi-select compliance field in React project creation form

---

## US-52 — AI-generated TL;DR prepended to every report

**Acceptance criteria:** TL;DR ≤ 150 words covering phenomenon, root causes, countermeasures, duration. Inconclusive investigations state so with most likely candidates listed.

**Tasks:**
- T01: Write `backend/report/tldr.py` with `generate_tldr(state, llm)` using `TldrOutput` structured output
- T02: Call in `report_generator` node before building report
- T03: Prepend `## Summary (TL;DR)` section to markdown and PDF

**Tests:**
```python
@pytest.mark.asyncio
async def test_tldr_under_150_words(mock_llm, completed_state):
    tldr = await generate_tldr(completed_state, mock_llm)
    assert tldr.word_count <= 150
```

---

## US-53 — Server-side fault tree SVG from why_nodes

**Acceptance criteria:** Valid SVG for investigations up to 30 nodes; status-based markers reuse the **exact node-status vocabulary defined in `DESIGN.md`** (see E05 US-30's mapping table — solid/hollow fill, ruled-out marker, root-cause marker, conflict donut, dashed-suspended) rather than a separately invented colour scheme, so the static PDF fault-tree and the interactive xyflow why-tree read as the same visual language, not two different diagrams of the same data; embeds cleanly in WeasyPrint; both light and dark PDF variants use their respective mode's tokens from `DESIGN.md`. **The report fault tree is static and non-interactive (SP-00b decision)** — no pan/zoom, legend rendered inline beneath the tree; it is a print-oriented artifact, not the in-app `@xyflow/react` component. The in-app report view embeds this same static SVG, not the interactive tree.

**Tasks:**
- T01: `uv add svgwrite` in `backend/`
- T02: Write `backend/report/fault_tree.py` with `FaultTreeLayout` class using Reingold-Tilford-inspired layout
- T03: Write `_node_style(gemba_result, is_root_cause, status, has_conflict) -> NodeStyle`, reading colour and marker values from `DESIGN.md`'s front matter (via the same parser as `tests/design/test_token_parity.py`, not a hardcoded hex table) so a palette change in DESIGN.md propagates to the PDF without a code change

**Tests:**
```python
def test_svg_valid_for_3_node_tree():
    nodes = [make_why_node("1", 1, "NOK"), make_why_node("1.1", 2, "OK"), make_why_node("1.2", 2, "NOK")]
    svg = FaultTreeLayout(nodes).render_svg()
    assert svg.startswith("<svg")
    assert "1.1" in svg

def test_ok_node_uses_design_md_ruled_out_colour():
    """Colour comes from DESIGN.md's front matter, not a hardcoded hex value —
    a palette change must not require a code change here."""
    tokens = load_design_tokens()  # same loader as tests/design/test_token_parity.py
    nodes = [make_why_node("1", 1, "OK")]
    svg = FaultTreeLayout(nodes).render_svg()
    assert tokens["nodeStatus"]["ruledOut"]["light"] in svg
```

---

## US-54 — Markdown report enhanced with all required sections

**Tasks:**
- T01: Update `build_report()` to accept `tldr`, `steering_events`, `compliance_profile`, `fault_tree_svg_path`
- T02: Add `## Steering Decisions`, `## Compliance`, `## Fault Tree` sections
- T03: Add `model_attribution` per node in Why Tree section

---

## US-55 — PDF report generated eagerly at completion via WeasyPrint + Jinja2

**Timing (resolves an earlier ambiguity):** the PDF is generated once, inside `report_generator`, at the same point the markdown report is built — not lazily on the first `GET .../report?format=pdf` request. There is no low-latency requirement here (report generation is not on any user-facing critical path — the investigation has already reached `complete` status by this point), so there is no pressure to defer it. Generating both formats eagerly, in the same place, means: the `report_generated` audit event fires exactly once with both artifacts ready; `verify_report` always has a stable, already-written PDF to hash rather than a file that might not exist yet or might be regenerated slightly differently on a second request; and the GET endpoint becomes a simple "serve the stored file" read, not a generation trigger.

**Acceptance criteria:** PDF generated as part of `report_generator`'s execution, before the graph reports `status: complete` to the caller; cover page with Rhizolve branding + org logo; fault tree SVG embedded; page numbers; report hash in footer; ISO compliance sections included; `GET .../report?format=pdf` serves the already-generated file from GCS and never triggers generation itself.

**Tasks:**
- T01: `uv add weasyprint jinja2` in `backend/`
- T02: Write `backend/report/templates/report.html.j2` with full CSS print layout
- T03: Write `backend/report/pdf.py` with `generate_pdf(report_data, output_path)`; call this from within `report_generator` alongside the existing markdown build, not from the GET route handler
- T04: Write `GET .../report?format=markdown|pdf` as a read-only endpoint over the GCS-stored artifacts — it must not call `generate_pdf()` itself
- T05: Store PDF in GCS `rhizolve-reports/{org_id}/{project_id}/{investigation_id}.pdf` at generation time (inside `report_generator`), not at first-request time

**Tests:**
```python
@pytest.mark.asyncio
async def test_pdf_exists_in_storage_before_any_get_request(agent, mock_gcs):
    """Regression guard for the eager-vs-lazy ambiguity: the PDF must already be
    in storage as a side effect of the graph reaching completion, before any
    client has called GET .../report?format=pdf."""
    result = await run_investigation_to_completion(agent, "proj-001", "inv-001")
    assert result["status"] == "complete"
    assert mock_gcs.exists("rhizolve-reports/proj-001/inv-001.pdf")

@pytest.mark.asyncio
async def test_get_report_pdf_does_not_trigger_generation(authed_client, project_id, inv_id,
                                                            mock_generate_pdf, completed_state):
    """GET must be a pure read — calling it must not invoke generate_pdf()."""
    await authed_client.get(f"/api/v1/projects/{project_id}/investigations/{inv_id}/report?format=pdf")
    mock_generate_pdf.assert_not_called()

@pytest.mark.asyncio
async def test_pdf_generated_under_10_seconds(completed_state, tmp_path):
    import time; start = time.time()
    path = await generate_pdf(build_report_data(completed_state), str(tmp_path / "r.pdf"))
    assert time.time() - start < 10
    assert Path(path).stat().st_size > 0
```

---

## US-56 — AIAG 8D optional export for automotive domains

**Acceptance criteria:** D1, D2, D4, D5 populated from investigation data; D3, D6, D7, D8 left as fillable fields with "complete manually" note; button hidden for non-manufacturing/automotive domains.

**Tasks:**
- T01: Write `backend/report/templates/8d_report.html.j2`
- T02: Write `EightDMapper` with `map_d1()`, `map_d2()`, `map_d4()`, `map_d5()` from `OverallState`
- T03: Add `format=8d` to report endpoint
- T04: Update Product Brief §11: "AIAG 8D available as optional on-demand export"

---

## US-57 — HMAC-SHA256 report signing

**Acceptance criteria:** Footer contains SHA-256 hash and HMAC signature; `GET .../report/verify` returns `{"valid": true/false}`; absent signing key raises `KeyError` — never produces unsigned report.

**Tasks:**
- T01: Write `backend/core/signing.py` with `sign_report(id, content)` and `verify_report(id, content, hash, sig)`
- T02: Call in `report_generator`; embed in footer; store in `OverallState`
- T03: Write verify endpoint

**Tests:**
```python
def test_modified_content_fails_verification():
    h, sig = sign_report("inv-001", "Original")
    assert verify_report("inv-001", "Modified", h, sig) is False

def test_absent_key_raises():
    import monkeypatch
    with pytest.raises(KeyError):
        sign_report("inv-001", "content")  # REPORT_SIGNING_KEY not set
```

---

## US-58 — Append-only audit trail logs every investigation event

**Acceptance criteria:** Seven event types logged; Postgres `INSERT ONLY` rule prevents UPDATE/DELETE; `GET .../audit` returns full log (Owner + Manager only).

**Tasks:**
- T01: Write `AuditEvent` model; Alembic migration with `INSERT ONLY` Postgres rule
- T02: Write `append_audit_event(session, project_id, investigation_id, event_type, actor_id, payload)`
- T03: Call at all seven trigger points
- T04: Write `GET .../audit` endpoint

**Tests:**
```python
def test_audit_table_rejects_update(db_session):
    with pytest.raises(Exception):
        db_session.execute(text("UPDATE audit_events SET actor_id = 'tampered' WHERE id = 1"))
```

---

## US-59 — All formats downloadable separately and as ZIP

**Acceptance criteria:** Separate buttons per format; ZIP bundles all; 8D button hidden for non-manufacturing domains; files named consistently.

**Tasks:**
- T01: Write `build_zip(investigation_id, formats, paths)` using `zipfile`
- T02: Add `?format=zip` to report endpoint
- T03: Write React `ReportDownloadPanel` with per-format buttons and Download All
