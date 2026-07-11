# ADR-013 — Gemba Attachment Shape and Local Storage

**Status:** Accepted
**Date:** 2026-07-11
**Sprint:** SP05 (US-21, backend slice)
**Refs:** [E04 Project Collaboration](../agile/e04-project-collaboration.md), [ADR-007](ADR-007-state-interchange-format.md), [ADR-011](ADR-011-project-rbac-middleware.md), [ADR-012](ADR-012-membership-scope-implementation.md)

---

## Context

US-21 needs Gemba results to support image/audio attachments. Backend-only
this pass (web/Android transcription integration deferred). Two things
didn't exist before this story:

1. **No REST gemba-submission surface at all.** `FiveWhysAgent.submit_gemba`
   existed only as an agent-layer method called directly in tests — never
   wrapped by an `api/*.py` router.
2. **No `Attachment` shape, no upload/storage pattern.** ADR-007 already
   reserves `"attachments": {"type": "array"}` on `WhyNode` in the
   canonical LangGraph↔Koog interchange schema, but left the item shape
   undefined. `WhyNode.attachments` was an untyped `NotRequired[list[Any]]`
   stub, unreferenced elsewhere. No file-upload/multipart pattern or
   blob-storage client existed anywhere in the backend.

## Decision

**Combined endpoint.** `POST /{project_id}/investigations/{investigation_id}/gemba`
accepts the gemba result (`OK`/`NOK`), notes, and zero-or-more file
attachments in one multipart request — not two endpoints, since
`submit_gemba` consumes the `gemba_check` LangGraph interrupt in one call;
there's no second opportunity to attach more files to the same node
afterward. `files`/`transcriptions`/`transcription_statuses` are
index-aligned parallel form-field lists (FastAPI has no native "grouped"
multipart field). Gated by `require_project_role(Role.OPERATOR)` only —
**not** `require_internal_scope`, since ADR-006's `EXTERNAL_PERMITTED_ACTIONS`
already lists `submit_gemba_result` as allowed for external
operator/contributor; adding the scope gate would wrongly block them.

**`Attachment` shape lives inside LangGraph-checkpointed `WhyNode` state,
not a new Postgres table.** All investigation state today is
Redis-checkpointed (LangGraph), not Postgres — `models/` only has
identity/project tables (`User`, `Organisation`, `Project`, `ProjectMember`,
`ProjectInvitation`), nothing investigation-related. A Postgres
`Attachment` table would fork state that Android/Koog has no access to and
that the `/sync` endpoint wouldn't carry, breaking ADR-007's
cross-engine-interchange premise for no query benefit this pass. Concretely
types `WhyNode.attachments: NotRequired[list[Any]]` →
`NotRequired[list[Attachment]]`, where:

```python
class Attachment(TypedDict):
    id: str
    type: Literal["image", "audio"]
    url: str
    filename: str
    content_type: str
    transcription: NotRequired[str]
    transcription_status: NotRequired[Literal["pending", "complete", "unavailable"]]
```
This narrows ADR-007's open-ended `attachments: array` — a `WhyNode` shape
change, which `backend/AGENTS.md` flags ask-first since multiple epics and
both graph engines depend on its exact shape. Asked and decided here.

**Local-disk storage this pass, not GCS.** New `core/storage.py`'s
`LocalAttachmentStorage` (`upload`/`read`/`get_url`), keyed as
`{investigation_id}/{uuid4()}{ext}` — never trusts the client filename
directly (collision + path-traversal defense; only the extension is taken
from it). GCS is explicitly deferred: no new cloud dependency, no
credentials needed for this pass, real end-to-end testability preserved
(AGENTS.md mandates testing against real infra, not mocks — local disk
achieves that; a real GCS bucket in CI would not, without credentials this
project doesn't have yet). The interface is swappable — a future
GCS-backed implementation slots in behind the same three methods, and gets
its own ADR when GCS credentials exist.

**Attachments served via an authenticated project-scoped `GET` route, not
`StaticFiles`.** `StaticFiles` is unauthenticated and would let anyone with
a URL bypass RBAC entirely. `GET /{project_id}/attachments/{investigation_id}/{filename}`
is gated by the existing `get_project_member` dependency (any active
member, read-only — reading isn't the privileged action; submitting is).

**Report markdown extended, PDF not built.** `_build_report_markdown` now
lists each node's attachments (transcript, or the literal note
"transcription unavailable" for that status). No PDF generation exists
anywhere in the codebase — building one is separate, real scope (new
library, layout work), deferred rather than folded into this pass.

## Consequences

**Positive:**
- Single canonical `Attachment` schema, no cross-engine (LangGraph/Koog)
  drift risk from a parallel Postgres representation.
- No premature cloud dependency/credential requirement.
- First real REST surface for gemba submission at all — closes a gap that
  predates this story.

**Negative:**
- Local disk isn't durable or shared across multiple backend replicas —
  a known limitation to revisit when GCS lands (deployment currently
  assumes a single backend instance; this doesn't change that assumption,
  just makes it more consequential for uploaded files specifically).
- Markdown-only report; PDF remains unbuilt.

## Alternatives Considered

**Postgres `Attachment` table:** Rejected — forks investigation state
outside LangGraph/Koog's shared interchange format, the entire premise
ADR-007 exists to protect.

**GCS this pass:** Rejected for now — real credentials don't exist yet,
and AGENTS.md's real-infra-testing mandate can't be honored against a cloud
bucket without them; local disk is swappable behind the same interface
later.

**`StaticFiles` mount for attachment retrieval:** Rejected — bypasses
per-project RBAC entirely, unacceptable for a project-collaboration epic.
