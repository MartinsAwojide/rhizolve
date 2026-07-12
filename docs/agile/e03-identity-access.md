# E03 — Identity & Access

**Epic statement:** Every Rhizolve user needs secure authentication and role-appropriate access so that investigation data is protected and each person sees and does only what their role permits.

**Sprints:** SP04–SP05  
**Refs:** [ADR-006](../adr/ADR-006-project-collaboration.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Users can log in via Clerk (email/password + SSO via OIDC, Google, Microsoft)
- Organisation created automatically from Clerk org on first login
- Six roles (Owner, Analyst, Contributor, Operator, Manager, Viewer) enforced on every project-scoped endpoint
- Internal invitation from org member list; external invitation to any email (DocuSign model)
- External invitees limited to Contributor, Operator, Viewer roles
- `MembershipScope` (internal/external) computed per-request and enforced independently of role on every context-bearing endpoint — not merely designed in ADR-006, but implemented and tested (see US-19a)

---

## Spike

*("SP-##" below is a spike ID, unrelated to the "SP##" sprint numbers in `docs/build-plan/sprint-map.md` — see AGENTS.md.)*

**SP-03 — Clerk SDK FastAPI integration — DONE**  
Time-box: 0.5 day. Question: Does `clerk-backend-api` Python SDK verify session tokens cleanly in FastAPI `Depends`, or is raw JWT verification via `python-jose` more reliable? Output: Library and approach selected. Done when: `get_current_user` dependency returns a `User` object from a valid Clerk token.

**Finding:** `clerk-backend-api` (official SDK, v6.0.1, MIT) selected over `python-jose` (unmaintained, CVE-2024-33663) and over `fastapi-clerk-auth`'s `ClerkHTTPBearer` (a legitimate alternative used in related production-course repos, but a third-party JWKS reimplementation rather than Clerk's maintained path — its richer `SessionAuthObjectV2` claim modeling, incl. `org_id`/`org_role`, matters once US-16/US-19 land). Correct current usage verified directly against `clerk-sdk-python` source at HEAD (not the official example repo, which is from April 2025 and imports from a path — top-level `clerk_backend_api` — that no longer re-exports these symbols): `from clerk_backend_api.security import authenticate_request_async, AuthenticateRequestOptions`, called as `await authenticate_request_async(request, AuthenticateRequestOptions(secret_key=..., authorized_parties=...))`, returning a `RequestState` with `.is_signed_in`/`.payload`/`.reason`. See `backend/core/auth.py`.

---

## US-15 — User can sign up and log in via Clerk

**As a** new or returning user, **I want** to create an account and log in using Clerk, **so that** my identity is verified without a separate Rhizolve password.

**Acceptance criteria:**
- First login creates a Rhizolve `User` record linked to `clerk_user_id`
- Returning user restores session and sees their projects
- SSO login (Google, Microsoft, OIDC) works without additional configuration per user
- Invalid session redirects to Clerk login page

