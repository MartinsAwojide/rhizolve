# ADR-011 — Centralized Role-Based Authorization for Project-Scoped Routes

**Status:** Accepted
**Date:** 2026-07-10
**Sprint:** SP04-SP05 (US-19)
**Refs:** [E03 Identity & Access](../agile/e03-identity-access.md), [ADR-006](ADR-006-project-collaboration.md), [ADR-010](ADR-010-external-project-invitations.md)

---

## Context

Project-scoped authorization had grown ad hoc across three stories:

- US-17/US-18 each relied on a hand-written `_require_owner(session, project_id, user)`
  helper duplicated inline into every owner-gated route in
  `api/project_members.py` — a plain function, not a FastAPI `Depends`, with
  no `status == "active"` filter (a `pending`-status Owner-role invite could
  have passed it).
- `PATCH /api/v1/projects/{project_id}` (project settings) and
  `GET /api/v1/projects/{project_id}/members` had **no role check at all** —
  any authenticated user could rename any project or list any project's
  members.
- `POST /api/v1/projects/{project_id}/investigations/{investigation_id}/context`
  (context injection, built under E02/US-13 before auth existed) had **no
  authentication whatsoever** — not even `get_current_user`.

US-19 requires one generic, minimum-role enforcement mechanism applied
uniformly across every project-scoped route, per the role hierarchy
Owner > Analyst > Contributor > Operator > Manager > Viewer already defined
in ADR-006.

## Decision

**`require_project_role(minimum_role: Role)`** — a FastAPI dependency
factory in new `api/middleware/rbac.py`:

```python
def require_project_role(minimum_role: Role):
    async def _dependency(
        project_id: str,
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_db_session),
    ) -> ProjectMember:
        result = await session.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id,
                ProjectMember.status == "active",
            )
        )
        membership = result.scalar_one_or_none()
        if membership is None or ROLE_RANK[membership.role] > ROLE_RANK[minimum_role]:
            raise HTTPException(403, "Insufficient project role for this action")
        return membership
    return _dependency
```

Backed by a new `ROLE_RANK` ordering in `models/project_member.py` (Owner=0,
most privileged, through Viewer=5). `project_id` resolves automatically —
FastAPI matches the inner dependency's parameter name against the route's
own path parameter. `status == "active"` is required for any check to
pass — closing the pending-invite gap `_require_owner` had.

Applied to every route with a `{project_id}` path parameter (confirmed via
grep as the complete set — 7 routes):

| Route | Gate |
|---|---|
| `POST /{project_id}/investigations/{investigation_id}/context` | Contributor+ |
| `PATCH /{project_id}` | Owner only |
| `GET /{project_id}/members` | any active member (Viewer floor) |
| `POST /{project_id}/members/internal` | Owner only |
| `POST /{project_id}/members/external` | Owner only |
| `POST /{project_id}/invites/{invitation_id}/resend` | Owner only |
| `POST /{project_id}/members/accept` | none — self-service, filters by `user_id` already |

`_require_owner` is deleted; its three call sites (`invite_internal_member`,
`invite_external_member`, `resend_external_invite`) now declare
`Depends(require_project_role(Role.OWNER))` instead.

The story's own example tests (operator starting an investigation, viewer
submitting a Gemba result) target endpoints that don't exist in this
codebase yet — same "given tests not literally reusable" situation as
US-15/16. `tests/test_rbac.py` instead exercises the real gated routes
above; documented at the top of that file.

## Consequences

**Positive:**
- One authorization mechanism instead of three divergent ones (duplicated
  inline check, no check, no auth at all).
- Context injection is now actually authenticated — closes a real gap.
- `status == "active"` requirement fixes a latent bug: a pending internal
  invite with `role=owner` could previously satisfy `_require_owner` before
  the invitee ever accepted.

**Negative — behavior change on 4 routes:** the rbac dependency now resolves
*before* the handler body's `session.get(Project)` 404 check. A request for
a **nonexistent** `project_id` from a non-member now returns **403 instead
of 404** on `PATCH /{project_id}`, `POST /{project_id}/members/internal`,
`POST /{project_id}/members/external`, and
`POST /{project_id}/invites/{invitation_id}/resend`. This is an intentional
anti-enumeration posture — it also matches the AC's "non-member accessing
any project endpoint → 403" literally — but it means a genuinely-missing
project and a project the caller has no claim on are now indistinguishable
to the caller, which is the point.

## Alternatives Considered

**Per-route inline checks (status quo):** Rejected — exactly the
duplication (and the missed `status` filter) this fixes.

**Single "any active member" dependency + manual rank comparison in each
handler body:** Rejected — pushes `ROLE_RANK` ordering knowledge into every
handler instead of one place; a handler forgetting the comparison silently
degrades to "any member" access.
