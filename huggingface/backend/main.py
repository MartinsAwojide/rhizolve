"""gr.Server bootstrap for the Hugging Face Spaces public POC deployment.

Mirrors backend/api/main.py's router list and lifespan (see ADR-022) but
uses gr.Server instead of a plain FastAPI() instance. The main app
(backend/api/main.py) is NOT migrated to gr.Server and is unaffected by
this file.

`agent/`, `api/`, `core/`, `models/` are copied in alongside this file by
.github/workflows/deploy-hf-poc.yml before deploy (never committed here —
see .gitignore) and by scripts/hf-poc-assemble.sh for local builds, so the
imports below resolve identically to how backend/api/main.py's do.

gr.Server API verified against gradio.app/guides/server-mode and
huggingface.co/blog/introducing-gradio-server on 2026-07-12 (published
2026-04, after most training data — re-verify against the installed
gradio version's current docs before changing this file).
"""

from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from gradio import Server
from redis.exceptions import RedisError

from agent.five_whys_agent import FiveWhysAgent
from api.auth import router as auth_router
from api.chat import router as chat_router
from api.conflicts import router as conflicts_router
from api.dashboard import router as dashboard_router
from api.five_whys_advance import router as five_whys_advance_router
from api.gemba import router as gemba_router
from api.invites import router as invites_router
from api.investigations import router as investigations_router
from api.organisations import router as organisations_router
from api.presence import router as presence_router
from api.project_members import router as project_members_router
from api.projects import router as projects_router
from api.projects_crud import router as projects_crud_router
from api.quorum import router as quorum_router
from api.stream import router as stream_router
from api.tree_navigation import router as tree_navigation_router
from api.users import router as users_router
from api.why_tree import router as why_tree_router
from core.config import REDIS_URL
from core.db import make_engine, make_sessionmaker
from core.memory import make_checkpointer
from core.presence import PresenceTracker
from core.pubsub import RedisPubSub
from core.ready import ReadyTracker
from core.storage import LocalAttachmentStorage

FRONTEND_DIST = "frontend/dist"


@asynccontextmanager
async def lifespan(app: Server):
    app.state.redis = redis.from_url(REDIS_URL)
    app.state.pubsub = RedisPubSub(app.state.redis)
    app.state.presence = PresenceTracker(app.state.redis)
    app.state.ready = ReadyTracker(app.state.redis)
    app.state.db_engine = make_engine()
    app.state.db_sessionmaker = make_sessionmaker(app.state.db_engine)
    checkpointer, checkpointer_ctx = await make_checkpointer()
    app.state.five_whys_agent = FiveWhysAgent(
        checkpointer,
        pubsub=app.state.pubsub,
        db_sessionmaker=app.state.db_sessionmaker,
    )
    app.state.attachment_storage = LocalAttachmentStorage()
    yield
    await app.state.db_engine.dispose()
    await checkpointer_ctx.__aexit__(None, None, None)
    await app.state.redis.aclose()


app = Server(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api/v1")
app.include_router(investigations_router, prefix="/api/v1/investigations")
app.include_router(projects_router, prefix="/api/v1/projects")
app.include_router(projects_crud_router, prefix="/api/v1/projects")
app.include_router(project_members_router, prefix="/api/v1/projects")
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(users_router, prefix="/api/v1/users")
app.include_router(organisations_router, prefix="/api/v1/organisations")
app.include_router(invites_router, prefix="/api/v1/invites")
app.include_router(gemba_router, prefix="/api/v1/projects")
app.include_router(stream_router, prefix="/api/v1/projects")
app.include_router(presence_router, prefix="/api/v1/projects")
app.include_router(tree_navigation_router, prefix="/api/v1/projects")
app.include_router(quorum_router, prefix="/api/v1/projects")
app.include_router(five_whys_advance_router, prefix="/api/v1/projects")
app.include_router(conflicts_router, prefix="/api/v1/projects")
app.include_router(dashboard_router, prefix="/api/v1/dashboard")
app.include_router(why_tree_router, prefix="/api/v1/projects")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    try:
        await app.state.redis.ping()
        redis_status = "connected"
    except RedisError:
        redis_status = "unreachable"
    return {"status": "ok", "redis": redis_status}


# React static build + SPA fallback. Registered after the API routes above
# so app.include_router()'d routes take priority, matching gr.Server's
# documented "your custom routes take priority over Gradio's default
# routes" behavior.
app.mount("/assets", StaticFiles(directory=f"{FRONTEND_DIST}/assets"), name="assets")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str) -> FileResponse:
    return FileResponse(f"{FRONTEND_DIST}/index.html")