**Tasks:**
- T01: `uv add clerk-backend-api` in `backend/`; `pnpm add @clerk/clerk-react` in `frontend/web/` — backend half DONE (`clerk-backend-api`, plus `sqlalchemy[asyncio]`/`asyncpg`/`psycopg[binary]`/`alembic` per ADR-009, none of which were part of the original task but were required to persist `User` at all). Frontend half (`@clerk/clerk-react`) explicitly deferred to a dedicated frontend pass — this story was scoped backend-only.
- T02: Write `backend/core/auth.py` with `get_current_user(credentials) -> User` dependency — DONE, but as `get_current_user(request, session) -> User`, not `(credentials) -> User`: takes the FastAPI `Request` directly (satisfies `clerk_backend_api`'s `Requestish` protocol) plus a DB session dependency, since verification and persistence are both needed. Upserts on every call (see below), not just a lookup.
- T03: Write `backend/models/user.py` with `clerk_user_id`, `email`, `display_name`, `org_id` — DONE. `org_id` is a plain nullable string column, not yet a foreign key — `Organisation` itself is US-16's concern. Backed by real Postgres (ADR-009), migration `alembic/versions/75016da78c11_create_users_table.py`.
- T04: Write `POST /api/v1/auth/sync` — DONE (`api/auth.py`). `get_current_user` itself also upserts on every authenticated request (`GET /api/v1/users/me` included) — a deliberate judgment call beyond the literal task: it makes "returning user restores session" work on any authenticated call, not only right after an explicit sync, closing a chicken-and-egg gap between first Clerk login and the first local `User` row. `/auth/sync` is an explicit, idempotent call to the same upsert path.
- T05: Add Clerk `<SignIn/>` and `<SignUp/>` to React routing — deferred to a frontend pass.
- T06: Wrap protected routes with Clerk `<SignedIn>` guard — deferred to a frontend pass.

**Given test fixture shape not literally reusable:** the doc's tests assume a `mock_clerk.verify_token` object; the actual call shape is `await authenticate_request_async(...)` returning a `RequestState`, not a bare `verify_token()`. `core/auth.py` exposes `verify_clerk_token(request) -> dict | None` as the monkeypatch seam instead (`backend/tests/test_auth.py` patches `core.auth.verify_clerk_token` directly) — same pattern already used all session for `agent.graph.why_generator` etc. The given tests' *behavior* (valid token → 200, first login → persisted record) is what's actually implemented and tested; the fixture plumbing differs.

**Tests:**
```python
@pytest.mark.asyncio
async def test_valid_clerk_token_returns_user(async_client, mock_clerk, valid_token):
    mock_clerk.verify_token.return_value = {"sub": "clerk_001", "email": "user@acme.com"}
    r = await async_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {valid_token}"})
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_first_login_creates_user_record(async_client, mock_clerk, db):
    mock_clerk.verify_token.return_value = {"sub": "new_clerk_id", "email": "new@acme.com"}
    await async_client.post("/api/v1/auth/sync")
    user = await db.get_user_by_clerk_id("new_clerk_id")
    assert user is not None
```

---

## US-16 — Organisation created and populated via Clerk

**As an** organisation administrator, **I want** my org created automatically when the first member logs in, **so that** all subsequent members are recognised as colleagues without manual setup.

**Acceptance criteria:**
- First user from a Clerk org creates the Rhizolve org record
- Subsequent users from the same Clerk org link to the existing org
- Multi-org users can switch between orgs in the nav bar
- All Clerk org members visible as potential collaborators when inviting

**Tasks:**
- T01: Write `backend/models/organisation.py` with `clerk_org_id`, `name`, `maturity_level` (default 2) — DONE. Real Postgres table (migration `9cd1d2cab318`), `users.org_id` upgraded from US-15's plain `String` to a real `Integer` FK on `organisations.id` in the same migration (hand-written, not autogenerated — Alembic's `compare_type=False` default would have silently dropped the type change, and autogenerate would have missed the table entirely without also registering `models.organisation` in `alembic/env.py`).
- T02: Update `POST /api/v1/auth/sync` to create/link org on login — DONE, and generalized: `get_current_user` itself (not just `/auth/sync`) upserts the org from the session JWT's `org_id`/`org_slug` claims (`SessionAuthObjectV2`, no extra Clerk API call needed) whenever present, consistent with US-15's "any authenticated request keeps state in sync" design. Org upsert uses `ON CONFLICT DO NOTHING` (not `DO UPDATE`) — a second login from the same org must not duplicate the row, but also shouldn't let whichever member logs in second silently overwrite the org's name.
- T03: Write `GET /api/v1/organisations/members` — DONE (`api/organisations.py`), backed by `core.auth.list_clerk_org_members` wrapping `Clerk(bearer_auth=...).organization_memberships.list_async(...)` — verified against current `clerk-sdk-python` source, not memory. Note: the mapping of Clerk's `public_user_data.identifier` field to "email" is an assumption per Clerk's docs (primary-identifier convention), not verified against a live Clerk org — tests fully stub `list_clerk_org_members`, so this mapping isn't exercised end-to-end.
- T04: Write org switcher component in React nav bar — deferred to a frontend pass (same as US-15).

