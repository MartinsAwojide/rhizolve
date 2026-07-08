# E05 — Web Client

**Epic statement:** Desk-based analysts, managers, and investigators need a browser-based interface surfacing the full investigation workflow so that they can lead and monitor investigations without installing anything.

**Sprints:** SP00 (design — precedes all other work, including E01), SP07 (layout + auth), SP08 (investigation setup), SP09 (full flow), SP10 (deployment)  
**Refs:** [ADR-001](../adr/ADR-001-fastapi-gradio-server.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Three-column layout (sidebar / chat / investigation panel) renders correctly across breakpoints
- Chat renders shallow responses and structured interactive cards per interrupt type
- Subtle mode indicator shows current Shallow/Deep routing; user can override
- Why tree renders as an interactive xyflow graph; clicking a node scrolls chat to that message
- Presence bar shows active participants, driver, and editing indicators
- `/btw` opens independent parallel chat thread without interrupting the investigation
- App deployed to HF Spaces for internal pilot

---

## Spikes

**SP-00a — Design system selection**  
Time-box: 1 day. **RESOLVED:** component system = **shadcn/ui** (unified `radix-ui` package, New York style — full React 19 + Tailwind v4 support confirmed, owns component source in-repo, ships MCP server + agent skills aligning with E10/Claude Code). Why-tree = **`@xyflow/react` + `d3-hierarchy`**. Dagre rejected (unmaintained per xyflow maintainer; its expand/collapse example is Pro-licensed). elkjs rejected (overkill for a strict single-root tree). Ant Design rejected (theming fights custom AA-tuned tokens). Documented in ADR-008 and DESIGN.md.

**SP-00b — UX research and wireframing**  
Time-box: 2 days. Review getdesign.md and VoltAgent/awesome-design-md (300+ curated DESIGN.md files extracted from real products) for a starting visual direction, rather than researching from a blank page. Synthesise across three references chosen for fit, not aesthetic preference alone: **Miro** (canvas/node/branch visual language — the closest existing analogue to the why-tree, Rhizolve's single most differentiating surface), **Linear** (minimal precision, restrained accent, professional software feel across desk personas), **Together AI / ClickHouse** (technical blueprint aesthetic, data-dense, reinforces the evidentiary/audit-ready character of an investigation tool). Produce low-fidelity wireframes for all key screens (web + Android) grounded in that synthesis. Document in DESIGN.md.

---

## SP00 Stories — Design (Sprint Zero, precedes E01)

DESIGN.md is the first artifact of the project — before the monorepo exists, before a single line of application code is written. Every other epic's UI work (E05, E06) depends on a settled visual language, and retrofitting design decisions after components are built is more expensive than deciding them first.

**DESIGN.md is a real, current open format, not a bespoke internal doc.** Introduced by Google Stitch, specified at `google-labs-code/design.md` (npm: `@google/design.md`), the file combines YAML front matter (machine-readable tokens: colours, typography scale, spacing, radii) with markdown prose (the rationale for those choices — why an agent should follow them, not just what they are). This is the format any current AI coding agent — Claude, Cursor, Copilot, Stitch — already reads natively, and it ships a CLI for structural validation and token-diff regression detection between versions (note: the v0.3.0 CLI does not perform WCAG contrast checking — that is done in our own token-parity test). Rhizolve's DESIGN.md follows this spec exactly rather than inventing a parallel token format, so the file is immediately toolable and portable rather than a one-off convention only this project understands.

**Model assignment:** SP00 is content-generation and design-judgment work, not implementation — it uses **Opus** for design reasoning and system selection (the SP-00a/SP-00b spike decisions, including the Miro/Linear/Together AI synthesis), and **Fable** for generating the actual visual assets (SVG icon sets, illustrations, brand marks) once the direction is set. This is distinct from every other sprint in the project, which uses Sonnet for implementation per the team's standing model-assignment preference.

### US-30 — Design system selected and DESIGN.md created following the Google Stitch spec

**As a** developer, **I want** a single source of truth for visual decisions shared between web and Android, decided before any implementation begins, **so that** both platforms build against a unified design language from their first commit rather than retrofitting one later.

**Acceptance criteria:**
- Design system selected and documented before `backend/` or `frontend/web/` exist (i.e. before SP01)
- `DESIGN.md` conforms to the `google-labs-code/design.md` spec: YAML front matter for tokens (colours, typography scale, spacing, radii), markdown prose for rationale
- `npx @google/design.md lint DESIGN.md` passes with zero errors. Separately, every colour token pairing meets WCAG **AA** (4.5:1 normal, 3:1 large), verified programmatically in the token-parity test — the linter itself does not check contrast in v0.3.0. Do not select a palette in T01/T02 before confirming it clears AA in both modes independently.
- Every colour token has both a **light-mode and dark-mode value** defined in the front matter, and **the two are independently designed, not one inverted from the other** — dark mode is not "light mode with colours flipped." Where a reference's accent relationship (e.g. orange-on-navy) doesn't hold up under naive inversion, the light-mode counterpart gets its own accent decision, justified in the prose section, not derived mechanically.
- Visual direction is a stated synthesis of four references, each contributing to a different part of the product rather than being blended into one generic look: **Miro** (canvas/branch visual language, general app chrome), **Linear** (precision, restraint, general app chrome), **Together AI/ClickHouse** (technical blueprint aesthetic, general app chrome), and **Search Party** (node-status iconography — hollow/solid fill, ruled-out marker, size-for-hierarchy — specifically for the why-tree and fault-tree, where its dark-navy/orange, right-angle-connector language is a closer literal match to `WhyNode` status semantics than any of the other three)
- The why-tree node vocabulary is defined once in DESIGN.md and maps directly onto `WhyNode` fields — see the mapping table in T03 below — and this same vocabulary is reused by the server-side fault-tree SVG generator (E08 US-53), not redefined separately for each renderer
- Brand assets created as SVG (scalable; consistent with the ADR pattern of server-side SVG generation used elsewhere in the project) plus any raster exports needed for app store / favicon requirements
- UX flows sketched for all key screens (web and Android) before either codebase begins, each showing both light and dark mode
- Why tree library = `@xyflow/react` + `d3-hierarchy` (resolved in SP-00a; see ADR-008). A 5 Whys tree is strictly single-root/single-parent, which is exactly d3-hierarchy's purpose; its orthogonal link generator reproduces the Search Party right-angle connector style natively
- A cross-platform token contract check exists and passes (see US-30a) — "unified design language" is a verified fact, not an assertion, and covers both modes

**Node-status vocabulary (from Search Party, mapped onto `WhyNode`):**

| Visual | `WhyNode` field | Meaning |
|--------|----------------|---------|
| Solid filled circle | `status: active`, `gemba_result: pending` | Hypothesis awaiting or mid-verification |
| Hollow circle | `status: closed`, `gemba_result: OK` | Ruled out |
| Red-X marker | `gemba_result: OK` (alternate/emphatic treatment) | Ruled out, drawing explicit attention |
| Green-plus marker | `is_root_cause: True` | Confirmed root cause |
| Split-colour donut | conflict flag present (E04 US-26) | Field-sync conflict awaiting driver review |
| Node size | `depth` or confirmed-root-cause emphasis | Hierarchy / importance signal |
| Dashed/greyed treatment | `status: suspended` | Soft-reset suspended branch (E04 US-25) |

**Tasks:**
- T01: Fetch the actual Miro, Linear, and Together AI/ClickHouse `DESIGN.md` files from `VoltAgent/awesome-design-md` as concrete starting points; use the already-captured Search Party still frame as the fourth reference for node iconography specifically — run SP-00a and SP-00b spikes using Opus for the comparative reasoning
- T02: Before committing to a palette, check candidate accent/surface pairings against AA contrast independently in light and dark mode — do not test one and assume the other passes by inversion. Node-status colours (coral/green/blue/amber from Search Party) are checked against both surface colours independently since they're semantic, not decorative, and must stay legible in both modes
- T03: Finalise the node-status vocabulary table above in DESIGN.md's prose section, then generate brand assets (logo, iconography, illustrations, and the node-status marker set) as SVG using Fable, based on the direction settled in T01–T02 — request both light and dark variants where the asset is mode-sensitive
- T04: Write `DESIGN.md` at the repo root (spec convention — not buried in `docs/`) with YAML front matter for tokens (each colour token carrying both `light` and `dark` values, independently specified) and markdown prose for rationale, per `google-labs-code/design.md`
- T05: Run `npx @google/design.md lint DESIGN.md` until zero errors; separately run the token-parity contrast check until every pairing clears AA in both modes
- T06: Write UX flow wireframes for all key screens per SP-00b findings, each wireframe shown in both modes
- T07: Store brand assets in a platform-neutral location (`docs/brand/`) that both `frontend/web/public/brand/` and `mobile/android/app/src/main/res/` copy from at their respective setup sprints (SP07 for web, SP12 for Android) — `DESIGN.md` is the source of truth, not either app's asset folder

### US-30a — Cross-platform token parity is verified against DESIGN.md's front matter

**As a** developer, **I want** an automated check proving Android's Material 3 tokens and web's Tailwind config both match the YAML front matter in `DESIGN.md`, **so that** "unified design language" stays true as each platform is built independently in different sprints (SP07 for web, SP13 for Android), instead of silently drifting.

**Acceptance criteria:**
- `DESIGN.md`'s YAML front matter is the single source of token truth — no separate `design-tokens.json` is maintained in parallel, since the spec's front matter already is that machine-readable format
- `npx @google/design.md diff DESIGN.md <previous-version>` reports zero unintended regressions whenever the file is edited — this is the spec's built-in mechanism for catching accidental token drift, used instead of a bespoke diff script
- A contract test parses `DESIGN.md`'s front matter directly (not a duplicate JSON export) and asserts Tailwind config and Android's `colors.xml`/`theme.xml` match it
- This test exists from the moment both platforms have a theme file — it cannot be deferred to a later "polish" sprint
- CI skips (does not fail) the Android half of the test until SP13's theme file exists, and skips the web half until SP07's Tailwind config exists

**Tasks:**
- T01: Add `npx @google/design.md lint DESIGN.md` as a CI check that runs on every PR touching `DESIGN.md`, `frontend/web/tailwind.config.ts`, or Android theme/colour resource files
- T02: Write `tests/design/test_token_parity.py` that parses `DESIGN.md`'s YAML front matter directly using a standard YAML front-matter parser, extracts the same keys from `frontend/web/tailwind.config.ts` and `mobile/android/app/src/main/res/values/colors.xml` / `theme.xml`, and asserts equality
- T03: Add this contract test to both the frontend CI job and `ci-android.yml`
- T04: Document in `DESIGN.md`'s prose section that the front matter is edited first, and either platform's theme file is regenerated or manually updated to match — never the reverse

**Tests:**
```python
# tests/design/test_token_parity.py
import frontmatter  # python-frontmatter — parses YAML front matter directly from DESIGN.md

def load_design_tokens():
    post = frontmatter.load("DESIGN.md")
    return post.metadata  # the YAML front matter, as a dict — no separate JSON file

def test_web_primary_color_matches_design_md_both_modes():
    """Every colour token carries {light, dark} — a flat value here is itself
    a bug, not just a mismatch, since dual-mode is required from SP00."""
    tokens = load_design_tokens()
    tailwind_config = parse_tailwind_config("frontend/web/tailwind.config.ts")
    assert tailwind_config["colors"]["primary"]["light"] == tokens["colors"]["primary"]["light"]
    assert tailwind_config["colors"]["primary"]["dark"] == tokens["colors"]["primary"]["dark"]

def test_android_primary_color_matches_design_md_both_modes():
    tokens = load_design_tokens()
    android_colors = parse_android_colors_xml("mobile/android/app/src/main/res/values/colors.xml")
    android_colors_dark = parse_android_colors_xml("mobile/android/app/src/main/res/values-night/colors.xml")
    assert android_colors["color_primary"] == tokens["colors"]["primary"]["light"]
    assert android_colors_dark["color_primary"] == tokens["colors"]["primary"]["dark"]

def test_typography_scale_matches_across_platforms():
    tokens = load_design_tokens()
    tailwind_config = parse_tailwind_config("frontend/web/tailwind.config.ts")
    android_theme = parse_android_theme_xml("mobile/android/app/src/main/res/values/theme.xml")
    for scale_key, expected in tokens["typography"].items():
        assert tailwind_config["fontSize"][scale_key] == expected["fontSize"]
        assert android_theme["text_appearance"][scale_key]["size"] == expected["fontSize"]

def test_every_color_token_has_both_modes_defined():
    """Structural check on DESIGN.md itself, independent of either platform —
    catches a token added with only one mode before it ever reaches Tailwind
    or Android theme files."""
    tokens = load_design_tokens()
    for name, value in tokens["colors"].items():
        assert "light" in value and "dark" in value, f"color.{name} missing a mode"
```

This test cannot run meaningfully until both `frontend/web/tailwind.config.ts` (created SP07) and `mobile/android/app/src/main/res/values/theme.xml` + `values-night/` (created SP13) exist — it is written in SP00 as a contract stub against `DESIGN.md`'s front matter alone, and the platform-specific assertions activate as each theme file lands. The structural test above (`test_every_color_token_has_both_modes_defined`) runs from SP00 itself, before either platform exists, since it only reads `DESIGN.md`.


---

## SP07 Stories — Layout + Auth

### US-31 — Three-column layout renders and adapts to screen size

**As a** desk user, **I want** a three-column layout (sidebar / chat / investigation panel) that adapts to smaller screens, **so that** I can navigate and work efficiently on any device.

**Acceptance criteria:**
- ≥1280px: three columns visible simultaneously (sidebar / chat / why-tree panel)
- 768–1279px: why-tree panel collapses to toggle drawer
- <768px: sidebar and why-tree panel both in drawers; chat only
- Why-tree panel hidden when no active investigation
- **The `GembaCheckCard` docks inline in the chat thread (center column), not in a dedicated third column** (SP-00b decision) — the right panel is the why-tree only, keeping one surface per column
- **The why-tree legend is collapsed by default behind a "legend" toggle** (SP-00b decision), expanding on demand — the tree can grow tall, so fixed legend space is not spent by default

**Tasks:**
- T01: Write `src/layouts/AppLayout.tsx` with CSS grid three-column layout
- T02: Write `src/components/Sidebar/ProjectSidebar.tsx`
- T03: Write `src/components/InvestigationPanel/InvestigationPanel.tsx` with tab navigation
- T04: Implement responsive collapse with `useMediaQuery` hook

**Tests:**
```typescript
it('shows all three columns at 1440px', () => {
  setViewport(1440); render(<AppLayout />)
  expect(screen.getByTestId('sidebar')).toBeVisible()
  expect(screen.getByTestId('investigation-panel')).toBeVisible()
})
it('collapses investigation panel below 1280px', () => {
  setViewport(1024); render(<AppLayout />)
  expect(screen.queryByTestId('investigation-panel')).not.toBeVisible()
})
```

---

### US-32 — Auth screens and project dashboard render correctly

**As a** user, **I want** login, registration, and a project dashboard, **so that** I can access Rhizolve and see the state of my work at a glance.

**Acceptance criteria (dashboard, from SP-00b wireframe):**
- Project cards in a responsive grid, each showing: name, domain badge, one-line description, status dot (Search Party vocabulary — solid coral = active, hollow = closed, amber = draft), active-investigation count, maturity level, member count
- A metrics row above the grid: active investigations, root causes found, average depth to cause, Gemba completion rate — org-scoped
- A right-hand "Needs attention" rail surfacing existing cross-project signals (not new backend work — all three already exist): Gemba checks assigned to the current user (E06 US-43), conflict flags awaiting driver (E04 US-26), investigations awaiting quorum (E04 US-24)
- A dashed "New project" card as the last grid item
- Metrics and rail are read-only aggregations; clicking any card or rail item routes into that project/investigation

**Tasks:**
- T01: Add Clerk `<SignIn/>` at `/login`, `<SignUp/>` at `/register`
- T02: Write `src/features/projects/ProjectDashboardPage.tsx` — grid of `ProjectCard`, `MetricsRow`, `NeedsAttentionRail`
- T03: Write `src/components/ProtectedRoute.tsx`
- T04: Add React Router routes: `/login`, `/register`, `/projects`, `/projects/:id`
- T05: Write `GET /api/v1/dashboard/metrics` — org-scoped aggregation (active count, root causes, avg depth, Gemba completion); `require_internal_scope` (external members do not see org-wide metrics)
- T06: Write `GET /api/v1/dashboard/attention` — assembles assigned-Gemba + conflict + quorum signals for the current user across their projects
- T07: `ProjectCard` status dot and domain badge read colours from `DESIGN.md` tokens, matching the why-tree node vocabulary

**Tests:**
```typescript
it('renders a status dot matching investigation state', () => {
  render(<ProjectCard project={{ status: 'active', domain: 'manufacturing' }} />)
  expect(screen.getByTestId('status-dot')).toHaveAttribute('data-status', 'active')
})

it('shows needs-attention items assigned to the current user', async () => {
  server.use(http.get('/api/v1/dashboard/attention', () =>
    HttpResponse.json({ assignedGemba: [{ investigationId: 'inv-1', branch: '3.1' }], conflicts: [], quorum: [] })))
  render(<NeedsAttentionRail />)
  expect(await screen.findByText(/3\.1/)).toBeInTheDocument()
})
```

```python
@pytest.mark.asyncio
async def test_dashboard_metrics_denied_for_external_member(authed_external_viewer, project_id):
    r = await authed_external_viewer.get("/api/v1/dashboard/metrics")
    assert r.status_code == 403
```

---

## SP08 Stories — Investigation Setup

### US-33 — Chat renders shallow responses and structured investigation cards

**As a** user, **I want** the chat to render plain text for shallow questions and interactive cards for investigation interrupts, **so that** the interface adapts to the interaction type.

**Acceptance criteria:**
- Shallow response: markdown-rendered chat bubble
- Hypothesis review interrupt: `HypothesisReviewCard` with remove, add, reorder controls
- Gemba check interrupt: `GembaCheckCard` with result selection and attachment upload
- Validator review interrupt: `ValidatorReviewCard` with decision, confidence, override
- Countermeasure review interrupt: `CountermeasureReviewCard` with accept, edit, reject

**Tasks:**
- T01: Write `src/features/chat/ChatThread.tsx` with type-based card selection
- T02: Write all five card components
- T03: Write `src/features/chat/ChatInput.tsx` with mode indicator and `/btw` detection

**Tests:**
```typescript
it('renders hypothesis card for hypothesis_review interrupt', () => {
  render(<ChatThread messages={[{ type: 'interrupt', interrupt_type: 'hypothesis_review', hypotheses: mockHypotheses }]} />)
  expect(screen.getByTestId('hypothesis-review-card')).toBeInTheDocument()
})
```

---

### US-34 — Mode indicator subtle in chat input with manual override

**As a** user, **I want** a subtle mode indicator that shows current routing and allows override, **so that** I am always aware of the mode without the UI dominating.

**Tasks:**
- T01: Write `src/features/chat/ModeIndicator.tsx` — small pill (● Shallow / ◆ Deep)
- T02: Write `src/features/chat/ModePopover.tsx` — explanation and manual toggle on click
- T03: Wire mode state to `useConversation` hook

---

## SP09 Stories — Full Flow

### US-35 — Why tree renders as an interactive xyflow graph

**As a** user, **I want** the live why tree as an interactive graph, **so that** I understand the full investigation structure and can navigate by clicking nodes.

**Acceptance criteria:**
- Nodes rendered with status-based styles: active (default), closed/OK (green), suspended (grey dashed), conflict (amber)
- Clicking a node scrolls chat to corresponding message
- New nodes animate in within 3 seconds via SSE update
- Tree layout computed by `d3-hierarchy` (`d3.tree()`, top-down), links rendered orthogonally to match the Search Party connector aesthetic

**Tasks:**
- T01: Install `@xyflow/react` and `d3-hierarchy` in `frontend/web`
- T02: Write `src/features/investigation/WhyTree.tsx` with `d3-hierarchy` layout (compute `d3.hierarchy(root)` → `d3.tree().nodeSize([w,h])`, map to `@xyflow/react` node/edge positions)
- T03: Write `src/features/investigation/WhyNode.tsx` with status-based styling
- T04: Wire node click to `chatRef.scrollToMessage(node_id)`

---

### US-36 — `/btw` opens independent parallel thread

**As a** user in Deep mode, **I want** `/btw` to open an independent chat thread for a quick question, **so that** I get an answer without losing investigation context.

**Acceptance criteria:**
- `/btw` in Deep mode: slide-in panel visually distinct from main chat
- Main investigation thread completely unaffected
- Closing the `/btw` panel restores the investigation panel

**Tasks:**
- T01: Write `/btw` prefix detection in `ChatInput.tsx`
- T02: Write `src/features/chat/BtwThread.tsx` — slide-in panel
- T03: Wire to `POST /api/v1/chat` with `thread_type: "btw"` and separate `thread_id`

---

## SP10 Stories — Deployment

### US-37 — Multi-stage Dockerfile builds and serves the full stack

**As a** DevOps engineer, **I want** a single Dockerfile building both React and FastAPI, **so that** the app deploys to HF Spaces as one container.

**Acceptance criteria:**
- `docker build .` completes in < 5 minutes, image < 2GB
- React at `/`, API at `/api/v1/*`, MCP at `/mcp`, Gradio at `/gradio`
- `GET /api/v1/health` returns 200 within 30 seconds of cold start

**Tasks:**
- T01: Write multi-stage `Dockerfile` (Node 22 builder → Python 3.12 runtime)
- T02: Write `README.md` with HF Spaces metadata (`sdk: docker`, `app_port: 7860`)
- T03: Write `infra/smoke-test.sh`
- T04: Configure HF Spaces secrets (REDIS_URL, OPENROUTER_API_KEY, SERPER_API_KEY, REPORT_SIGNING_KEY)
- T05: GitHub Actions auto-deploy to HF Spaces on push to `main`

### US-38 — Pilot team completes five investigations with feedback

**Phase gate before SP15:** 5 distinct investigations from pilot team, ≥2 domains, written feedback from each tester, 0 blocking bugs open.
