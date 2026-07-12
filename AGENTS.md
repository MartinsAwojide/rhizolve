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

## Implementation workflow: plan first, then task by task

Always draft a plan before starting implementation — even for a single user story. Use plan mode (research the story, surface gaps/decisions via Socratic questions, write the plan file, get it approved) before writing any code, not just for large or ambiguous work.

Once a plan is approved, execute it **task by task, not user-story by user-story**: pick the plan's task list, work one task fully (TDD red/green, verify) before moving to the next, tracking progress with `TaskCreate`/`TaskUpdate`. Don't batch multiple tasks' code changes together before verifying any of them, and don't jump ahead to the next user story until the current story's tasks are all done, verified, and committed.

## Git: no co-author, no unrequested push

Never add `Co-Authored-By: Claude` (or any AI co-author trailer) to commit messages. Never run `git push` unless the user explicitly asks for it in that turn — a prior push approval does not carry over.

Commit messages follow `{feat|fix|chore|docs|refactor|test|style|perf|build|ci}: {message}` — type prefix, colon, space, then a concise imperative summary of the change.

## Before any architectural change

Every non-trivial decision — new dependency with real footprint, data model change, cross-service contract change — gets an ADR in `docs/adr/`, numbered sequentially from the current highest (`ADR-008` is the latest as of this writing), following the existing template: Status, Context, Decision, Consequences, Alternatives Considered. Do not skip this under time pressure; retrofitting an ADR after the fact loses the "why," which is the part worth writing down.

## TDD is non-negotiable

Write the failing test before the implementation for every story in `docs/agile/`. No new logic merges without a test covering it.

Build and validate every feature end-to-end against real infrastructure, not just imports/type-checks — even when the task breakdown (`T01`, `T02`, ...) doesn't list a test line item for it. Add a bash script under the relevant `tests/` (or `tests/scripts/`) folder to stand up whatever's needed (a container, a service) and tear it down, then actually run it — e.g. `backend/tests/scripts/redis_test_up.sh` / `redis_test_down.sh` spinning up real `redis:8-alpine` to validate `make_checkpointer()` rather than trusting a bare import check.

## Work is spec'd as Hills → Epics → User Stories → Tasks → Tests

See `docs/product-brief.md` (the Hill), `docs/build-plan/sprint-map.md` (sequencing), `docs/agile/e*.md` (the 12 epics). Before implementing anything, find the relevant `US-xx` story — its acceptance criteria and pre-written tests are the spec. Don't invent scope beyond what the story states without asking.

## UI work

Follows `DESIGN.md` at repo root (Google Stitch spec — YAML front matter + prose). Run `npx @google/design.md lint DESIGN.md` after any edit to it.

## Debugging sparse-docs dependencies

Koog, Cactus, FastMCP 3.0, and `langgraph-checkpoint-redis` all move faster than their official docs. Check GitHub Issues on the relevant repo before proposing a fix from memory or training data — for these specific packages, an open issue or recent PR is more likely to be correct than what a model already "knows."

More generally: whenever a framework/library behaves unexpectedly (error, wrong output, API mismatch with training data), research the corresponding GitHub repo's Issues (and closed PRs) for fixes, workarounds, or confirmation before guessing from memory — not just for the sparse-docs packages named above. Read-only research only: never open, comment on, or otherwise create issues/PRs on a third-party repo — that requires explicit approval, which will not be granted proactively.

## Research must be current, not just remembered

Spike research (`## Spike` sections in `docs/agile/e*.md`) exists specifically to answer questions a model's training data can't reliably answer — library version behavior, API shape, pricing, availability — so a spike's output is only as good as how current its inputs are. Don't resolve a spike, or any other research task on this project, from training-data recall alone. Verify against a live source (official docs, changelog, GitHub repo at its current `HEAD`, package registry) before writing the finding down, and note the verification date in the spike's output.

Design decisions — ADRs, spike conclusions, dependency choices — must not rest on obsolete information or on anything with a known training cutoff. If a library, API, or pricing model may have changed since a model's cutoff, treat that as a reason to check, not a reason to hedge with a caveat and move on.

When researching how to implement something against a library or SDK, check the vendor's official blog and the `examples`/`example` folder of the library's official GitHub repo for current, working implementation code — not just prose docs. Treat an example repo's own age skeptically: check its last-updated date and diff its usage against the library's current source (or CHANGELOG) before trusting it, since even an "official" example can go stale relative to the package it demonstrates (confirmed happening with `clerk/fastapi-example` during SP-03 — its import path no longer matched the current SDK's top-level exports).

If related, previously-built repos exist locally (e.g. a past course or project touching the same vendor/library), check those too as a real-world precedent — but weigh them the same way: current official source is the tiebreaker when a local example and the vendor's current API disagree.

## Permissions

**Safe without asking:** reading files, running tests, linting, `uv sync` / `pnpm install` against an existing lockfile.

**Ask first:** adding a new dependency, deleting a migration, `git push`, changing ADR numbering, any schema change to `WhyNode` or `OverallState` (multiple epics and both graph engines depend on their exact shape — see `docs/adr/ADR-007-state-interchange-format.md`).

## Definition of Done

- [ ] Test written first, passing
- [ ] Linter clean for the touched stack (see nested `AGENTS.md`)
- [ ] Acceptance criteria in the owning `US-xx` story satisfied
- [ ] New ADR written if an architectural decision was made, not just implemented