**Given test fixture shape not literally reusable** (same precedent as US-15): adapted to monkeypatch `core.auth.verify_clerk_token` (and `api.organisations.list_clerk_org_members` for T03's test — importantly *not* `core.auth.list_clerk_org_members`, since `api/organisations.py` imports the name directly, binding it at import time). The given test's dedup assertion (`db.count_orgs() == 1`) is implemented as a real Postgres count query scoped to the specific `clerk_org_id` under test, not an unscoped table-wide count — the test DB persists across the whole suite (and across separate runs) with no per-test reset, so an unscoped count picks up unrelated orgs created by other tests.

**Tests:**
```python
@pytest.mark.asyncio
async def test_second_login_does_not_duplicate_org(async_client, mock_clerk, db, existing_org):
    mock_clerk.verify_token.return_value = {"sub": "user_002", "org_id": existing_org.clerk_org_id}
    await async_client.post("/api/v1/auth/sync")
    assert await db.count_orgs() == 1
```

---

## US-17 — Owner invites internal members by role

**As a** project Owner, **I want** to invite colleagues from my org and assign them a role, **so that** the right people participate with appropriate access.

**Acceptance criteria:**
- Org member list from Clerk shown as searchable dropdown
- Invited member receives in-app notification and email
- Accepted invite creates active `ProjectMember` with assigned role
- Duplicate invite returns 409

**Tasks:**
- T01: Write `POST /api/v1/projects/{id}/members/internal` accepting `clerk_user_id` and `role` — DONE (`api/project_members.py`). Requires the caller be an `OWNER`-role `ProjectMember` on the project (403 otherwise) — a direct local check, not the general `require_project_role` middleware (that's US-19's own T01; building it generically now would just get replaced). Invitee may not have logged into Rhizolve yet, so a stub `User` row is created by `clerk_user_id` if needed (`core/auth.py`'s `get_or_create_user_by_clerk_id`) — filled in properly on their first real login via the existing upsert path.
- T02: Write `backend/models/project_member.py` — DONE ahead of this story, under US-20, since it was needed to unblock this one.
- T03: Send invitation email — DONE, but via **SendGrid**, not the doc's literal "Clerk or Resend" wording (user's explicit choice, reusing a pattern from their own related repos). Verified current: `sendgrid==6.12.5` on PyPI, repo actively maintained. Confirmed the library is fully synchronous (no native async client) and that the official repo's own async-usage example is stale/broken (uses `@asyncio.coroutine`/`asyncio.async()`, both removed from modern Python) — so `core/email.py` wraps the blocking call in `asyncio.to_thread(...)` instead. Best-effort: a send failure is logged, not raised — email delivery isn't guaranteed infra and shouldn't block the invite from being recorded. The AC's other channel, in-app notification, is deferred — no notification system exists anywhere in the codebase yet.
- T04: Write `POST /api/v1/projects/{id}/members/accept` — DONE.

**Tests:**
```python
@pytest.mark.asyncio
async def test_duplicate_invite_returns_409(authed_owner, project_id, existing_member):
    r = await authed_owner.post(f"/api/v1/projects/{project_id}/members/internal",
                                json={"clerk_user_id": existing_member.clerk_user_id, "role": "analyst"})
    assert r.status_code == 409
```

---

## US-18 — Owner invites external collaborators by email (DocuSign model)

**As a** project Owner, **I want** to invite anyone by email regardless of whether they have a Rhizolve account, **so that** external clients, auditors, and specialists can participate.

**Acceptance criteria:**
- Any valid email can receive an invitation
- Recipient without Clerk account goes through sign-up first
- Invitation expires after 7 days; Owner can resend
- External invitees limited to Contributor, Operator, Viewer — Owner/Analyst require org membership

**Tasks:**
- T01: Write `POST /api/v1/projects/{id}/members/external` accepting `email` and `role`
- T02: Validate role ∈ {contributor, operator, viewer} for external invitees — return 422 otherwise
- T03: Generate signed invitation token with 7-day expiry
- T04: Send invitation email via Resend with Clerk auth link embedded
- T05: Write `GET /api/v1/invites/{token}` and `POST /api/v1/invites/{token}/resend`

**Tests:**
```python
@pytest.mark.asyncio
async def test_external_cannot_be_owner(authed_owner, project_id):
    r = await authed_owner.post(f"/api/v1/projects/{project_id}/members/external",
                                json={"email": "ext@client.com", "role": "owner"})
    assert r.status_code == 422

@pytest.mark.asyncio
async def test_expired_token_returns_410(async_client, expired_token):
    r = await async_client.get(f"/api/v1/invites/{expired_token}")
    assert r.status_code == 410
```

---

## US-19 — Role-based access enforced on every project action

**As a** developer, **I want** every project-scoped endpoint to check the requesting user's role, **so that** no user performs actions beyond their role.

**Acceptance criteria:**
- Operator starting an investigation returns 403
- Viewer submitting a Gemba result returns 403
- Contributor overriding the validator returns 403
- Non-member accessing any project endpoint returns 403
- Valid role for the action proceeds normally

**Tasks:**
- T01: Write `backend/api/middleware/rbac.py` with `require_project_role(minimum_role)` dependency
- T02: Define role hierarchy: Owner > Analyst > Contributor > Operator > Manager > Viewer
- T03: Apply `require_project_role` to every project-scoped route
- T04: Write comprehensive `test_rbac.py` covering every role-action combination in the permission matrix

**Tests:**
```python
@pytest.mark.asyncio
async def test_operator_cannot_start_investigation(authed_operator, project_id):
    r = await authed_operator.post(f"/api/v1/projects/{project_id}/investigations", json={...})
    assert r.status_code == 403

@pytest.mark.asyncio
async def test_viewer_cannot_submit_gemba(authed_viewer, project_id, inv_id):
    r = await authed_viewer.post(f"/api/v1/projects/{project_id}/investigations/{inv_id}/gemba",
                                  json={"result": "OK", "notes": ""})
    assert r.status_code == 403
```

---

## US-19a — Membership scope enforced independently of role on every context-bearing endpoint

**As a** developer, **I want** `require_internal_scope()` implemented and applied wherever context, RAG, integration data, or audit data is served, **so that** external members are correctly capped regardless of the role label they were given — this is the actual implementation that ADR-006's `MembershipScope` model depends on; without this story it is architecture with no code behind it.

**Acceptance criteria:**
- `member.scope` is computed at request time from `member.user.org_id != member.project.org_id` — never stored, never cached on `ProjectMember`
- `require_internal_scope()` is a FastAPI `Depends`, not inline logic inside a handler body — so MCP tool calls (E10) inherit the same check automatically by construction
- An `EXTERNAL`-scoped Contributor calling the context injection endpoint receives 403, despite the role-only permission matrix showing ✓ for Contributor
- An `EXTERNAL`-scoped Viewer calling report export receives 403, despite the role-only permission matrix showing ✓ for Viewer
- The why-tree response serialiser strips `domain_context`, RAG matches, and external integration fields for `EXTERNAL` scope while still returning hypotheses and tree structure — this is redaction on a shared endpoint, not a second blocked endpoint
- A user's scope on the same project can differ between two requests if their org affiliation changes between them — proving the "never cached" requirement is real, not just stated

**Tasks:**
- T01: Add `org_id` foreign keys to both `User` and `Project` if not already present from E04's project model; write `member.scope` as a computed property, not a column
- T02: Write `backend/api/middleware/scope.py` with `require_internal_scope(member: ProjectMember = Depends(get_project_member))` per ADR-006
- T03: Apply `require_internal_scope` to: context injection (E02 US-13), RAG search (E09 US-62), external integration context (E11), audit log (E08 US-58), report export (E08 US-59)
- T04: Write `serialize_why_tree(nodes, scope)` per ADR-006 and use it as the single serialiser for every route that returns tree data — REST and MCP alike — rather than writing scope-aware logic twice
- T05: Write `test_scope.py` covering every `EXTERNAL_DENIED_ACTIONS` entry from ADR-006 with both a 403 case (blocked endpoint) and a redaction case (shared endpoint, stripped fields)

**Tests:**
```python
@pytest.mark.asyncio
async def test_external_contributor_cannot_inject_context(authed_external_contributor, project_id, inv_id):
    r = await authed_external_contributor.post(
        f"/api/v1/projects/{project_id}/investigations/{inv_id}/context",
        json={"context": "Should be blocked"})
    assert r.status_code == 403

@pytest.mark.asyncio
async def test_external_viewer_cannot_export_report(authed_external_viewer, project_id, inv_id):
    r = await authed_external_viewer.get(
        f"/api/v1/projects/{project_id}/investigations/{inv_id}/report?format=pdf")
    assert r.status_code == 403

@pytest.mark.asyncio
async def test_external_scope_gets_redacted_tree_not_blocked_tree(authed_external_contributor,
                                                                   project_id, inv_id):
    """Contrast with the two tests above: tree access is a redaction case,
    not a 403 case — external members can see structure, just not domain_context."""
    r = await authed_external_contributor.get(
        f"/api/v1/projects/{project_id}/investigations/{inv_id}/tree")
    assert r.status_code == 200
    assert "domain_context" not in r.json()
    assert "hypothesis" in r.json()["nodes"][0]

@pytest.mark.asyncio
async def test_scope_recomputed_not_cached_across_requests(authed_client, project_id, inv_id,
                                                             user_that_changes_org):
    """If the user's org affiliation changes mid-session, the very next request
    must reflect the new scope — proving scope is never persisted on ProjectMember."""
    r1 = await authed_client.get(f"/api/v1/projects/{project_id}/investigations/{inv_id}/tree")
    assert "domain_context" in r1.json()  # still internal at this point

    await simulate_org_change(user_that_changes_org, new_org_id="different-org")

    r2 = await authed_client.get(f"/api/v1/projects/{project_id}/investigations/{inv_id}/tree")
    assert "domain_context" not in r2.json()  # now external, no caching masked the change
```
