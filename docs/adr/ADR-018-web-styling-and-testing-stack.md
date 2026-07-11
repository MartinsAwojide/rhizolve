# ADR-018 — Web Styling and Testing Stack

**Status:** Accepted
**Date:** 2026-07-11
**Sprint:** SP07 (US-31, `AppLayout` three-column layout)
**Refs:** [E05 Web Client](../agile/e05-web-client.md), `DESIGN.md`, `tests/design/test_token_parity.py`

---

## Context

`frontend/web`'s `AGENTS.md` already mandates Tailwind, Vitest, React
Testing Library, and MSW, and `DESIGN.md`/`test_token_parity.py` assume a
`tailwind.config.ts` exists — but none of it was installed. US-31 (the
three-column `AppLayout`) is the first web story that needs to render and
test real components, so it's the first point these choices become
concrete rather than aspirational.

## Decision

1. **Tailwind CSS v4** (`tailwindcss` + `@tailwindcss/vite`), configured via
   a legacy `tailwind.config.ts` referenced from `src/index.css` with
   `@config`, rather than v4's default CSS-only `@theme` block. This is
   because `tests/design/test_token_parity.py`'s Layer 2 check
   (`test_web_tokens_match_design_md`) hardcodes the path
   `frontend/web/tailwind.config.ts` and greps it for `DESIGN.md`'s literal
   hex values — a CSS-only `@theme` setup would leave that file absent and
   the test permanently skipped.
2. **Token pipeline is two files, one source of truth.**
   `src/styles/tokens.css` defines light/dark CSS custom properties
   (`--color-surface-0`, etc.), transcribed by hand from `DESIGN.md`'s
   front matter; `tailwind.config.ts` maps Tailwind color/spacing/radius
   utilities to those `var(--...)` names, plus keeps a `designTokens`
   object with the raw hex values so the parity test has literal text to
   match against. Neither file reads `DESIGN.md` at build time (no YAML
   parser dependency added to the Vite build) — keeping them in sync is a
   manual step until a codegen script is worth building.
3. **Responsive layout is JS-driven (`useMediaQuery` + `matchMedia`), not
   pure CSS breakpoints.** jsdom (Vitest's DOM environment) has no real
   layout engine — it cannot evaluate CSS media queries. US-31's given
   tests assert `toBeVisible()`/`not.toBeVisible()` against viewport width,
   which only works if visibility is driven by JS state (the `hidden`
   attribute) that a test can control via a mocked `window.matchMedia`.
   Pure `lg:grid-cols-3`-style Tailwind responsive classes would be
   correct in a real browser but silently untestable under jsdom.
4. **RTL + jest-dom + jsdom installed now; MSW installed now but unused
   until US-32.** AGENTS.md's Definition of Done requires Vitest green,
   and this story has no server calls to mock — but the user chose to
   install the full stack AGENTS.md lists rather than defer MSW, so
   US-32's server-state work doesn't need a follow-up dependency PR.
5. **`python-frontmatter` added to `backend/pyproject.toml`** so
   `tests/design/test_token_parity.py` (a repo-root test, not backend
   product code) can actually run instead of erroring on import. It's a
   dev dependency of convenience — the test file predates this story but
   had no working Python environment to run in until now.

## Consequences

- Any future component needing responsive behavior testable in Vitest must
  go through `useMediaQuery`, not raw Tailwind breakpoint classes, for
  consistency with US-31's pattern — or accept that breakpoint logic is
  only verified by an E2E/browser test, not Vitest.
- `tokens.css`/`tailwind.config.ts` drift from `DESIGN.md` if someone edits
  the front matter without updating both files by hand; `test_token_parity.py`
  Layer 2 catches color drift (fails loudly) but not spacing/radius/typography
  drift, since those aren't checked by the parity test.
- MSW is installed with no active handlers yet — first real usage lands
  with US-32's auth/project-dashboard data fetching.

## Alternatives Considered

- **Tailwind v4 CSS-only `@theme`, no `tailwind.config.ts`.** Rejected:
  breaks the existing `test_token_parity.py` Layer 2 check, which is
  already-written repo infrastructure, not something this story should
  route around.
- **Pure CSS media queries for the three-column collapse**, deferring
  responsive verification to a future Playwright/E2E suite. Rejected: the
  story's own given tests are Vitest-based and expect deterministic
  viewport control now; introducing E2E tooling is out of scope for a
  single layout story.
