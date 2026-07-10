# ADR-010 — External Project Invitations as a Separate Table

**Status:** Accepted
**Date:** 2026-07-10
**Sprint:** SP04 (US-18)
**Refs:** [E03 Identity & Access](../agile/e03-identity-access.md), [ADR-006](ADR-006-project-collaboration.md), [ADR-009](ADR-009-postgres-identity-storage.md)

---

## Context

US-17's `ProjectMember` row requires a `user_id` — internal invitees always
resolve to a `User` (created as a stub via `get_or_create_user_by_clerk_id`
if they haven't logged in yet, since their `clerk_user_id` is already known).

US-18 external invitees are different: the Owner only has an email address.
There may be no Clerk account at all yet — `clerk_user_id` doesn't exist
until the recipient signs up. `ProjectMember.user_id` cannot be populated at
invite time, and the AC requires state `ProjectMember` doesn't model:
`expires_at` (7-day expiry), a resend action, and a lookup token embedded in
the emailed link.

## Decision

**New `ProjectInvitation` table**, distinct from `ProjectMember`:

```python
class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class ProjectInvitation(Base):
    __tablename__ = "project_invitations"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    email: Mapped[str]
    role: Mapped[Role]  # constrained to contributor/operator/viewer at the API layer
    token: Mapped[str] = mapped_column(unique=True, index=True)
    status: Mapped[InvitationStatus] = mapped_column(default=InvitationStatus.PENDING)
    expires_at: Mapped[datetime]
    created_at: Mapped[datetime]
```

- **Token:** opaque `secrets.token_urlsafe(32)`, stored directly (not a signed
  JWT). A DB row already has to exist to support resend (mutating
  `expires_at`/`token`) and revocation, so a stateless signed token buys
  nothing here — it would just be a second source of truth to keep in sync
  with the row's `status`. `python-jose` is also ruled out project-wide per
  the SP-03 spike (CVE-2024-33663), so a signed-token path would need a new
  JWT dependency anyway.
- **Viewing:** `GET /api/v1/invites/{token}` returns invite details (project
  id, role, status) for the sign-up page to render, and 410s once
  `expires_at` has passed. **Turning an accepted invite into an actual
  `ProjectMember` is out of scope for this pass** — US-18's own task list
  (T01–T05) only covers creating, viewing, and resending invitations, not
  accepting one. That conversion (create/find the `User`, insert an active
  `ProjectMember`, flip `ProjectInvitation.status` to `ACCEPTED`) is left for
  a later story once the Clerk sign-up redirect is wired up; building it now
  would be inventing scope beyond what US-18 states.
- **Resend — deviates from T05's literal path.** T05 specifies
  `POST /api/v1/invites/{token}/resend`, but the invite-creation response
  deliberately does not return the raw `token` (it's a bearer capability
  emailed only to the invitee — returning it to the API caller too would
  leak it to anyone who can read the Owner's own API responses/logs).  That
  left no way for the Owner to ever supply `{token}` to a resend call. Resend
  is instead `POST /api/v1/projects/{id}/invites/{invitation_id}/resend`,
  authorized the same way as invite creation (`_require_owner`), keyed by the
  invitation `id` already returned from the creation call. Rotates the token
  and extends `expires_at` by another `INVITATION_VALIDITY`.
- **Expiry:** checked at read time (`expires_at < now()` → 410), not via a
  background sweep — the AC only requires the token to stop working after 7
  days, not that the row disappear or flip status proactively.
- **Email:** SendGrid, same `core/email.py` helper as US-17 — not Resend (the
  vendor) as the doc originally suggested. Consistent with the US-17 call
  (SendGrid chosen there over the doc's own "Clerk or Resend" wording);
  introducing a second transactional-email vendor for one story would add a
  dependency with no product benefit.
- **Dependency:** `email-validator` added (pydantic's own optional extra,
  backs `EmailStr` on `InviteExternalMember.email` — needed for AC1, "any
  valid email"). Small, single-purpose, maintained alongside pydantic itself;
  user-approved before adding.

## Consequences

**Positive:**
- `ProjectMember.user_id` stays non-nullable — US-17's shape and its
  existing tests/queries are untouched.
- Resend and expiry are simple row mutations, not a competing signed-token
  verification path.
- Single email vendor across both invite flows.

**Negative:**
- Two separate "invite" concepts in the schema (`ProjectMember.status
  == "pending"` for internal, `ProjectInvitation` for external) rather than
  one unified invite table — acceptable since the two flows have genuinely
  different lifecycles (internal always has a `User` row; external may not).
- Token is stored in plaintext in the DB (not hashed like a password) — it's
  a bearer capability with a 7-day expiry and a large random space, not a
  credential reused elsewhere; low risk, consistent with typical invite-link
  designs (e.g. DocuSign-style flows).

## Alternatives Considered

**Nullable `user_id` + `email`/`token` columns on `ProjectMember`:** Rejected
— conflates two different lifecycles on one table and would have required
loosening `ProjectMember.user_id`'s non-null constraint, affecting every
existing US-17 query that assumes it's always set.

**Signed JWT invitation token (stateless):** Rejected — resend/expiry/
revocation all require mutating server-side state per invite anyway, so a
DB-backed opaque token has the same operational cost with none of a JWT's
added complexity (key management, `python-jose` unmaintained per SP-03).
