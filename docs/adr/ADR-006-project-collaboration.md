# ADR-006 — Project-Based Collaboration Model

**Status:** Accepted  
**Date:** 2026-07-04  
**Refs:** [Product Brief](../product-brief.md), [ADR-004](ADR-004-redis-namespacing.md)

---

## Context

Earlier design iterations conflated user role (what you can do) with UI mode (how things look). This created two problems:

1. A Gemba operator finding a problem at 2am could not start their own investigation — locked out by role
2. Separate UI code paths for identical underlying graph operations

The resolution separates three orthogonal concerns:

- **Capability** — controlled by Role within a Project
- **UX density** — controlled by the device (web = information-dense, Android = touch-optimised)
- **Visibility** — controlled by Project visibility setting

Any user can create a Project and become its Owner, gaining full capability within that project.

---

## Decision

### Core Entities

```python
class Visibility(str, Enum):
    PRIVATE = "private"
    TEAM    = "team"
    ORG     = "org"

class Role(str, Enum):
    OWNER       = "owner"
    ANALYST     = "analyst"
    CONTRIBUTOR = "contributor"
    OPERATOR    = "operator"
    MANAGER     = "manager"
    VIEWER      = "viewer"
```

**Role hierarchy for driver assignment:** `Owner > Analyst > Contributor > Operator > Manager > Viewer`

### Six Roles

| Role | Purpose | Can drive? |
|------|---------|-----------|
| Owner | Full control — created the project | Yes |
| Analyst | Leads investigation, generates hypotheses, steers | Yes |
| Contributor | SME — contributes at hypothesis review and specific Gemba checks | Yes |
| Operator | Executes Gemba checks; can start own investigations as Owner | No |
| Manager | Read-only visibility across org investigations | No |
| Viewer | Read-only on specific projects — for clients, auditors | No |

### Authentication — Clerk

Clerk replaces all custom JWT logic. Clerk handles registration, login, session management, SSO (OIDC, SAML, Google, Microsoft), and identity. Rhizolve maintains a thin `User` record referencing `clerk_user_id`. A user's `org_id` reflects their primary/active Clerk organisation but does not restrict which other orgs' projects they can be invited into.

**Internal invitation:** Owner selects from Clerk org member list. Invitee's org matches the project's org → `MembershipScope.INTERNAL`.

**External invitation:** Owner types any email address (DocuSign model). Recipient receives an email; if no Clerk account exists, the link creates one. Regardless of which of the six roles is assigned, if the invitee's org does not match the project's org, they are scoped `MembershipScope.EXTERNAL` (see below). External invitees are limited to Contributor, Operator, or Viewer role labels — Owner and Analyst require org membership.

### External Membership Model

Projects are tightly coupled to organisations. Users are not — the same email/Clerk identity can belong to multiple organisations simultaneously. When a user from Org A is invited into a project owned by Org B, they are an **external member** of that project regardless of which of the six roles they are labelled with.

External membership is a distinct, capped permission set — not a restriction layered on top of the normal role matrix. An external Contributor does not behave like an internal Contributor minus a few permissions; they have a separate, narrower capability set entirely:

```python
class MembershipScope(str, Enum):
    INTERNAL = "internal"   # user's org_id matches the project's org_id
    EXTERNAL = "external"   # user's org_id does not match the project's org_id

EXTERNAL_PERMITTED_ACTIONS = frozenset({
    "view_hypotheses",
    "view_why_tree_structure",     # node labels, branch paths, status — no domain_context
    "comment_on_node",
    "steer_hypothesis_review",     # only if role is owner/analyst/contributor
    "submit_gemba_result",         # only if role is operator/contributor
})

EXTERNAL_DENIED_ACTIONS = frozenset({
    "view_domain_context",
    "view_rag_past_matches",
    "view_external_integration_context",   # Twenty.com / Plane.so / ERPNext data
    "inject_context",
    "view_audit_log",
    "export_report",
})
```

`MembershipScope` is computed at request time — not stored — by comparing `member.user.org_id` against `member.project.org_id`. A user's scope on a project can change if their org affiliation changes; it is never cached on the `ProjectMember` row.

**Enforcement:** `require_project_role(minimum_role)` is necessary but not sufficient. Every route handling context, RAG, integrations, or audit data must additionally call `require_internal_scope()`:

