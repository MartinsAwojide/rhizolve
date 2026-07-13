# ADR-023 — Web UI Rejig: Brand Kit Adoption

**Status:** Accepted
**Date:** 2026-07-13
**Sprint:** N/A (cross-cutting UI rejig, not a single US)
**Refs:** `docs/brand/` (design kit), [DESIGN.md](../../DESIGN.md), [ADR-018](ADR-018-web-styling-and-testing-stack.md), [ADR-020](ADR-020-web-auth-routing-and-query-stack.md), [E05 Web Client](../agile/e05-web-client.md)

---

## Context

`docs/brand/` contains a full design kit (tokens, primitives, investigation/chat
components, and pre-built `LoginScreen.jsx`/`DashboardScreen.jsx`/
`ReportScreen.jsx`/`InvestigationScreen.jsx` mockups) that was only partially
applied to `frontend/web/`. Exploration before this rejig found: stub
components (`ProjectSidebar` rendered only a "Projects" label), missing
components (`NodeStatusMarker`, `Badge`, `Input`, `SuggestionCard`,
`MaturityMeter`, `StatusDot`, `Logo`), primitives with fewer variants than the
kit defines (`Button`/`Card` lacked `ghost`/`danger`/`size`/`elevation`), and a
`DESIGN.md` prose section that contradicted the kit's own reference mockup
(said graph-center/chat-right; the mockup and existing `AppLayout.tsx` are
chat-center/graph-right). Separately, exploration surfaced a real functional
bug on the same surface this rejig had to touch anyway: no presence heartbeat
existed anywhere in the frontend, so a driver was never cached in Redis and
`POST .../hypothesis-review` 403'd for every pilot tester.

This ADR records the cross-cutting decisions made while bringing
`frontend/web/` into parity with `docs/brand/`, across a 27-task plan spanning
tokens, primitives, investigation-status components, chat cards, and
composite screens (sidebar, presence bar, auth, dashboard, report).

## Decision

1. **Layout: chat-center / why-tree-right, not graph-center / chat-right.**
   `DESIGN.md`'s prose (§"Workspace Layout Blueprints") was corrected to match
   the kit's own `InvestigationScreen.jsx` mockup and the already-shipped
   `AppLayout.tsx` — least churn, and the mockup is the more concrete source
   of truth than prose that was never implemented against.

2. **Border/ring/shadow tokens stay out of `DESIGN.md`'s YAML frontmatter and
   `tests/design/test_token_parity.py`.** `docs/brand/readme.md` explicitly
   calls these "intentional additions... not literal in DESIGN.md front
   matter." They were added directly to `frontend/web/src/styles/tokens.css`
   and `tailwind.config.ts` (`borderTokens` const, new `boxShadow` block)
   without touching the Python parity contract — respecting the design kit's
   own stated boundary rather than the original plan draft, which had
   assumed they belonged in the parity test.

3. **Primitives were extended, not replaced.** `Button.tsx`/`Card.tsx` kept
   their existing Tailwind-class implementation and gained the kit's missing
   variants (`ghost`/`danger` variants + `size` prop on `Button`; `elevation`/
   `padded`/`CardHeader` on `Card`) rather than being rewritten as the kit's
   inline-style JSX verbatim. New primitives (`Badge`, `Input`) and
   investigation-status components (`NodeStatusMarker`, `StatusDot`,
   `MaturityMeter`, `Logo`) were ported faithfully from
   `docs/brand/components/` but translated from inline `style` objects to
   Tailwind classes/CSS custom properties, matching the existing codebase's
   idiom.

4. **Login: Clerk `appearance` theming, not a custom form.** The app already
   uses Clerk's `<SignIn>`/`<SignUp>` (ADR-020). `AuthLayout.tsx` wraps them
   with the brand rail (logo, headline, serif tagline, mono footer) and
   themes Clerk itself via its `appearance.variables` prop
   (`colorPrimary`/`colorBackground`/`colorText`/`borderRadius`/`fontFamily`
   set in `router.tsx`) rather than reimplementing form fields — Clerk owns
   the actual auth UI; the rejig only frames it.

5. **Report: UI-shell now, real backend stays a separate epic.** During
   brainstorming the user initially asked to wire the Report screen to a
   real backend; exploring `backend/api/`, `backend/core/`, and
   `backend/models/` found zero implementation for any of E08's nine user
   stories (US-51–US-59: AI TL;DR, server-rendered fault-tree SVG,
   WeasyPrint+Jinja2 PDF, AIAG 8D export, HMAC-SHA256 signing, append-only
   audit trail — Sprints SP17/SP18). Building real wiring here would have
   silently absorbed an entire unscoped epic. `ReportScreen.tsx` is a
   UI-shell only: hardcoded/illustrative data explicitly commented as mock,
   a client-rendered static fault-tree SVG (not the server-rendered one E08
   specifies), unwired "Download PDF"/"AIAG 8D"/"Download all (ZIP)"
   buttons. It replaces `InvestigationPanel`'s `'Report placeholder'` string
   in the existing `report` tab — no new route.

