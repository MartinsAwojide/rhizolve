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

*("SP-##" below is a spike ID, unrelated to the "SP##" sprint numbers in `docs/build-plan/sprint-map.md` — see AGENTS.md.)*

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

**Status (2026-07-11):** Done. `AppLayout` (`src/layouts/AppLayout.tsx`) uses a
JS-driven `useMediaQuery` hook (not pure CSS) so responsive collapse is
testable under jsdom, which has no real layout engine — panels toggle via
the `hidden` attribute, not CSS-only media queries. This also stood up the
frontend's testing stack (Vitest + RTL + jsdom + MSW) and Tailwind/DESIGN.md
token pipeline (`tailwind.config.ts`, `src/styles/tokens.css`) for the first
time, since neither existed before this story; `tests/design/test_token_parity.py`
Layer 2 (web) now passes. `ProjectSidebar`/`InvestigationPanel` are minimal
stubs (T02/T03) — real content lands with US-32/US-33/US-35.

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

**Status (2026-07-12):** Done (ADR-019, ADR-020). Investigation state had
no Postgres row at all before this story (only markdown files + Redis
checkpoints) — added a new `investigations` table synced from
`FiveWhysAgent._status()`, which the 4 dashboard metrics and the
quorum/conflict halves of the attention rail are computed from.
`assignedGemba` always returns `[]` pending E06 US-43 (Android
assignment, not built). Frontend: first story to install Clerk
(`@clerk/react`, not the deprecated `@clerk/clerk-react`), `react-router`
(v8, not v7 as originally planned — see ADR-020), and TanStack Query;
`App.tsx` (US-31's chat shell) now lives at `/projects/:id`. New
`projectStatus` DESIGN.md token group added for `ProjectCard`'s status
dot, separate from `nodeStatus`. `GET /projects` also enriched with
`status`/`active_investigation_count`/`member_count`/`description`
(the latter a new column) since no endpoint existed for the dashboard
grid's required fields.

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

**Status: done.** Presentational-only slice, matching the story's given test —
no backend chat-message history exists yet (`POST /api/v1/chat` is a
stateless passthrough), so `ChatThread` takes a `messages` prop directly;
wiring it to real backend calls via `useConversation` is US-34/35's concern.
Three gaps surfaced during planning and were resolved before implementation:
1. No shared UI primitives existed — built minimal `src/components/ui/{Card,Button}.tsx`
   matching `AGENTS.md`'s documented card pattern.
2. No markdown-rendering library was installed — added `react-markdown`
   (new dependency) for `ChatBubble`.
3. The backend's `root_cause_validator` (`backend/agent/graph.py:269-303`)
   never persists a confidence score, only `is_root_cause: bool` — so
   `ValidatorReviewCard` takes `confidence?: number` as optional and
   renders gracefully without it.

All 5 cards + `ChatThread` + `ChatInput` built TDD (test-first, RED verified,
GREEN verified). 60/60 `pnpm vitest run` green, `pnpm lint` and
`pnpm tsc --noEmit` clean. No backend changes — no ADR needed (react-markdown
is a routine, non-architectural dependency choice). Verification is
presentational-only (component tests assert rendered markdown/roles); no
live browser click-through was done since no backend wiring exists yet to
exercise end-to-end.

---

### US-34 — Mode indicator subtle in chat input with manual override

**As a** user, **I want** a subtle mode indicator that shows current routing and allows override, **so that** I am always aware of the mode without the UI dominating.

**Tasks:**
- T01: Write `src/features/chat/ModeIndicator.tsx` — small pill (● Shallow / ◆ Deep)
- T02: Write `src/features/chat/ModePopover.tsx` — explanation and manual toggle on click
- T03: Wire mode state to `useConversation` hook

**Status: done.** No given test literal in this story (unlike US-33), so scope
was pinned down via clarifying questions before implementation: (1)
`useConversation` was built as a full send/receive hook — holds
`messages: ChatMessage[]`, POSTs `/api/v1/chat` via an extended
`useAuthFetch` (now accepts a `RequestInit` for POST+body), appends the
user message optimistically then the assistant reply, and syncs `mode`
from `ChatResponse.active_mode` — rather than a mode-only stub, since a
functional hook was more useful than a placeholder. (2) `ModePopover`'s
override is client-side only: forcing shallow/deep sets local override
state that `sendMessage` respects on the next call, overriding the
response's own `active_mode` suggestion. `ChatInput`'s mode prop changed
from an arbitrary `string` to `'shallow' | 'deep'`, now rendering
`ModeIndicator` (which owns click-to-open `ModePopover`) instead of a
plain pill — existing tests updated accordingly. 74/74 `pnpm vitest run`
green, `pnpm lint` and `pnpm tsc --noEmit` clean. No ADR — routine hook/UI
composition, no new dependency or cross-service contract change.

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

**Status: done.** T01-T04 were frontend-only, but no data source existed
for them to consume — see ADR-021 for the full gap analysis and decision.
Three additions beyond the literal task list, all confirmed with the user
first:
1. **New `GET /api/v1/projects/{project_id}/investigations/{investigation_id}/tree`**
   endpoint (`backend/api/why_tree.py`) — `FiveWhysAgent._status()` read
   `why_nodes` internally but nothing exposed it; added `agent.get_tree()`
   plus `WhyNodeOut`/`AttachmentOut` schemas (`backend/agent/schemas.py`)
   with a derived `conflict: bool` joined against flagged `Conflict` rows.
2. **Enriched the `node_update` SSE payload** with an `updated_nodes` diff
   (`five_whys_agent.py`'s `_run_and_publish`) — LangGraph's
   `stream_mode="updates"` chunk already carries the partial `why_nodes`
   a graph node returned, published as-is instead of forcing a refetch.
3. **DESIGN.md's full 6-state `nodeStatus` vocabulary** (active/confirmed/
   ruledOut/rootCause/suspended/conflict) implemented via
   `src/features/investigation/nodeStyle.ts`'s `deriveNodeStatus`, not
   just the AC's literal 4-state description — precedence: conflict >
   rootCause > suspended > confirmed > ruledOut > active.

`WhyTree`/`WhyNode`/`useWhyTree`/`layout.ts` all built TDD. T04's click
wiring stops at an `onNodeClick?: (nodeId: string) => void` prop —
`App.tsx`/`InvestigationPanel` are still stubs (consistent with US-33/34),
so the actual `chatRef.scrollToMessage` composition is deferred to
whichever story wires the full investigation page. 101/101
`pnpm vitest run` green (backend `uv run pytest` also green), `pnpm lint`
and `pnpm tsc --noEmit` clean. See ADR-021 for the full decision record.

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

**Status: done.** T01 was already built in US-33 (`ChatInput.tsx`'s
`/^\/btw\b/` detection). T03's `thread_type: "btw"` wording is stale —
the backend (`backend/agent/btw.py`, built in an earlier story) never
had such a field; it infers everything from the `/btw` prefix on
`message` and mints a fresh ephemeral `thread_id` per send via
`resolve_thread()`. Wired the frontend to that actual contract instead.
Two decisions confirmed with the user first:
1. **Mode-gated client-side**: `/btw` only opens the panel when the
   current mode is `'deep'` (the backend itself doesn't gate by mode);
   in shallow mode a `/btw`-prefixed message sends normally, no panel.
2. **`BtwThread.tsx` is read-only** — `resolve_thread()` never continues
   a prior btw thread (fresh ephemeral id every send), so there's no
   backend support for multi-turn panel conversation; it just displays
   the one exchange plus a close button, reusing `ChatBubble`.

Also fixed a real bug found while wiring this: `useConversation`'s single
`threadIdRef` would have been silently overwritten by a btw reply's
ephemeral `thread_id`, corrupting the main investigation thread tracking.
Fixed by branching to separate `btwMessages`/`btwOpen` state that never
touches `threadIdRef` or the main `mode`. 107/107 `pnpm vitest run`
green, `pnpm lint` and `pnpm tsc --noEmit` clean. No backend changes, no
ADR (consuming an already-built, already-tested backend contract).

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

**Status: done (revised scope — see ADR-022).** Mid-planning, research
surfaced `gradio.Server` (published April 2026, after most training
data — verified live against `gradio.app/guides/server-mode` and
`huggingface.co/blog/introducing-gradio-server`): a FastAPI subclass
that's fully `app.include_router()`-compatible, meaning the main app
*could* migrate to it with a one-line change. The user explicitly chose
**not** to migrate the main app — it stays plain FastAPI, untouched.
Instead, a separate `huggingface/` folder at the repo root hosts a public
POC deployment on `gr.Server`, reusing the real `backend/`'s routers and
business logic without duplicating it in git (a CI/local script copies
`agent/core/models/api` into `huggingface/backend/` on disk only,
gitignored — see `scripts/hf-poc-assemble.sh`). This also resolved the
AC's `/mcp`/`/gradio` route mentions: neither exists yet (E10/MCP isn't
built; no Gradio pilot UI was ever built despite ADR-001 planning one),
so the POC serves React (`/`) + API (`/api/v1/*`) only, matching what's
actually implemented.

Built: `huggingface/{README.md,Dockerfile,backend/{main.py,pyproject.toml},frontend/README.md}`,
`.github/workflows/deploy-hf-poc.yml`, `scripts/hf-poc-assemble.sh`.
Verified end-to-end locally: `docker build -f huggingface/Dockerfile huggingface`
succeeds, container boots against real Redis+Postgres (own Docker
network, not mocked), `GET /api/v1/health` returns `{"status":"ok","redis":"connected"}`,
`GET /` serves the built React app — all within the story's cold-start
expectation. Two real bugs found and fixed during this local
verification (not caught by any prior test): a UID-1000 permission
ordering bug (`uv sync` must run as the non-root `user`, and `WORKDIR`
needs an explicit `chown` since `useradd -m` doesn't retroactively own a
directory created by a later `WORKDIR` instruction), and a Docker `COPY`
semantics bug (`COPY dir1 dir2 dest/` copies each source's *contents*
into `dest/`, not the source directories themselves — silently flattened
`agent/`, `core/`, `models/`, `api/` into one directory, breaking every
import). Also fixed a pre-existing `WhyNode.tsx` (US-35) typing bug this
build surfaced: its `NodeProps` generic used an ad hoc
`{ data } & Record<string, unknown>` shape instead of a proper
`Node<WhyNodeData, 'whyNode'>`, which `tsc -b` (production build mode)
catches but `tsc --noEmit` (used in this session's prior verification
passes) does not — a real gap in how thoroughly `--noEmit` checks build
output.

Deploying an actual live URL requires the user to create the HF Space
and add `HF_TOKEN`/app secrets (documented in `huggingface/README.md`) —
not something achievable without HF account access. See ADR-022 for the
full decision record.

### US-38a — Investigation page composed from existing chat + why-tree components

**As a** user, **I want** to actually open a project and run a real
investigation through the UI, **so that** the pilot (US-38) has
something real to test.

**Added retroactively 2026-07-12** — not in the original SP10 plan.
US-33 through US-36 each built a real, tested component
(`ChatThread`, `ChatInput`, `BtwThread`, `useConversation`, `WhyTree`,
`useWhyTree`) but deliberately deferred wiring it into a real page —
every one of those stories' status notes says some version of "deferred
to whichever future story composes the full investigation page." That
story was never actually scheduled. As of US-37, `App.tsx` (rendered at
`/projects/:id`) is still literally `<div>Chat thread placeholder</div>`
and `InvestigationPanel`'s why-tree tab is still `'Why-tree graph
placeholder'` text (confirmed via `grep -rn "placeholder" frontend/web/src`
— these are the only two placeholder strings left in the app). US-38's
phase gate ("5 distinct investigations from pilot team") is unpassable
without this — there is currently no way to start or run an
investigation through the web UI at all.