```python
async def require_internal_scope(member: ProjectMember = Depends(get_project_member)) -> ProjectMember:
    if member.scope == MembershipScope.EXTERNAL:
        raise HTTPException(403, "External members cannot access this resource")
    return member
```

**MCP surface inherits this automatically, not separately.** Rhizolve's MCP server (E10) is generated by FastMCP directly from the FastAPI OpenAPI spec — every MCP tool call is a proxy to the same route handler as the equivalent REST call. There is no parallel authorisation path to keep in sync. This means `require_internal_scope()` must be a dependency on the route itself (not on the REST controller only) — if it were instead applied ad hoc inside a REST handler function body rather than as a FastAPI `Depends`, an MCP-mediated call could bypass it. Every context-bearing endpoint's scope check is therefore implemented as a dependency, never as inline logic, so both REST and MCP callers pass through identical enforcement.

This means the why tree endpoint itself must strip `domain_context`, RAG matches, and external integration fields from the response payload when serving an external member — not just block a separate context endpoint. A single `WhyTreeResponse` serialiser branches on scope:

```python
def serialize_why_tree(nodes: list[WhyNode], scope: MembershipScope) -> dict:
    base = {"nodes": [n.model_dump(include={"id", "branch_path", "depth", "hypothesis",
                                              "gemba_result", "status"}) for n in nodes]}
    if scope == MembershipScope.INTERNAL:
        base["nodes"] = [n.model_dump() for n in nodes]  # full detail
    return base
```



### Driver Model

```python
def resolve_driver(active_participants: list[dict]) -> dict:
    """Most senior active participant is the driver. Ties broken by earliest join time."""
    ROLE_RANK = {
        "owner": 0, "analyst": 1, "contributor": 2,
        "operator": 3, "manager": 4, "viewer": 5,
    }
    steering = [p for p in active_participants
                if p["role"] in ("owner", "analyst", "contributor")]
    if not steering:
        return active_participants[0] if active_participants else None
    return min(steering, key=lambda p: (ROLE_RANK[p["role"]], p["joined_at"]))
```

Driver transfers automatically within 8 seconds when participants join or leave. Published via SSE `driver_changed` event.

**Heartbeat and TTL:** each active participant's client sends a presence heartbeat every 4 seconds; the Redis presence key carries an 8-second TTL (2× the heartbeat interval, standard practice — a single dropped heartbeat does not falsely mark a participant as gone). This means the worst-case window before a dead driver is detected and control transfers is 8 seconds, not a lower number — a dead driver blocking the group for up to 8 seconds is an accepted tradeoff in exchange for roughly half the heartbeat write volume a shorter interval would require, since responsiveness at a finer grain than this was not judged necessary for a collaborative investigation (as opposed to, say, a live cursor-tracking editor where sub-second precision matters).

### Quorum Model

```python
def check_quorum(active_participants: list[dict], ready_user_ids: set[str]) -> bool:
    """Strict majority of active steering-eligible participants must signal ready.

    Majority = floor(n / 2) + 1:
        n=1 -> 1   (solo)
        n=2 -> 2   (no simple majority exists for 2; require both)
        n=3 -> 2
        n=4 -> 3
        n=5 -> 3

    `ready_user_ids` is a bare set of user IDs, not a list of dicts carrying
    their own role. A "signal ready" action only ever needs the caller's
    identity — their role is already known server-side from their active
    ProjectMember row (the same lookup `require_project_role` already performs),
    so it is never re-supplied by the client. Requiring role on both `active`
    and `ready` payloads would let the two copies drift; this signature makes
    that class of bug structurally impossible.
    """
    STEERING_ROLES = ("owner", "analyst", "contributor")
    steering = [p for p in active_participants if p["role"] in STEERING_ROLES]
    if len(steering) <= 1:
        return True  # solo always at quorum
    active_ready = [p for p in steering if p["user_id"] in ready_user_ids]
    required = len(steering) // 2 + 1
    return len(active_ready) >= required
```

### Tree Navigation

The why tree has a head pointer. The driver can move it back to any previous branch.

**Soft reset:** Move head back, mark subsequent branches as `suspended`. Suspended branches are greyed out but preserved for reference.

