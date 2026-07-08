from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.exceptions import RedisError

from api.chat import router as chat_router
from core.config import REDIS_URL


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = redis.from_url(REDIS_URL)
    yield
    await app.state.redis.aclose()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    try:
        await app.state.redis.ping()
        redis_status = "connected"
    except RedisError:
        redis_status = "unreachable"
    return {"status": "ok", "redis": redis_status}