**Acceptance criteria:**
- `App.tsx` at `/projects/:id` renders real `useConversation`-backed
  `ChatThread`/`ChatInput` (and `BtwThread` when `btwOpen`), scoped to
  the route's `project_id`
- `InvestigationPanel`'s why-tree tab renders real `WhyTree`, scoped to
  the same `project_id`/`investigation_id`
- If no investigation exists yet for the project, the page offers a way
  to start one (calls `FiveWhysAgent.start_investigation` via the chat
  endpoint's `action: "start_investigation"`) before falling back to
  chat/tree
- Clicking a why-tree node scrolls the chat thread to the corresponding
  message (the click-to-scroll wiring every prior story since US-35
  deferred)

**Tasks:**
- T01: Wire route params (`project_id`, and an `investigation_id` once
  one exists) into `useConversation`/`useWhyTree` inside `App.tsx`
- T02: Replace `App.tsx`'s placeholder with the composed chat layout
- T03: Replace `InvestigationPanel`'s why-tree placeholder with `WhyTree`
- T04: Wire `WhyTree`'s `onNodeClick` to scroll `ChatThread` to the
  matching message (`data-node-id` attributes + `scrollIntoView`)
- T05: Handle the "no investigation started yet" state
- T06: Build a real "New project" creation flow (dedicated form/page
  calling `POST /api/v1/projects`), replacing the dashed "New project"
  card's current fall-through to `/projects/new` → `/projects/:id` with
  `id="new"` (gap documented in ADR-020, never scheduled until now)
- T07: Add an E2E/browser smoke-test layer (e.g. Playwright) covering
  the real `/projects/:id` investigation flow — the App.tsx composition
  gap this story fixes existed across four full stories (US-33→36)
  specifically because no test walks the actual route; a smoke test
  here should assert the page renders real chat/tree, not placeholder
  text, so this class of gap can't recur silently
- T08: Add a `postgres` service to `infra/compose.yml` — currently
  absent, so `docker compose up` directly (rather than
  `scripts/dev-up.sh`) silently breaks anything needing `DATABASE_URL`
- T09: Reconcile the SP-11 spike vs ADR-015 — ADR-015 answers a
  narrower, earlier question (driver-reset audit log) than SP-11 asks
  (ISO 9001-compliant audit log for E08/US-58); amend ADR-015 or note
  the mismatch explicitly so E08 doesn't get built assuming it's settled
- T10: Close the SP-04 spike loop — document in E04's spike section
  that SendGrid shipped instead of either candidate the spike named
  (Resend/Postmark), with the actual reason, so the spike record matches
  reality
- T11: Create the actual Hugging Face Space and configure
  `HF_TOKEN`/app secrets per `huggingface/README.md` — manual,
  operational, requires HF account access; not achievable in code

**Status (2026-07-13):** T01-T10 done, TDD-verified, all green
(backend 292/292 pytest, frontend 129/129 vitest, `tsc -b` clean, lint
clean, Playwright E2E 2/2). Scope grew mid-implementation beyond the
original AC list: composing `App.tsx` around `ChatThread`'s review
cards (wired in an earlier pass) surfaced that nothing actually
constructed the `interrupt`-type `ChatMessage`s those cards render — no
endpoint exposed `pending_hypotheses`/the awaiting-review `WhyNode`, so
the cards were reachable in isolation but never in the composed app.
Added a `GET .../status` endpoint (`FiveWhysAgent.get_status`,
`InvestigationStatusOut`) and `useConversation` polling after
`startInvestigation`/each review submit to close that gap — without it,
this story would have repeated its own root problem one layer deeper.

T07's E2E coverage is intentionally scoped down: it proves the composed
route tree (`App.tsx`, `ProjectCreatePage`, `ProtectedRoute`) builds and
serves with no placeholder text and no crash, using the real Vite dev
server — but stops at the `/login` redirect, since asserting the real
chat/why-tree render authenticated needs Clerk test-mode credentials
this session doesn't have. T11's manual Space-creation steps were done
(Space `martinsawojide/rhizolve` created, `HF_TOKEN`/`HF_SPACE_ID`/Space
secrets set), but `deploy-hf-poc.yml`'s sync step is **known broken on
a non-PRO HF account** — see the comment block above the "Upload to
Hugging Face Space" step in that workflow file for the confirmed root
cause (HF's create-repo billing check fires on every sync attempt,
`exist_ok` or not) and the two unimplemented ways forward (HF PRO, or
switch to a git-push-based sync). Not resolved this session.
**Update (2026-07-13) — real walkthrough performed, one blocking gap found.**
Ran the flow live via a local dev-instance Clerk session against
`scripts/dev-up.sh`'s stack: signed in, created a real project
(`POST /api/v1/projects` → `proj-5e39a5b5`), started a real investigation
(`POST /api/v1/chat action=start_investigation` → real
`FiveWhysAgent.start_investigation` call, real OpenRouter LLM call),
`GET .../status` correctly returned `interrupt_type: hypothesis_review`
with 6 real generated hypotheses, `HypothesisReviewCard` rendered them
exactly as designed. Confirms tasks #70/71 (status transport) work
end-to-end, not just under test mocks.

**Blocked at hypothesis-review submission — `POST .../hypothesis-review`
returns 403.** Root cause: `require_driver` (ADR-015) reads a
`driver:{investigation_id}` Redis key that's only ever written by
`PresenceTracker.heartbeat`, and **no frontend code calls
`.../presence/heartbeat` anywhere** (confirmed via
`grep -rn heartbeat frontend/web/src` — zero matches). No heartbeat
ever fires, so no driver is ever cached, so every review submission
403s unconditionally — not an edge case, this blocks every pilot
tester from completing a single investigation past hypothesis review.
US-38a's plan explicitly deferred "driver-status UI" as out of scope
("just letting 403s surface if they occur"), but didn't anticipate this
means the review flow is *fully* blocked, not occasionally gated.
**This needs its own scoped task/story (wire a heartbeat interval into
`useConversation` or a new hook, called once an investigation starts)
before a pilot tester can get past hypothesis review.** Not fixed this
session — flagging as the actual next blocker before US-38 can begin,
ahead of the GCP/Terraform deployment work.

---

### US-38 — Pilot team completes five investigations with feedback

**Phase gate before SP15:** 5 distinct investigations from pilot team, ≥2 domains, written feedback from each tester, 0 blocking bugs open. Depends on US-38a — a pilot tester needs a real, working investigation UI to test.
