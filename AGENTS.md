# AGENTS.md

Rhizolve — AI-assisted 5 Whys root cause investigation platform. Backend: FastAPI + LangGraph. Web: React 19 + Vite. Android: Kotlin + Jetpack Compose + Koog. Full product context: `docs/product-brief.md`.

## Monorepo layout

- `backend/` — Python 3.12, `uv`. Own `AGENTS.md`.
- `frontend/web/` — Node 22, `pnpm`. Own `AGENTS.md`.
- `mobile/android/` — Kotlin, Gradle. Own `AGENTS.md`.
- `docs/` — ADRs, sprint map, epics. Read before touching architecture.

Nested `AGENTS.md` files take precedence for their own subtree. Read the nearest one to the file you're editing, not just this root file.

## Interaction mode: Socratic

Before implementing any non-trivial change, ask clarifying questions Socratic-style — surface assumptions, tradeoffs, and alternatives, and make the user reason through the decision rather than just receiving a finished answer. Don't skip straight to code for architectural, scope, or design decisions.

## Git: no co-author, no unrequested push

Never add `Co-Authored-By: Claude` (or any AI co-author trailer) to commit messages. Never run `git push` unless the user explicitly asks for it in that turn — a prior push approval does not carry over.

Commit messages follow `{feat|fix|chore|docs|refactor|test|style|perf|build|ci}: {message}` — type prefix, colon, space, then a concise imperative summary of the change.

## Before any architectural change

Every non-trivial decision — new dependency with real footprint, data model change, cross-service contract change — gets an ADR in `docs/adr/`, numbered sequentially from the current highest (`ADR-008` is the latest as of this writing), following the existing template: Status, Context, Decision, Consequences, Alternatives Considered. Do not skip this under time pressure; retrofitting an ADR after the fact loses the "why," which is the part worth writing down.

## TDD is non-negotiable

Write the failing test before the implementation for every story in `docs/agile/`. No new logic merges without a test covering it.

## Work is spec'd as Hills → Epics → User Stories → Tasks → Tests

See `docs/product-brief.md` (the Hill), `docs/build-plan/sprint-map.md` (sequencing), `docs/agile/e*.md` (the 12 epics). Before implementing anything, find the relevant `US-xx` story — its acceptance criteria and pre-written tests are the spec. Don't invent scope beyond what the story states without asking.

## UI work

Follows `DESIGN.md` at repo root (Google Stitch spec — YAML front matter + prose). Run `npx @google/design.md lint DESIGN.md` after any edit to it.

## Debugging sparse-docs dependencies

Koog, Cactus, FastMCP 3.0, and `langgraph-checkpoint-redis` all move faster than their official docs. Check GitHub Issues on the relevant repo before proposing a fix from memory or training data — for these specific packages, an open issue or recent PR is more likely to be correct than what a model already "knows."

## Permissions

**Safe without asking:** reading files, running tests, linting, `uv sync` / `pnpm install` against an existing lockfile.

**Ask first:** adding a new dependency, deleting a migration, `git push`, changing ADR numbering, any schema change to `WhyNode` or `OverallState` (multiple epics and both graph engines depend on their exact shape — see `docs/adr/ADR-007-state-interchange-format.md`).

## Definition of Done

- [ ] Test written first, passing
- [ ] Linter clean for the touched stack (see nested `AGENTS.md`)
- [ ] Acceptance criteria in the owning `US-xx` story satisfied
- [ ] New ADR written if an architectural decision was made, not just implemented