**Hard reset:** Move head back, delete all subsequent child branches permanently.

**Trigger:** New evidence (image, audio, text) on a closed branch raises a conflict flag. The driver reviews and chooses soft or hard reset.

**Approval:** Driver only. Logged as an audit event with driver identity, reset type, branch path, and evidence reference.

### Gemba Evidence

Gemba results support three evidence types as first-class attachments:

```python
class Attachment(BaseModel):
    type: Literal["image", "audio", "text"]
    url: str
    transcription: Optional[str] = None  # Moonshine on-device transcription for audio
    transcription_status: Literal["pending", "complete", "unavailable"] = "pending"
    uploaded_at: datetime
    uploaded_by: str
```

**Transcription runs entirely on-device via Moonshine (MIT-licensed, `moonshine-ai/moonshine`).** Not a server-side API — there is no cloud transcription step on either platform:

- **Web:** the browser records audio; Moonshine's JS build (`@moonshine-ai/moonshine-js`, WASM/ONNX Runtime) transcribes locally in the tab before upload. The server receives audio + transcription together.
- **Android:** Moonshine's native Android package (same C++/OnnxRuntime core, MIT-licensed `tiny` English model, ~27MB) transcribes on device. This holds whether the device is online or offline — transcription never depends on connectivity, so there is no "offline gap" to design around.

**Android scheduling:** transcription is not run synchronously at capture time — it is queued and executed once CPU load is below a threshold (checked via `ActivityManager` idle/foreground signal), so it never competes with the active Koog inference call or blocks the Gemba submission UI. The attachment uploads immediately with `transcription_status: "pending"`; the transcription result patches in when the deferred job completes, whether that is seconds later (idle device) or after the current investigation step finishes (busy device). This applies identically whether the device is online or offline at capture time — Moonshine never needs connectivity, only CPU headroom.

If Moonshine fails to produce a transcript (corrupted audio, unsupported language), `transcription_status` is set to `"unavailable"` and the raw audio attachment remains visible and playable — the Gemba result is never blocked on transcription succeeding.

### Field Sync Conflict Resolution

When an offline Android operator's Gemba result syncs and the relevant branch has already been closed by the web team:

1. A conflict flag is raised on the affected branch
2. SSE `conflict_flagged` event sent to all participants
3. Driver receives an in-app notification
4. Driver chooses: accept existing conclusion (log field result as a note) or initiate soft/hard reset using the field evidence

### Project Lifecycle

```
DRAFT → ACTIVE → COMPLETE → ARCHIVED
```

### Visibility and RAG Namespacing

```python
def rag_namespaces(project: Project, org_id: str, team_id: str) -> list[tuple]:
    namespaces = [("investigations", project.id)]
    if project.visibility in (Visibility.TEAM, Visibility.ORG):
        namespaces.append(("investigations", team_id))
    if project.visibility == Visibility.ORG:
        namespaces.append(("investigations", org_id))
    return namespaces
```

---

## Consequences

**Positive:**
- Any user can start an investigation — no capability lock-out by role
- Driver model provides clear single point of control without requiring manual handoff
- Quorum prevents one person from advancing a collaborative investigation prematurely
- Six roles cover field, desk, and external stakeholder use cases across all domains
- Clerk SSO available from day one — no custom auth build required

**Negative:**
- Six roles requires comprehensive RBAC middleware coverage — every route must enforce the correct minimum role
- Driver computation requires real-time presence tracking in Redis with heartbeat TTL
- Quorum with 3+ participants requires careful edge case handling (participant dropping mid-vote)
- Scope (`internal`/`external`) must be computed per-request, not cached — adds one join per authorised request
- Every context-bearing response serialiser (why tree, report, chat) needs a scope-aware branch — a missed branch is a data leak, not just a missing feature

---

## Alternatives Considered

**Mode-based architecture:** Rejected — conflates UX density with capability. Creates duplicate code paths for identical graph operations.

**Single role (everyone equal):** Rejected — concurrent collaborative investigations require clear ownership and control hierarchy to prevent conflicting steering actions.

**Custom JWT auth:** Rejected — Clerk provides SSO, org management, and identity out of the box. Building custom JWT adds 2 sprints of work with no product differentiation.
