from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.exceptions import RedisError

from agent.five_whys_agent import FiveWhysAgent
from api.auth import router as auth_router
from api.chat import router as chat_router
from api.gemba import router as gemba_router
from api.invites import router as invites_router
from api.investigations import router as investigations_router
from api.organisations import router as organisations_router
from api.presence import router as presence_router
from api.project_members import router as project_members_router
from api.projects import router as projects_router
from api.projects_crud import router as projects_crud_router
from api.stream import router as stream_router
from api.users import router as users_router
from core.config import REDIS_URL
from core.db import make_engine, make_sessionmaker
from core.memory import make_checkpointer
from core.presence import PresenceTracker
from core.pubsub import RedisPubSub
from core.storage import LocalAttachmentStorage


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = redis.from_url(REDIS_URL)
    app.state.pubsub = RedisPubSub(app.state.redis)
    app.state.presence = PresenceTracker(app.state.redis)
    checkpointer, checkpointer_ctx = await make_checkpointer()
    app.state.five_whys_agent = FiveWhysAgent(checkpointer, pubsub=app.state.pubsub)
    app.state.attachment_storage = LocalAttachmentStorage()
    app.state.db_engine = make_engine()
    app.state.db_sessionmaker = make_sessionmaker(app.state.db_engine)
    yield
    await app.state.db_engine.dispose()
    await checkpointer_ctx.__aexit__(None, None, None)
    await app.state.redis.aclose()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    try:
        await app.state.redis.ping()
        redis_status = "connected"
    except RedisError:
        redis_status = "unreachable"
    return {"status": "ok", "redis": redis_status}
