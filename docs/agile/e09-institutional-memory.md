# E09 — Institutional Memory

**Epic statement:** Anyone starting a new investigation needs the system to surface relevant findings from past investigations before generating new hypotheses so that recurring failure patterns are recognised immediately and institutional knowledge compounds over time.

**Sprints:** SP19 (maturity + indexing), SP20 (RAG retrieval + import)  
**Refs:** [ADR-005](../adr/ADR-005-async-redis-store.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Maturity level (1–5) set at org; inherited by project; overridable at process level
- `why_generator` prompts tuned per maturity level (level 1 = poka-yoke focus, level 5 = systemic/statistical)
- Completed investigations indexed in `AsyncRedisStore` as background task
- `why_generator` searches past investigations before proposing hypotheses; same-maturity results boosted
- Past matches shown in hypothesis review panel with "Past finding" tag
- Cold start: structured form import (up to 50 entries per batch) and document upload (PDF/docx with LLM extraction)
- Automatic maturity detection from accumulated investigation patterns after every 5th investigation

---

## Spikes

**SP-16 — Embedding provider selection** *(run before SP-13 — cost projection depends on this)*  
Time-box: 2 days. See [ADR-005](../adr/ADR-005-async-redis-store.md#embedding-provider-sp-16--pending). Resolves: (1) whether OpenRouter exposes an embeddings endpoint, avoiding a second vendor alongside `text-embedding-3-small`; (2) accept/reject decision on Android on-device RAG via Liquid AI's `LFM2.5-Embedding-350M` — currently Android has zero institutional memory access when fully offline, and this spike decides whether that is fixed or formally accepted as a stated design limitation.

**SP-12 — AsyncRedisStore similarity threshold calibration**  
Time-box: 2 days. Blind evaluation on pilot investigation data. Three domain experts rate top-3 results for 10 queries. Threshold set to maximise precision at ≥ 2/3 relevant. Default 0.75 confirmed or adjusted.

**SP-13 — Embedding cost projection**  
Time-box: 0.5 day. At 100 investigations/month with average 5 root causes each, compute monthly cost using whichever provider SP-16 selects (not necessarily `text-embedding-3-small`). Done when: Cost accepted by product owner.

---

## US-60 — Maturity profile set at org and inherited to process level

**Acceptance criteria:**
- Org default: maturity level 2 (mandatory field — org is the root of the cascade, always has a concrete value)
- Project inherits from org when `Project.maturity_level is None`; Owner can override by setting an explicit int
- Process-level override (`OverallState.process_maturity_override`) takes highest precedence when not `None`
- Cascade resolves first non-`None` value in order: process → project → org
- `why_generator` prompt includes maturity-appropriate framing

**Tasks:**
- T01: Add `maturity_level: int = 2` (mandatory, default 2) to `Organisation`. Add `maturity_level: Optional[int] = None` to `Project` — `None` explicitly means "inherit from org," never a default int. Alembic migrations for both.
- T02: Write `resolve_maturity(org: Organisation, project: Project, process_override: Optional[int]) -> int`:
  ```python
  def resolve_maturity(org: Organisation, project: Project, process_override: Optional[int]) -> int:
      """Cascade: process override -> project override -> org default. First non-None wins."""
      if process_override is not None:
          return process_override
      if project.maturity_level is not None:
          return project.maturity_level
      return org.maturity_level
  ```
- T03: Write `MATURITY_FRAMING: dict[int, str]` in `prompts.py`
- T04: Update `why_prompts()` to include resolved maturity framing

**Tests:**
```python
def test_process_override_highest_precedence():
    assert resolve_maturity(Organisation(maturity_level=2), Project(maturity_level=4), 1) == 1

def test_project_override_used_when_no_process_override():
    assert resolve_maturity(Organisation(maturity_level=2), Project(maturity_level=4), None) == 4

def test_falls_back_to_org_when_project_and_process_both_none():
    """The gap case: project never touched maturity, process never touched maturity —
    must resolve to the org default, not error or default to some other value."""
    assert resolve_maturity(Organisation(maturity_level=3), Project(maturity_level=None), None) == 3

def test_explicit_project_value_of_zero_is_not_treated_as_unset():
    """Regression guard: falsy-but-not-None values must not be mistaken for 'inherit'.
    (maturity_level is 1-5 so 0 is invalid, but the check must be `is not None`,
    never a truthiness check, to avoid this class of bug entirely.)"""
    assert resolve_maturity(Organisation(maturity_level=2), Project(maturity_level=1), None) == 1

def test_level1_prompt_contains_poka_yoke():
    sys_msg, _ = why_prompts(domain="manufacturing", maturity_level=1, ...)
    assert "error-proofing" in sys_msg.lower() or "poka" in sys_msg.lower()
```

---

## US-61 — Completed investigations indexed in AsyncRedisStore

**Acceptance criteria:**
- Root cause nodes indexed as background task after report generation
- PRIVATE → project namespace only; TEAM → includes team namespace; ORG → includes org namespace
- Indexing does not block report generation response

**Tasks:**
- T01: Add `AsyncRedisStore` setup to `backend/core/memory.py` alongside existing checkpointer
- T02: Write `index_investigation(store, investigation_id, project, why_nodes, maturity_level)`
- T03: Schedule as `BackgroundTasks` task in report endpoint

---

## US-62 — Past investigations searched before hypothesis generation

**Acceptance criteria:**
- Similarity ≥ threshold: past matches appended to `domain_context` before `why_generator` runs
- Same maturity level: boosted score (×1.1), clamped to a maximum of 1.0
- No matches: proceeds without error
- Past matches returned in hypothesis review payload with "Past finding" tag

**Tasks:**
- T01: Write `search_past_investigations(store, phenomenon, domain, maturity_level, namespaces, limit, threshold)`
- T02: Call at start of `why_generator` node
- T03: Add `past_matches: list[PastMatch]` to `OverallState` and hypothesis review interrupt payload

**Tests:**
```python
@pytest.mark.asyncio
async def test_same_maturity_match_ranked_higher(mock_store):
    mock_store.asearch.return_value = [
        MockHit(score=0.80, value={"maturity_level": 3, "root_cause": "Complex"}),
        MockHit(score=0.78, value={"maturity_level": 2, "root_cause": "Simple"}),
    ]
    matches = await search_past_investigations(mock_store, "test", "manufacturing", maturity_level=2, namespaces=[...])
    assert matches[0].root_cause == "Simple"

@pytest.mark.asyncio
async def test_boosted_score_never_exceeds_one(mock_store):
    """A near-perfect match with the same-maturity boost applied must clamp at 1.0,
    not overflow to 1.045 — PastMatch.score is typed ge=0.0, le=1.0."""
    mock_store.asearch.return_value = [
        MockHit(score=0.98, value={"maturity_level": 2, "root_cause": "Near-perfect match"}),
    ]
    matches = await search_past_investigations(mock_store, "test", "manufacturing", maturity_level=2, namespaces=[...])
    assert matches[0].score <= 1.0
    assert matches[0].score == 1.0  # 0.98 * 1.1 = 1.078, clamped to 1.0
```

---

## US-63 — Cold start via structured investigation import

**Acceptance criteria:**
- Import form: phenomenon (required), domain (required), root cause (optional), countermeasure (optional), date (optional)
- Complete records indexed immediately; phenomenon-only records stored but not used for hypothesis seeding
- Batch: 1–50 entries; over 50 returns 422
- Summary: `{"indexed": n, "skipped": m}`

**Tasks:**
- T01: Write `POST /api/v1/projects/{pid}/memory/import/structured` with `InvestigationImport` Pydantic model
- T02: Write `index_imported_investigation(store, entry, project)`
- T03: Write React `StructuredImportForm` with dynamic add/remove row interface

---

## US-64 — Cold start via document upload and LLM extraction

**Acceptance criteria:**
- PDF or docx upload; LLM extracts phenomenon, root causes, countermeasures, domain, maturity signals
- Low-confidence fields highlighted for manual review
- User confirms extracted records before indexing
- Multiple investigations per document: all extracted, individually confirmable

**Tasks:**
- T01: `uv add pymupdf python-docx` in `backend/`
- T02: Write `backend/core/document_parser.py` with `extract_text(file_path) -> str`
- T03: Write `backend/core/investigation_extractor.py` with `extract_investigations(text, llm)` returning `ExtractionOutput`
- T04: Write `POST .../import/document` and `POST .../import/document/confirm`
- T05: Write React `DocumentImportReview` with confidence indicators and editable fields

---

## US-65 — Automatic maturity detection from investigation patterns

**Acceptance criteria:**
- After every 5th completed investigation in the same process context, maturity is computed
- Suggested maturity shown as notification to Owner
- Owner accepts → process maturity updated; declines → suggestion dismissed

**Tasks:**
- T01: Write `detect_maturity(why_nodes_history: list[list[WhyNode]]) -> int`
- T02: Trigger after 5th completion in same process context
- T03: Write React `MaturitySuggestionBanner`

**Tests:**
```python
def test_repeated_poka_yoke_signals_level_1():
    history = [[make_why_node(countermeasure=cm)] for cm in [
        "Add visual management", "Create SOP", "Install error-proofing",
        "Add checklist", "Colour-code bins"
    ]]
    assert detect_maturity(history) == 1
