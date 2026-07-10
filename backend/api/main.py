from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.exceptions import RedisError

from agent.five_whys_agent import FiveWhysAgent
from api.auth import router as auth_router
from api.chat import router as chat_router
from api.investigations import router as investigations_router
from api.projects import router as projects_router
from api.users import router as users_router
from core.config import REDIS_URL
from core.db import make_engine, make_sessionmaker
from core.memory import make_checkpointer


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = redis.from_url(REDIS_URL)
    checkpointer, checkpointer_ctx = await make_checkpointer()
    app.state.five_whys_agent = FiveWhysAgent(checkpointer)
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
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(users_router, prefix="/api/v1/users")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    try:
        await app.state.redis.ping()
        redis_status = "connected"
    except RedisError:
        redis_status = "unreachable"
    return {"status": "ok", "redis": redis_status}
