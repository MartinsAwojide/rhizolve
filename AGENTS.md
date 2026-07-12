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

After every `git push`, check its output/exit code for errors (rejected push, failed CI-triggered checks visible in the push response, auth failures) before reporting the push as done — don't assume success just because the command returned.

Commit messages follow `{feat|fix|chore|docs|refactor|test|style|perf|build|ci}: {message}` — type prefix, colon, space, then a concise imperative summary of the change.

## Before any architectural change

Every non-trivial decision — new dependency with real footprint, data model change, cross-service contract change — gets an ADR in `docs/adr/`, numbered sequentially from the current highest (`ADR-008` is the latest as of this writing), following the existing template: Status, Context, Decision, Consequences, Alternatives Considered. Do not skip this under time pressure; retrofitting an ADR after the fact loses the "why," which is the part worth writing down.

## TDD is non-negotiable

Write the failing test before the implementation for every story in `docs/agile/`. No new logic merges without a test covering it.

Build and validate every feature end-to-end against real infrastructure, not just imports/type-checks — even when the task breakdown (`T01`, `T02`, ...) doesn't list a test line item for it. Add a bash script under the relevant `tests/` (or `tests/scripts/`) folder to stand up whatever's needed (a container, a service) and tear it down, then actually run it — e.g. `backend/tests/scripts/redis_test_up.sh` / `redis_test_down.sh` spinning up real `redis:8-alpine` to validate `make_checkpointer()` rather than trusting a bare import check.

## Work is spec'd as Hills → Epics → User Stories → Tasks → Tests

See `docs/product-brief.md` (the Hill), `docs/build-plan/sprint-map.md` (sequencing), `docs/agile/e*.md` (the 12 epics). Before implementing anything, find the relevant `US-xx` story — its acceptance criteria and pre-written tests are the spec. Don't invent scope beyond what the story states without asking.

**"SP" is ambiguous across the docs — two unrelated numbering schemes share the prefix:** `SP00`–`SP24` (no hyphen) are *sprints* from `docs/build-plan/sprint-map.md`; `SP-01`–`SP-16` (hyphenated) are *spikes*, one set per epic's `## Spike` section in `docs/agile/e*.md`. They don't correspond 1:1 — e.g. sprint `SP09` and spike `SP-09` are unrelated. Always write the hyphen when referring to a spike, and check which scheme a bare "SP##" reference means before acting on it.

An epic's `## Spike` section(s) must be resolved before its first `US-xx` story is implemented — spikes exist to settle library/API/pricing questions that a story's design would otherwise guess at. If a spike hasn't been answered yet when picking up that epic's first story, resolve it first (per "Research must be current, not just remembered" below) and record the finding (in the spike section itself, and in an ADR if it drives an architectural decision) before writing any story code.

## Clean code paradigms — apply where relevant, not as ritual

These are defaults, not rules to force onto every diff — apply the ones relevant to what you're actually touching, skip the ones that aren't. Definitions below are Rhizolve-specific so "relevant" has a concrete anchor:

- **DRY (Don't Repeat Yourself)** — one implementation, not copies drifting apart. E.g. `_project_out()` in `projects_crud.py` exists so `create_project`/`list_projects`/`update_project` don't each hand-build the response shape.
- **SOLID**:
  - *Single Responsibility* — a module has one reason to change. `FiveWhysAgent` owns graph orchestration; `RedisPubSub` owns pub/sub; don't fold unrelated concerns into either.
  - *Open/Closed* — extend via new code, not by rewriting stable code's internals. Adding a new interrupt type should mean a new case in `_INTERRUPT_TYPES`, not restructuring `_status()`.
  - *Liskov Substitution* — a more specific type must honor its base type's contract. Relevant wherever `AsyncRedisSaver`-compatible checkpointers or `APIRouter`-shaped routers are swapped (e.g. `huggingface/backend/main.py` reusing `backend/api/*` routers unchanged under `gr.Server`).
  - *Interface Segregation* — don't force a caller to depend on props/params it doesn't use. E.g. card components (`GembaCheckCard`, `ValidatorReviewCard`) take only the fields they render, not the full `WhyNode`.
  - *Dependency Inversion* — depend on the abstraction already in place (`app.state.five_whys_agent`, `useAuthFetch`) rather than reaching around it to a concrete client.
- **KISS (Keep It Simple, Stupid)** — prefer the simplest solution that satisfies the story's AC. Don't add a state machine where a boolean suffices.
- **YAGNI (You Aren't Gonna Need It)** — don't build for a future epic's hypothetical needs. E.g. `huggingface/backend/pyproject.toml` deliberately isn't auto-synced from `backend/pyproject.toml` — that generality wasn't needed for the POC.
- **SoC (Separation of Concerns)** — distinct responsibilities in distinct places. Frontend: presentational components (`ChatBubble`, `WhyNode`) stay free of fetch logic; hooks (`useConversation`, `useWhyTree`) own data fetching. Backend: routers stay thin, business logic lives in `agent/`/`core/`.
- **Law of Demeter ("don't talk to strangers")** — a unit talks to its immediate collaborators, not through them to their internals. A component should call `useConversation()`'s returned functions, not reach into `useConversation`'s internal refs or reimplement its fetch logic.
- **Boy Scout Rule** — leave touched code cleaner than you found it, scoped to what you're already touching (not a license for drive-by rewrites elsewhere — see "don't add features/refactor beyond what the task requires" in the system prompt).
- **Composition over inheritance** — this codebase has effectively no class inheritance hierarchies (React function components + hooks, FastAPI routers, Pydantic models); keep it that way — compose smaller pieces (hooks calling hooks, routers calling agent methods) rather than introducing base classes.
- **PoLA (Principle of Least Astonishment)** — code should behave the way a reader familiar with the codebase's existing patterns would expect. E.g. a new endpoint should follow the existing `Depends(get_project_member)` auth pattern, not invent a new one, unless there's a stated reason.
- **Fail fast** — surface errors near their source. E.g. `useAuthFetch` throws on a non-`ok` response instead of returning the error body as if it were data (a real bug fixed this session precisely because the opposite happened).
- **Single source of truth** — one authoritative place per piece of data/logic. E.g. ADR-022's whole design (`huggingface/backend/` importing the real `agent/core/models/api` at build time instead of a duplicated copy) exists specifically to keep `backend/` as the only source of truth for business logic.

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
