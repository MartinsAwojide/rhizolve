# E04 — Project & Collaboration

**Epic statement:** Anyone involved in an investigation needs a shared workspace where multiple people contribute to the same investigation so that investigations are not blocked by the availability of any single person.

**Sprints:** SP05 (project model), SP06 (real-time collab), SP15 (SSE web), SP16 (Android + concurrency)  
**Refs:** [ADR-006](../adr/ADR-006-project-collaboration.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Any user can create a project and becomes its Owner
- Real-time collaboration: all active participants see state changes within 3 seconds
- Driver automatically assigned to most senior active participant; transfers on join/leave
- Quorum (majority of steering-eligible participants) gates driver advancement
- Gemba results support image, audio (on-device Moonshine transcription), and text attachments
- Driver can navigate the why tree: soft reset (suspend) or hard reset (delete) with audit log
- Field sync conflict flags affected branches for driver review
- Team model enables TEAM visibility scoping

---

## Spike

*("SP-##" below is a spike ID, unrelated to the "SP##" sprint numbers in `docs/build-plan/sprint-map.md` — see AGENTS.md.)*

**SP-04 — Email delivery provider**  
Time-box: 0.5 day. Question: Resend vs Postmark — Python SDK quality, deliverability, free tier? Done when: Test email delivered to real inbox from FastAPI using chosen SDK.

**Closure note (added during US-38a, 2026-07-13):** Neither Resend nor Postmark shipped — `backend/core/email.py` uses **SendGrid** (`sendgrid>=6.12.0` in `backend/pyproject.toml`, `SendGridAPIClient` in `send_invitation_email`/`send_external_invitation_email`), consumed by `api/invites.py`. This spike's comparison was never formally re-run against SendGrid; the choice was made directly during implementation without an ADR recording why. No action needed for the shipped feature (it works, is tested), but if email delivery is revisited, treat "why SendGrid over Resend/Postmark" as still open rather than assuming a documented decision exists.

**SP-05 — SSE reliability on HF Spaces**  
Time-box: 1 day. Question: Does nginx on HF Spaces buffer SSE responses despite `X-Accel-Buffering: no`? Does Upstash Redis Pub/Sub meet 3-second latency requirement? Done when: SSE event delivered from HF Spaces to browser within 1 second of Pub/Sub publish.

---

## SP05 Stories — Project Model

### US-20 — User can create a project

**As a** user, **I want** to create an investigation project with name, domain, visibility, and compliance standards, **so that** I have a workspace with the right governance from the start.

**Acceptance criteria:**
- `POST /api/v1/projects` creates project and makes requestor the Owner
- `compliance_standards: list[str]` stored per project (ISO 9001, ISO 45001, ISO/IEC 20000, ISO/IEC 27001)
- `maturity_level` inherits from org (default 2); overridable at project level
- Missing name returns 422; project ID follows `proj-{hex8}` format

**Tasks:**
- T01: Write `backend/models/project.py` with all fields including `compliance_standards`, `maturity_level` — DONE. `id` follows `proj-{hex8}` (`secrets.token_hex(4)`) per the AC, not an autoincrement int. `compliance_standards` is a Postgres `ARRAY(String)`.
- T02: Alembic migrations for `projects`, `project_members` — DONE (migration `a0b577f91e5b`, hand-written like US-16's — Alembic's `compare_type=False` default and the need to register both new models in `alembic/env.py` make autogenerate unreliable here). `backend/models/project_member.py` also built now (not literally in this story's task list, but explicitly needed by US-17, which this work was done ahead of specifically to unblock).
- T03: Write `POST /api/v1/projects`, `GET /api/v1/projects`, `PATCH /api/v1/projects/{id}` — DONE (`api/projects_crud.py`, mounted at the same `/api/v1/projects` prefix as US-13's existing `api/projects.py` — no path collision). Also added `GET /api/v1/projects/{id}/members`, not in this task list but required by `test_creator_is_owner`'s given assertion.
- T04: `ComplianceProfile(standards)` mapping — deferred. No given test exercises it, and it maps standards to *report sections*, which has no real definition before e08 (Reporting & Compliance) exists. Building it now would be inventing structure with nothing to validate it against.

**Tests:**
```python
@pytest.mark.asyncio
async def test_creator_is_owner(authed_client, current_user):
    r = await authed_client.post("/api/v1/projects", json={"name": "Test", "visibility": "private"})
    project_id = r.json()["id"]
    members = (await authed_client.get(f"/api/v1/projects/{project_id}/members")).json()
    assert any(m["user_id"] == current_user.id and m["role"] == "owner" for m in members)

@pytest.mark.asyncio
async def test_maturity_inherits_from_org(authed_client, org_with_maturity_3):
    r = await authed_client.post("/api/v1/projects", json={"name": "Test", "visibility": "private"})
    assert r.json()["maturity_level"] == 3
```

---

### US-21 — Gemba results support image and audio attachments with on-device transcription

**As an** operator, **I want** to attach a photo or voice note to my Gemba result and have it transcribed without waiting on a server round-trip, **so that** physical evidence is captured in the investigation record even when offline.

**Acceptance criteria:**
- Gemba submission accepts text notes, images, and audio recording on both web and Android
- Audio is transcribed on-device via Moonshine (`moonshine-ai/moonshine`, MIT-licensed `tiny` English model) — no server-side transcription call on either platform
- Web: transcription runs in-browser via `@moonshine-ai/moonshine-js` before upload; audio + transcript upload together
- Android: transcription is deferred and runs once CPU load is below threshold, never blocking the Gemba submission; attachment uploads immediately with `transcription_status: "pending"` and patches in when the deferred job completes
- Offline Android: attachment stored in Room; transcription proceeds regardless of connectivity (Moonshine needs no network) and both sync to backend on reconnect
- If transcription fails, `transcription_status: "unavailable"` and the raw audio remains playable — the Gemba result is never blocked on transcription succeeding
- Attachments and their transcriptions appear in the investigation report

**Tasks:**
- T01: Expand `GembaResult` schema: `attachments: list[Attachment]` with `type`, `url`, `transcription`, `transcription_status`
- T02: Write `POST .../gemba/attachments` — multipart upload to GCS, accepting `transcription` and `transcription_status` fields from the client
- T03 (Web): Integrate `@moonshine-ai/moonshine-js` in `frontend/web` — transcribe recorded audio client-side before upload
- T04 (Android): Integrate Moonshine's native Android package; write `DeferredTranscriptionWorker` scheduled via WorkManager, gated on `ActivityManager` CPU/foreground idle signal rather than network state
- T05: Update `report_generator` to include attachments and transcriptions in markdown and PDF, rendering `transcription_status: "unavailable"` attachments with a "transcription unavailable" note rather than omitting them

**Status (2026-07-11):** Backend slice done (`d488be1`, ADR-013) — T01/T02/T05 complete, but scoped to local-disk storage (not GCS, see ADR-013) and markdown-only report (no PDF). T03 (web Moonshine) and T04 (Android Moonshine + `DeferredTranscriptionWorker`) not started.

**Tests:**
```python
@pytest.mark.asyncio
async def test_audio_attachment_accepts_client_side_transcription(authed_operator, project_id, inv_id):
    with open("test.m4a", "rb") as f:
        r = await authed_operator.post(
            f".../{project_id}/investigations/{inv_id}/gemba/attachments",
            files={"file": ("audio.m4a", f, "audio/m4a")},
            data={"transcription": "Spring visibly cracked", "transcription_status": "complete"},
        )
    assert r.json()["transcription"] == "Spring visibly cracked"
    assert r.json()["transcription_status"] == "complete"

@pytest.mark.asyncio
async def test_pending_transcription_does_not_block_upload(authed_operator, project_id, inv_id):
    with open("test.m4a", "rb") as f:
        r = await authed_operator.post(
            f".../{project_id}/investigations/{inv_id}/gemba/attachments",
            files={"file": ("audio.m4a", f, "audio/m4a")},
            data={"transcription_status": "pending"},
        )
    assert r.status_code == 201
    assert r.json()["transcription_status"] == "pending"

@pytest.mark.asyncio
async def test_unavailable_transcription_still_shows_audio_in_report(completed_state_with_unavailable_transcription):
    report = build_report(completed_state_with_unavailable_transcription)
    assert "transcription unavailable" in report.lower()
    assert ".m4a" in report or "audio" in report.lower()
```

```kotlin
// mobile/android/androidTest/DeferredTranscriptionWorkerTest.kt
@Test fun `transcription deferred while CPU load high`() = runTest {
    coEvery { activityManager.isDeviceIdleOrForegroundLight() } returns false
    val result = worker.doWork()
    assertEquals(Result.retry(), result)
}

@Test fun `transcription runs once CPU load drops regardless of connectivity`() = runTest {
    coEvery { activityManager.isDeviceIdleOrForegroundLight() } returns true
    coEvery { network.isUsable() } returns false  // fully offline
    coEvery { moonshine.transcribe(any()) } returns "Spring visibly cracked"
    val result = worker.doWork()
    assertEquals(Result.success(), result)
    coVerify { dao.updateTranscription(any(), "Spring visibly cracked", "complete") }
}
```

---

## SP06 Stories — Real-Time Collaboration

### US-22 — Active session shows presence and edit indicators

**As a** session participant, **I want** to see who else is active and what they are editing, **so that** the team coordinates without talking over each other.

**Acceptance criteria:**
- Presence list shows all active participants with editing indicators
- Editing indicator clears within 2 seconds of user stopping
- Disconnected user removed from list within 8 seconds (2× the 4-second heartbeat interval — see ADR-006)
- Solo user: no presence UI shown

**Tasks:**
- T01: Write `backend/core/presence.py` tracking active users per investigation in Redis with a 4-second client heartbeat and 8-second key TTL
- T02: Publish `user_joined`, `user_left`, `user_editing` events to SSE channel
- T03: Write React `PresenceBar` and `EditingIndicator` components (SP15)

**Status (2026-07-11):** Backend slice done (ADR-014), built together with US-27 since
presence rides US-27's SSE transport. T01/T02 complete, via snapshot-on-heartbeat
rather than Redis keyspace notifications (see ADR-014). T03 (React components) not
started.

---

### US-23 — Driver assigned automatically by seniority

**As a** session participant, **I want** the most senior active participant to automatically be the driver, **so that** the investigation always has clear steering control without manual handoff.

**Acceptance criteria:**
- Most senior role (Owner > Analyst > Contributor) becomes driver
- Equal seniority: earlier join time wins
- Driver transfers within 8 seconds of the previous driver's heartbeat lapsing (bounded by the same 8-second presence TTL, not a separate shorter target — see ADR-006)
- `driver_changed` SSE event emitted on transfer
- Solo participant is always driver

**Tasks:**
- T01: Write `backend/core/driver.py` with `resolve_driver(active_participants)`
- T02: Publish `driver_changed` event on presence change
- T03: Store current driver in Redis presence record per investigation
- T04: `require_driver` dependency used by steering and tree reset endpoints

**Status (2026-07-11):** Backend slice done (ADR-015), built together with US-25 since
`require_driver` is only consumed by US-25's tree/reset endpoint this pass. All 4 tasks
complete — driver cached in Redis on every presence heartbeat, not recomputed per gated
request (see ADR-015).

**Tests:**
```python
def test_owner_beats_analyst_for_driver():
    participants = [
        {"user_id": "u1", "role": "analyst", "joined_at": 1000},
        {"user_id": "u2", "role": "owner", "joined_at": 2000},
    ]
    assert resolve_driver(participants)["user_id"] == "u2"

def test_earlier_join_wins_on_equal_role():
    participants = [
        {"user_id": "u1", "role": "analyst", "joined_at": 1000},
        {"user_id": "u2", "role": "analyst", "joined_at": 2000},
    ]
    assert resolve_driver(participants)["user_id"] == "u1"
```

---

### US-24 — Quorum gates driver advancement

**As a** session participant, **I want** to signal readiness and see quorum status, **so that** the driver knows the team is aligned before advancing.

**Acceptance criteria:**
- Active Owner, Analyst, Contributor see a Ready button at each steering interrupt
- Quorum = majority of steering-eligible participants signal ready
- `quorum_reached` SSE event enables driver's advance button
- Solo investigator is always at quorum

**Tasks:**
- T01: Write `POST .../ready` toggling ready state for the calling user (identity from session — no payload needed beyond the request itself)
- T02: Write `check_quorum(active, ready_user_ids)` in `backend/core/quorum.py` — takes a bare set of user IDs, not role-carrying dicts (see ADR-006)
- T03: Publish `quorum_reached` and `quorum_lost` SSE events
- T04: React `ReadinessPanel` per participant with quorum progress indicator

**Status (2026-07-11):** Backend slice done (ADR-016), scope expanded to also wrap the 3
previously-unwrapped steering-advance methods (`hypothesis-review`, `validator-review`,
`countermeasure-review`) in new routes gated by `require_driver` + `require_quorum`, so the
quorum gate has real callers. Ready state uses a separate no-TTL Redis namespace, not
`PresenceTracker` — see ADR-016. React `ReadinessPanel` not started.

**Tests:**
```python
def test_quorum_majority_of_steering_participants():
    active = [{"user_id": f"u{i}", "role": r}
              for i, r in enumerate(["owner", "analyst", "contributor", "operator", "viewer"])]
    ready_user_ids = {"u0", "u1"}
    assert check_quorum(active, ready_user_ids) is True  # 2 of 3 steering participants (owner, analyst)

def test_quorum_not_met_with_minority():
    active = [{"user_id": f"u{i}", "role": "analyst"} for i in range(3)]
    ready_user_ids = {"u0"}
    assert check_quorum(active, ready_user_ids) is False  # 1 of 3, required is 2

def test_ready_user_who_left_session_does_not_count():
    """A user who signalled ready then disconnected must not still count toward
    quorum — ready_user_ids may contain stale IDs; only those still in `active`
    can satisfy quorum."""
    active = [{"user_id": "u0", "role": "owner"}, {"user_id": "u1", "role": "analyst"}]
    ready_user_ids = {"u0", "u2"}  # u2 is no longer active
    assert check_quorum(active, ready_user_ids) is False  # only u0 counts, need 2
```

---

### US-25 — Driver navigates why tree with soft and hard reset

**As a** session driver, **I want** to move the investigation head back to a previous branch and choose whether to preserve or delete subsequent work, **so that** new field evidence can be properly evaluated.

**Acceptance criteria:**
- Soft reset: marks subsequent branches `suspended`, preserves them for reference
- Hard reset: deletes subsequent branches permanently
- Reset requires driver role; non-driver returns 403
- Reset logged as audit event with driver identity, type, branch path, evidence
- All participants receive `tree_reset` SSE event

**Tasks:**
- T01: Add `status: active | closed | suspended | deleted` to `WhyNode`
- T02: Write `backend/agent/tree_navigation.py` with `soft_reset(tree, path)` and `hard_reset(tree, path)`
- T03: Write `POST .../tree/reset` with `require_driver` dependency
- T04: Publish `tree_reset` SSE event; log audit entry

**Status (2026-07-11):** Backend slice done (ADR-015), built together with US-23. T01 was
already satisfied by ADR-013's `WhyNode.status` field. T02/T03/T04 complete — reset never
removes `WhyNode` entries (tombstones via `status`, since the state reducer would resurrect
dropped nodes on the next merge — see ADR-015); audit log lives in a new Postgres `audit_log`
table, not LangGraph state. Web/Android UI not started.

**Tests:**
```python
def test_soft_reset_suspends_children_not_siblings():
    tree = build_test_tree(["1", "1.1", "1.1.1", "1.2"])
    result = soft_reset(tree, "1.1")
    assert result["1.1"]["status"] == "active"
    assert result["1.1.1"]["status"] == "suspended"
    assert result["1.2"]["status"] == "active"

def test_hard_reset_deletes_children():
    tree = build_test_tree(["1", "1.1", "1.1.1"])
    result = hard_reset(tree, "1.1")
    assert "1.1.1" not in result
```

---

### US-26 — Field sync conflict flags affected branches

**As a** session driver, **I want** to be notified when a synced field result conflicts with an already-closed branch, **so that** I can decide whether to reopen it.

**Acceptance criteria:**
- Conflict detected when synced Gemba result's branch is already closed
- `conflict_flagged` SSE event sent; driver receives in-app notification
- Driver can: accept existing conclusion (log as note) or initiate soft/hard reset
- Conflict stored in DB for audit trail

**Tasks:**
- T01: Write `detect_conflict(gemba_result, why_nodes) -> bool`
- T02: On `GembaSyncWorker` completion: flag conflicts instead of applying directly
- T03: Write `POST .../conflicts/{id}/resolve` accepting `action: accept | reset`
- T04: Write React `ConflictResolutionPanel`

**Tests:**
```python
def test_detect_conflict_when_branch_closed():
    nodes = [make_why_node(branch_path="1.1", gemba_result="OK")]
    assert detect_conflict({"branch_path": "1.1", "result": "NOK"}, nodes) is True

def test_no_conflict_when_branch_pending():
    nodes = [make_why_node(branch_path="1.1", gemba_result="pending")]
    assert detect_conflict({"branch_path": "1.1", "result": "NOK"}, nodes) is False
```

**Status (2026-07-11):** Backend slice done (ADR-017). T02's `GembaSyncWorker`
is Android-side with no backend hook, so detection was wired into the one
existing write path instead — `FiveWhysAgent.submit_gemba` now runs
`detect_conflict` before applying a result and returns a conflict payload
instead of mutating the tree; `api/gemba.py` persists the new `conflicts`
table row and publishes `conflict_flagged`. T03's resolve route
(`api/conflicts.py`) is driver-gated and reuses `reset_tree` for the reset
action. T04 (React `ConflictResolutionPanel`) not started — this closes out
SP06/E04's backend slice.

---

## SP15 Stories — SSE Real-Time Web

### US-27 — SSE stream delivers investigation updates to web clients

**As a** web user, **I want** the investigation screen to update automatically when collaborators act, **so that** I see the investigation advance without refreshing.

**Acceptance criteria:**
- `GET .../investigations/{iid}/stream` returns `text/event-stream`
- Events delivered within 3 seconds of agent publishing to Pub/Sub
- Non-members receive 403 on stream endpoint
- Browser `EventSource` reconnects automatically on drop

**Tasks:**
- T01: Write `backend/core/pubsub.py` with `RedisPubSub.publish()` and `subscribe()`
- T02: Write SSE stream endpoint using `StreamingResponse` with `X-Accel-Buffering: no`
- T03: Publish state event after each graph node in `_format_result()`
- T04: Write `useInvestigationStream` React hook updating TanStack Query cache on each event

**Status (2026-07-11):** Backend slice done (ADR-014), pulled forward ahead of US-22/23-26
since presence (US-22) needed this transport. T01/T02 complete, route includes `project_id`
(`.../projects/{pid}/investigations/{iid}/stream`, not the literal path above — matches
every other route's project-scoped pattern, see ADR-014). T03 done via `graph.astream`
per-node publishing (not `_format_result()`, which doesn't exist — see ADR-014). T04
(React hook) not started.

---

## SP16 Stories — Android Polling + Concurrency

### US-28 — Android polls investigation state every 3 seconds when online

**As an** operator, **I want** the Android investigation screen to refresh every 3 seconds, **so that** I see updated assignments and progress.

**Acceptance criteria:**
- Online: polls `GET .../investigations/{iid}` every 3 seconds
- Offline: polling suspended, no wasted requests
- New Gemba assignment in poll response makes GembaCheckScreen accessible
- Polling stops when user navigates away

**Tasks:**
- T01: Write `startPolling()` in `InvestigationViewModel` using `delay(3_000)` coroutine loop
- T02: Cancel polling job in `onCleared()`
- T03: Suspend polling when `network.isUsable()` returns false

---

### US-29 — Five concurrent investigations complete without state collision

**As a** developer, **I want** to verify that 5 simultaneous investigations in different projects do not interfere, **so that** multi-team concurrent use is production-safe.

**Acceptance criteria:**
- 5 investigations started simultaneously all reach `status: complete` independently
- No Redis key collision (all `project_id:investigation_id` combinations unique)
- SSE events for one investigation do not appear in another's stream
- No asyncio task leaks

**Tasks:**
- T01: Write `test_concurrency.py` starting 5 investigations via `asyncio.gather`
- T02: Assert distinct thread IDs and independent completion states
- T03: Assert SSE stream isolation between investigations
- T04: Run with `pytest --timeout=60`

**Tests:**
```python
@pytest.mark.asyncio
async def test_five_concurrent_investigations_all_complete(async_client, mock_agent):
    results = await asyncio.gather(*[
        async_client.post("/api/v1/investigations", json={
            "project_id": f"proj-{i:03d}", "investigation_id": f"inv-{i:03d}",
            "phenomenon": f"Phenomenon {i}", "domain": "manufacturing", "max_depth": 2,
        }) for i in range(5)
    ])
    assert all(r.status_code in (200, 202) for r in results)
    thread_ids = [f"proj-{i:03d}:inv-{i:03d}" for i in range(5)]
    assert len(set(thread_ids)) == 5
```