6. **Presence fix bundled into the rejig, not deferred.** A cosmetic-only
   presence bar would have left the known 403 blocker in place on the exact
   header surface being rebuilt. `usePresence.ts` (new hook) posts to the
   existing `POST /{project}/investigations/{id}/presence/heartbeat`
   endpoint (`backend/api/presence.py`, already implemented, previously
   never called from any frontend code) on a 5-second interval — under the
   backend's 8-second presence TTL (`backend/core/presence.py`,
   `PRESENCE_TTL_SECONDS = 8`) — and consumes `presence_snapshot`/
   `driver_changed` SSE events from the existing per-investigation `/stream`
   endpoint (`backend/api/stream.py`), reusing the same
   `EventSource`-per-investigation pattern `useWhyTree.ts` already
   established rather than opening a second SSE connection type.

7. **`usePresence`/`useWhyTree`'s stats-footer call are guarded by
   conditional rendering, not called unconditionally.** Both
   `InvestigationPanel`'s `TreeFooter` and `App.tsx`'s
   `PresenceBarContainer` are small subcomponents rendered only when
   `investigationId` is truthy — calling the underlying hooks unconditionally
   at the parent level would fire heartbeat/SSE/fetch requests even with no
   active investigation (confirmed by this exact regression breaking
   `AppLayout.test.tsx`/`App.test.tsx` mid-implementation until the guard was
   added).

8. **`InvestigationPanel`'s tab state is optionally controlled.** It accepts
   `activeTab`/`onTabChange` props that fall back to internal `useState` when
   omitted, so `PresenceBar`'s "Export report" button (rendered in `App.tsx`,
   a sibling of `AppLayout`'s `InvestigationPanel`) can switch the panel to
   its `report` tab by lifting tab state up through `AppLayout` — without
   forcing every other caller of `InvestigationPanel` to manage that state.

9. **`ChatBubble` gained a `system` role** (centered, muted, caption-sized, no
   `Card` wrapper) alongside the existing `user`/`assistant` roles, matching
   the kit's `ModePopover`-adjacent system-note style
   (`ChatMessage['shallow'].role` widened accordingly in `types.ts`).

10. **`SuggestionCard` was built but left unwired.** No backend "staged
    suggestion" message or interrupt type exists yet to drive it into
    `ChatThread` — building the component now (matching the kit's
    dashed-accent-border/serif-text/mono-`targetNode` design) without wiring
    it avoids inventing a fake data source ahead of the backend feature that
    would actually populate it.

## Consequences

- `tests/design/test_token_parity.py` continues to check only
  `colors`/`nodeStatus`/`projectStatus` — any future border/shadow-related
  design change must be validated by hand against `docs/brand/tokens/colors.css`,
  not by that test suite.
- `usePresence`'s 5-second heartbeat interval is coupled to
  `PRESENCE_TTL_SECONDS = 8` in `backend/core/presence.py` — if that TTL ever
  changes, `HEARTBEAT_INTERVAL_MS` in `frontend/web/src/hooks/usePresence.ts`
  must be updated to stay safely under it.
- `ReportScreen.tsx`'s mock data and unwired export buttons are a known,
  intentional gap — implementing E08 (US-51–US-59) will require replacing
  the static fault-tree/TL;DR/export buttons with real API-backed data, at
  which point this component's props contract will need to grow (it
  currently takes no props at all).
- `InvestigationPanel`'s controlled/uncontrolled tab duality means any future
  caller passing only one of `activeTab`/`onTabChange` (not both) gets
  inconsistent behavior — by convention this pair should always be passed
  together, matching `App.tsx`'s only current usage.

## Alternatives Considered

- **Replace `Button`/`Card` with the kit's inline-style JSX wholesale.**
  Rejected: would have discarded the existing Tailwind-based styling
  approach (ADR-018) for a different one mid-codebase, and broken every
  existing consumer's expectations about how these primitives receive
  styling.
- **Wire `ReportScreen` to a real backend now** (the user's initial request
  during brainstorming). Reversed after exploration showed this meant
  absorbing all of E08's nine unimplemented user stories — reverted to the
  smaller, already-recommended UI-shell-only scope once that cost was
  surfaced.
- **Skip the presence fix, ship `PresenceBar` as cosmetic-only.** Rejected:
  would have shipped a visually-complete header that still 403'd on every
  hypothesis review for every pilot tester — the whole point of touching
  this surface.
- **Give `usePresence`/`useWhyTree` their own always-mounted top-level call
  in `App.tsx`/`InvestigationPanel`.** Rejected after it broke
  `AppLayout.test.tsx`/`App.test.tsx` by firing real fetch/SSE/heartbeat
  calls even with no investigation — the guarded-subcomponent pattern was
  adopted instead specifically because it reproduces this failure state
  cleanly in tests (no investigation ⇒ subcomponent never mounts ⇒ hook
  never called).
