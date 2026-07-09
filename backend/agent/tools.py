from typing import Any
from urllib.parse import quote

import aiohttp

from core.config import SERPER_API_KEY

_SERPER_URL = "https://google.serper.dev/search"
_WIKIPEDIA_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{query}"


async def _serper_search(query: str) -> list[dict[str, Any]]:
    async with aiohttp.ClientSession() as session:
        async with session.post(
            _SERPER_URL,
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query},
        ) as response:
            response.raise_for_status()
            data = await response.json()
    return [
        {
            "title": result.get("title", ""),
            "snippet": result.get("snippet", ""),
            "link": result.get("link", ""),
        }
        for result in data.get("organic", [])
    ]


async def search_failure_modes(query: str) -> list[dict[str, Any]]:
    return await _serper_search(f"{query} failure mode analysis")


async def search_recent_failures(query: str) -> list[dict[str, Any]]:
    return await _serper_search(f"{query} recent failure incident")


async def search_engineering_papers(query: str) -> list[dict[str, Any]]:
    return await _serper_search(f"{query} engineering paper root cause")


_WIKIPEDIA_USER_AGENT = "Rhizolve/0.1 (5 Whys root cause investigation platform)"


async def lookup_wikipedia(query: str) -> dict[str, Any]:
    url = _WIKIPEDIA_URL.format(query=quote(query))
    async with aiohttp.ClientSession() as session:
        async with session.get(
            url, headers={"User-Agent": _WIKIPEDIA_USER_AGENT}
        ) as response:
            if response.status == 404:
                return {"title": query, "extract": ""}
            response.raise_for_status()
            data = await response.json()
    return {"title": data.get("title", query), "extract": data.get("extract", "")}


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_failure_modes",
            "description": (
                "Search the web for known failure modes related to a "
                "component, process, or symptom."
            ),
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_recent_failures",
            "description": (
                "Search the web for recent, similar reported failures or incidents."
            ),
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_engineering_papers",
            "description": (
                "Search the web for engineering papers or technical "
                "references discussing root causes for a topic."
            ),
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_wikipedia",
            "description": "Look up a Wikipedia summary for background on a topic.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
]

TOOL_FUNCTIONS = {
    "search_failure_modes": search_failure_modes,
    "search_recent_failures": search_recent_failures,
    "search_engineering_papers": search_engineering_papers,
    "lookup_wikipedia": lookup_wikipedia,
}
