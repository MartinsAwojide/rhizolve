import uuid

import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer
from core.storage import LocalAttachmentStorage
from models.project_member import Role


async def _pinned_why_generator(state):
    return {
        "pending_hypotheses": [
            {
                "hypothesis": "seal wear on the fill valve",
                "branch_path": f"{state['current_branch_path']}.h1",
                "depth": state["current_depth"],
                "gemba_instructions": "inspect fill valve seal",
            }
        ]
    }


async def _pinned_root_cause_validator(state):
    active = state.get("active_hypothesis")
    if active is None:
        return {}
    why_node = next(
        n for n in state["why_nodes"] if n["branch_path"] == active["branch_path"]
    )
    return {
        "why_nodes": [{**why_node, "is_root_cause": False}],
        "current_depth": why_node["depth"],
        "current_branch_path": why_node["branch_path"],
    }


async def _give_owner_org(authed_client, monkeypatch, clerk_org_id: str) -> None:
    clerk_user_id = authed_client.current_user["clerk_user_id"]

    async def _payload(request):
        return {
            "sub": clerk_user_id,
            "email": f"{clerk_user_id}@test.com",
            "org_id": clerk_org_id,
            "org_slug": clerk_org_id,
        }

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    r = await authed_client.post("/api/v1/auth/sync")
    authed_client.current_user = r.json()


@pytest.fixture
async def gemba_env(monkeypatch, tmp_path):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    monkeypatch.setattr(
        "agent.graph.root_cause_validator", _pinned_root_cause_validator
    )
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    original_storage = app.state.attachment_storage
    agent = FiveWhysAgent(checkpointer)
    app.state.five_whys_agent = agent
    app.state.attachment_storage = LocalAttachmentStorage(base_dir=str(tmp_path))
    try:
        yield agent
    finally:
        app.state.five_whys_agent = original_agent
        app.state.attachment_storage = original_storage
        await ctx.__aexit__(None, None, None)


async def _start_investigation(agent, project_id: str) -> str:
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id=project_id,
    )
    return started["investigation_id"]


async def _create_project(authed_client) -> str:
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    return r.json()["id"]


@pytest.mark.asyncio
async def test_audio_attachment_accepts_client_side_transcription(
    authed_client, gemba_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(gemba_env, project_id)

    r = await authed_client.post(
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/gemba",
        data={
            "result": "NOK",
            "notes": "seal cracked",
            "transcriptions": ["Spring visibly cracked"],
            "transcription_statuses": ["complete"],
        },
        files=[("files", ("audio.m4a", b"fake-audio-bytes", "audio/m4a"))],
    )
    assert r.status_code == 200
    body = r.json()
    assert body["attachments"][0]["transcription"] == "Spring visibly cracked"
    assert body["attachments"][0]["transcription_status"] == "complete"
    assert body["attachments"][0]["type"] == "audio"


@pytest.mark.asyncio
async def test_pending_transcription_does_not_block_upload(authed_client, gemba_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(gemba_env, project_id)

    r = await authed_client.post(
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/gemba",
        data={
            "result": "NOK",
            "notes": "seal cracked",
            "transcription_statuses": ["pending"],
        },
        files=[("files", ("audio.m4a", b"fake-audio-bytes", "audio/m4a"))],
    )
    assert r.status_code == 200
    assert r.json()["attachments"][0]["transcription_status"] == "pending"


@pytest.mark.asyncio
async def test_image_attachment_has_no_transcription_status_forced(
    authed_client, gemba_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(gemba_env, project_id)

    r = await authed_client.post(
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/gemba",
        data={"result": "OK", "notes": "looks fine"},
        files=[("files", ("photo.jpg", b"fake-image-bytes", "image/jpeg"))],
    )
    assert r.status_code == 200
    attachment = r.json()["attachments"][0]
    assert attachment["type"] == "image"
    assert "transcription_status" not in attachment


@pytest.mark.asyncio
async def test_gemba_endpoint_wrong_role_403(
    authed_client, async_client, monkeypatch, add_project_member, gemba_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(gemba_env, project_id)

    await add_project_member(async_client, monkeypatch, project_id, Role.VIEWER)

    r = await async_client.post(
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/gemba",
        data={"result": "OK", "notes": ""},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_gemba_endpoint_external_operator_allowed(
    authed_client, async_client, monkeypatch, add_project_member, gemba_env
):
    await _give_owner_org(authed_client, monkeypatch, f"clerk_org_{uuid.uuid4()}")
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(gemba_env, project_id)

    await add_project_member(
        async_client,
        monkeypatch,
        project_id,
        Role.OPERATOR,
        clerk_org_id=f"clerk_org_{uuid.uuid4()}",
    )

    r = await async_client.post(
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/gemba",
        data={"result": "OK", "notes": "fine"},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_attachment_persists_on_why_node(authed_client, gemba_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(gemba_env, project_id)

    await authed_client.post(
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/gemba",
        data={"result": "NOK", "notes": "seal cracked"},
        files=[("files", ("audio.m4a", b"fake-audio-bytes", "audio/m4a"))],
    )

    config = await gemba_env._config(investigation_id)
    snapshot = await gemba_env.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert len(node["attachments"]) == 1
    assert node["attachments"][0]["filename"] == "audio.m4a"


@pytest.mark.asyncio
async def test_get_attachment_returns_uploaded_content(authed_client, gemba_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(gemba_env, project_id)

    r = await authed_client.post(
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/gemba",
        data={"result": "OK", "notes": "fine"},
        files=[("files", ("photo.jpg", b"fake-image-bytes", "image/jpeg"))],
    )
    url = r.json()["attachments"][0]["url"]

    r2 = await authed_client.get(url)
    assert r2.status_code == 200
    assert r2.content == b"fake-image-bytes"
