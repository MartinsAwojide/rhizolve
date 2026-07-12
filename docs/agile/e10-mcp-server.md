# E10 — Rhizolve MCP Server

**Epic statement:** Teams using Rhizolve need to expose its investigation capabilities as a callable MCP server so that any MCP-compatible client — Claude Desktop, Cursor, or any external AI agent — can initiate and participate in investigations without opening the Rhizolve web app.

**Sprint:** SP21  
**Refs:** [ADR-001](../adr/ADR-001-fastapi-gradio-server.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

All 14 Rhizolve tools callable from Claude Desktop via FastMCP 3.0 mounted on the existing FastAPI backend. No separate container required.

**14 Tools:**
1. `create_project`
2. `start_investigation`
3. `get_investigation_state`
4. `get_investigation_tree`
5. `inject_context`
6. `resume_hypothesis_review`
7. `submit_gemba`
8. `submit_validator_review`
9. `submit_countermeasure_review`
10. `assign_gemba`
11. `get_my_assignments`
12. `search_past_investigations`
13. `get_report`
14. `verify_report`

---

## Spike

*("SP-##" below is a spike ID, unrelated to the "SP##" sprint numbers in `docs/build-plan/sprint-map.md` — see AGENTS.md.)*

**SP-14 — FastMCP 3.0 OpenAPIProvider with Rhizolve FastAPI**  
Time-box: 2 days.  
Questions:
- `FastMCP.from_openapi()` is a deprecated FastMCP 2.x classmethod that breaks under `fastmcp>=3.0.0` (confirmed: `AttributeError: 'OpenAPITool' object has no attribute 'get'`, PrefectHQ/fastmcp upgrade guide, awslabs/mcp#2533). The current pattern is `OpenAPIProvider(...)` passed into `FastMCP(name, providers=[...])` — does this generate correct tool schemas from Rhizolve's routes the same way the old pattern was expected to?
- What is the correct 3.0 mechanism for route exclusion (health, auth, SSE streams) — a constructor argument on `OpenAPIProvider`, or a `Transform` applied after the provider is composed? Neither is confirmed in this doc.
- Does Streamable HTTP work with Claude Desktop as of today, and is `rhizolve_mcp.streamable_http_app()` still the correct method name to get a mountable ASGI app on the current release?
- Does mounting affect any existing route or middleware?

Output: Tool auto-generation confirmed or hand-written overrides identified. Exclusion mechanism confirmed. Transport confirmed. ADR-001 updated with verified mount code — replacing the illustrative-only snippet currently there.

Done when: Claude Desktop lists all 14 tools and one tool call returns a real result, using code confirmed against the actual installed `fastmcp` version — not the deprecated pattern.

---

## US-66 — FastMCP 3.0 mounted on FastAPI, all 14 tools callable

**As an** MCP client developer, **I want** all 14 Rhizolve tools available via FastMCP 3.0, **so that** any MCP client can drive investigations without the web app.

**Acceptance criteria:**
- `GET /mcp` returns MCP server manifest with 14 tools listed
- Each tool maps to the correct FastAPI endpoint with correct parameter schema
- Tools excluded: `/api/v1/health`, `/api/v1/auth/*`, all `/stream` endpoints
- Claude Desktop configured with `httpstream-url: http://localhost:7860/mcp` lists all 14 tools
- One complete investigation driven end-to-end from Claude Desktop via MCP tools
- **An external-scoped member calling `search_past_investigations`, `get_investigation_tree`, or any context-bearing tool via MCP receives the identical 403/redacted response as calling the equivalent REST endpoint — confirming scope enforcement is not bypassable through the MCP transport**

**Tasks:**
- T01: `uv add fastmcp` in `backend/`
- T02: Run SP-14 spike to confirm auto-generation approach
- T03: Add FastMCP mount to `backend/api/main.py` — using the current Provider-based pattern, not the deprecated `from_openapi()` classmethod:
  ```python
  from fastmcp import FastMCP
  from fastmcp.server.providers.openapi import OpenAPIProvider

  openapi_provider = OpenAPIProvider(
      openapi_spec=app.openapi(),
      client=httpx.AsyncClient(base_url="http://localhost:7860"),
  )
  rhizolve_mcp = FastMCP("rhizolve", providers=[openapi_provider])
  # Exclusion mechanism and mount method name are unconfirmed pending SP-14 —
  # this line is illustrative, not verified:
  app.mount("/mcp", rhizolve_mcp.streamable_http_app())
  ```
- T04: Write hand-crafted overrides for any tools where auto-generation produces incorrect schemas (per SP-14 output) — particularly `resume_hypothesis_review`, `submit_validator_review`, `submit_countermeasure_review` which have complex request bodies
- T05: Write Claude Desktop config in `docs/mcp-setup.md`:
  ```json
  {
    "mcpServers": {
      "rhizolve": {
        "transport": "httpstream",
        "httpstream-url": "http://localhost:7860/mcp"
      }
    }
  }
  ```
- T06: Update `infra/compose.yml` to confirm no separate `mcp-server` service needed

**Tests:**
```python
@pytest.mark.asyncio
async def test_mcp_server_lists_14_tools(async_client):
    r = await async_client.get("/mcp")
    # Parse MCP manifest and count tools
    tools = extract_tools_from_manifest(r.json())
    assert len(tools) == 14

@pytest.mark.asyncio
async def test_start_investigation_tool_callable(mcp_client):
    result = await mcp_client.call_tool("start_investigation", {
        "project_id": "proj-001", "investigation_id": "inv-001",
        "phenomenon": "Glue overflowed", "domain": "manufacturing",
    })
    assert "hypothesis_review" in result.content[0].text

@pytest.mark.asyncio
async def test_excluded_routes_not_in_tool_list(mcp_client):
    result = await mcp_client.list_tools()
    tool_names = [t.name for t in result.tools]
    assert "health" not in tool_names
    assert not any("stream" in name for name in tool_names)

@pytest.mark.asyncio
async def test_external_member_denied_context_via_mcp(mcp_client_as_external_viewer, project_id):
    """Scope enforcement must hold through the MCP transport, not just REST.

    Regression test for the case where a REST-only scope check could be
    bypassed by calling the same underlying route via an MCP tool.
    """
    result = await mcp_client_as_external_viewer.call_tool("search_past_investigations", {
        "phenomenon": "Sensor fault", "domain": "manufacturing", "project_id": project_id,
    })
    assert "403" in result.content[0].text or "cannot access" in result.content[0].text.lower()

@pytest.mark.asyncio
async def test_external_member_gets_redacted_tree_via_mcp(mcp_client_as_external_contributor, project_id, inv_id):
    result = await mcp_client_as_external_contributor.call_tool("get_investigation_tree", {
        "project_id": project_id, "investigation_id": inv_id,
    })
    payload = json.loads(result.content[0].text)
    assert "domain_context" not in payload
    assert "hypothesis" in payload["nodes"][0]  # structure still visible

@pytest.mark.asyncio
async def test_end_to_end_investigation_via_mcp(mcp_client):
    """Full investigation driven by MCP tool calls — no web app."""
    # Create project
    await mcp_client.call_tool("create_project", {"name": "MCP Test", "domain": "manufacturing"})

    # Start investigation
    state = await mcp_client.call_tool("start_investigation", {
        "project_id": "proj-mcp", "investigation_id": "inv-mcp",
        "phenomenon": "Sensor reading incorrect", "domain": "manufacturing",
    })
    assert "hypothesis_review" in state.content[0].text

    # Accept all hypotheses
    await mcp_client.call_tool("resume_hypothesis_review", {
        "project_id": "proj-mcp", "investigation_id": "inv-mcp",
        "accepted_hypothesis_ids": ["all"], "user_added": [],
    })

    # Submit Gemba
    state = await mcp_client.call_tool("submit_gemba", {
        "project_id": "proj-mcp", "investigation_id": "inv-mcp",
        "result": "ROOT_CAUSE", "notes": "Sensor calibration drift confirmed",
    })

    # Verify reaches countermeasure or complete
    assert any(s in state.content[0].text for s in ["countermeasure", "complete"])
```
