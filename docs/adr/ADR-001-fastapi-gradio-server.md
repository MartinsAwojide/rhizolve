# ADR-001 — FastAPI as Primary Server

**Status:** Accepted  
**Date:** 2026-07-04  
**Refs:** [Product Brief](../product-brief.md)

## Context

The original Rhizolve pilot used Gradio's native `gr.Blocks` with `ui.launch()` as both UI and server. This cannot expose clean REST endpoints for React or Android clients, and is incompatible with the chat-first architecture (E02) which requires a conversational API alongside investigation endpoints.

## Decision

FastAPI is the primary server. Gradio is mounted at `/gradio` via `gr.mount_gradio_app` for the pilot period only and retired at the end of E05.

```python
# backend/api/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    checkpointer, ctx = await make_checkpointer()
    store, store_ctx = await make_store(REDIS_URL)
    app.state.agent = FiveWhysAgent(checkpointer=checkpointer, store=store)
    await app.state.agent.setup()
    yield
    await ctx.__aexit__(None, None, None)
    await store_ctx.__aexit__(None, None, None)

app = FastAPI(lifespan=lifespan)
app.include_router(auth.router,           prefix="/api/v1")
app.include_router(projects.router,       prefix="/api/v1")
app.include_router(investigations.router, prefix="/api/v1")
app.include_router(gemba.router,          prefix="/api/v1")
app.include_router(context.router,        prefix="/api/v1")
app.include_router(chat.router,           prefix="/api/v1")
app.include_router(sync.router,           prefix="/api/v1")

# FastMCP 3.0 — MCP server mounted at /mcp (E10)
#
# `FastMCP.from_openapi()` is a deprecated FastMCP 2.x classmethod — it breaks
# under fastmcp>=3.0.0 (AttributeError: 'OpenAPITool' object has no attribute
# 'get'; see PrefectHQ/fastmcp upgrade guide and awslabs/mcp#2533 for real
# breakage reports). FastMCP 3.0 moved to an explicit Provider architecture.
from fastmcp.server.providers.openapi import OpenAPIProvider

openapi_provider = OpenAPIProvider(
    openapi_spec=app.openapi(),
    client=httpx.AsyncClient(base_url="http://localhost:7860"),
)
rhizolve_mcp = FastMCP("rhizolve", providers=[openapi_provider])

# Route exclusion (health/auth/stream endpoints) is likely a Transform in 3.0's
# architecture rather than a from_openapi() constructor kwarg — this is
# unconfirmed against the exact current release and is SP-14's job to verify,
# not something to treat as settled from this ADR alone.
app.mount("/mcp", rhizolve_mcp.streamable_http_app())  # mount method name also unverified — confirm in SP-14

# Pilot fallback — retired end of E05
app = gr.mount_gradio_app(app, gradio_ui, path="/gradio")

# React static build
app.mount("/", StaticFiles(directory="frontend/web/dist", html=True), name="static")
```

Serving hierarchy (port 7860, HF Spaces compatible):
```
FastAPI
├── /api/v1/*    → REST endpoints (React + Android)
├── /mcp         → FastMCP 3.0 MCP server (E10)
├── /gradio      → Gradio pilot fallback (retired end of E05)
└── /            → React static build
```

## Consequences

**Positive:** Single process, single port (HF Spaces compatible), OpenAPI docs auto-generated, clean REST surface for all clients, MCP server co-located without separate container.

**Negative:** `gr.mount_gradio_app` must be called before `StaticFiles` mount — ordering is significant.

**Retirement:** Remove `gr.mount_gradio_app` line and `ui/gradio_app.py` at end of E05. No other files change.

## Alternatives Considered

**Separate FastAPI + Gradio processes:** Two ports, incompatible with HF Spaces single-port constraint. Rejected.

**Separate MCP server container:** Adds infrastructure complexity with no benefit — FastMCP 3.0 `OpenAPIProvider` auto-generates tools from existing FastAPI routes. Rejected.
