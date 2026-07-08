# ADR-005 — `AsyncRedisStore` for Cross-Thread Memory and RAG

**Status:** Accepted  
**Date:** 2026-07-04  
**Refs:** [Product Brief](../product-brief.md), [ADR-002](ADR-002-redis-checkpointer.md), [ADR-004](ADR-004-redis-namespacing.md)

---

## Context

`AsyncRedisStore` (from `langgraph-checkpoint-redis`) provides a key-value store with optional vector search on the same Redis instance as `AsyncRedisSaver`. It has two distinct use cases in Rhizolve:

**1. Conversational memory (E02):** The chat agent maintains context across sessions per user. As conversation history grows, the agent compacts it automatically to stay within context window limits. This is cross-session, per-user memory — not per-investigation.

**2. Institutional memory / RAG (E09):** Completed investigations are indexed as vector embeddings. New investigations search past root causes and countermeasures before hypothesis generation. This is cross-project, visibility-scoped knowledge.

Both use cases run on the same Redis instance under separate namespaces, sharing the infrastructure already required by `AsyncRedisSaver`.

---

## Decision

### Namespace Structure

```python
# Conversational memory — per user, cross-session
("memory", user_id)                         # e.g. ("memory", "usr-abc123")

# Investigation RAG — per project, team, or org depending on visibility
("investigations", project_id)              # PRIVATE
("investigations", team_id)                 # TEAM
("investigations", org_id)                  # ORG
```

### Conversational Memory

```python
# backend/agent/memory.py

class UserMemory:
    def __init__(self, store: AsyncRedisStore, user_id: str):
        self.store = store
        self.namespace = ("memory", user_id)
        self.user_id = user_id

    async def load(self) -> dict:
        result = await self.store.aget(self.namespace, "profile")
        return result.value if result else {}

    async def save(self, memory: dict) -> None:
        await self.store.aput(self.namespace, "profile", memory)

    async def compact(self, conversation_history: list[dict], llm) -> None:
        """Progressive compaction — triggered automatically at 80% context window."""
        if self._token_count(conversation_history) < self.COMPACTION_THRESHOLD:
            return
        summary = await llm.ainvoke([
            SystemMessage(content="Summarise this conversation history, preserving: "
                         "domain expertise signals, preferences, recurring problem patterns, "
                         "and past investigation summaries. Discard: pleasantries, "
                         "repeated explanations, and resolved ambiguities."),
            HumanMessage(content=json.dumps(conversation_history)),
        ])
        await self.save({"compacted_memory": summary.content,
                         "compacted_at": datetime.utcnow().isoformat()})
```

**Compaction triggers:**
- Context window at 80% capacity
- Conversation exceeds configurable token threshold
- Investigation completed (natural compaction point)

**`/btw` exchanges:** Marked `ephemeral: True`. Compacted at 2× normal rate. Excluded from long-term memory profile.

### Investigation RAG

```python
# backend/core/rag.py

async def index_investigation(
    store: AsyncRedisStore,
    investigation_id: str,
    project: Project,
    why_nodes: list[WhyNode],
    maturity_level: int,
) -> None:
    """Index confirmed root causes on investigation completion. Runs as BackgroundTask."""
    namespaces = rag_namespaces(project, org_id=project.org_id, team_id=project.team_id)
    root_causes = [n for n in why_nodes if n["is_root_cause"]]
    for node in root_causes:
        key = f"{investigation_id}:{node['branch_path']}"
        value = {
            "phenomenon": project.phenomenon,
            "domain": project.domain,
            "maturity_level": maturity_level,
            "root_cause": node["hypothesis"],
            "countermeasure": node["countermeasure"],
            "gemba_notes": node["gemba_notes"],
            "investigation_id": investigation_id,
            "completed_at": datetime.utcnow().isoformat(),
            "text": (f"{project.phenomenon}. Root cause: {node['hypothesis']}. "
                     f"Countermeasure: {node['countermeasure']}"),
        }
        for namespace in namespaces:
            await store.aput(namespace, key, value)


async def search_past_investigations(
    store: AsyncRedisStore,
    phenomenon: str,
    domain: str,
    maturity_level: int,
    namespaces: list[tuple],
    limit: int = 3,
    threshold: float = 0.75,
) -> list[PastMatch]:
    """Search institutional memory. Same-maturity matches are boosted.

    Boosted score is clamped to [0.0, 1.0] — a cosine similarity score should
    never leave that range regardless of any multiplicative boost applied to it,
    since `score` is treated elsewhere (Pydantic Field constraints, potential
    future UI display as a percentage) as a normalised similarity value.
    """
    results = []
    for namespace in namespaces:
        hits = await store.asearch(namespace, query=phenomenon, limit=limit * 2)
        for hit in hits:
            if hit.score < threshold:
                continue
            boosted = hit.score * (1.1 if hit.value.get("maturity_level") == maturity_level else 1.0)
            score = min(boosted, 1.0)
            results.append(PastMatch(score=score, **hit.value))
    return sorted(results, key=lambda x: x.score, reverse=True)[:limit]
```

`PastMatch.score` is typed `Field(ge=0.0, le=1.0)`, consistent with `RootCauseDecision.confidence` elsewhere in the codebase — the clamp above is what makes that constraint safe to apply here without a validation error on boosted matches.

### Store Configuration

```python
# backend/core/memory.py

async def make_store(redis_url: str) -> tuple[AsyncRedisStore, any]:
    ctx = AsyncRedisStore.from_conn_string(
        redis_url,
        store_prefix="rhizolve_store",
        index={
            "dims": 1536,             # text-embedding-3-small
            "embed": openai_embeddings,
            "distanceType": "cosine",
            "fields": ["text"],
        },
    )
    store = await ctx.__aenter__()
    await store.setup()
    return store, ctx
```

---

## Consequences

**Positive:**
- Same Redis instance for checkpoints, memory, and RAG — no additional infrastructure
- Progressive compaction means memory never bloats but nothing is lost
- Vector search is bundled in Redis 8.0 (RediSearch) — no separate vector DB
- Maturity-level boosting makes RAG results relevant to process sophistication
- Background indexing (FastAPI `BackgroundTasks`) keeps report generation fast

**Negative:**
- Embedding cost per completed investigation (mitigated by `text-embedding-3-small` pricing)
- Vector index cold-start — no past investigations to search on first deployment
- Compaction threshold needs tuning per user conversation style
- Cross-project RAG requires careful visibility enforcement — a PRIVATE project's root causes must never appear in another project's search

---

## Embedding Provider (SP-16 — pending)

**The `text-embedding-3-small` choice above is provisional, not settled.** It is what was used to write the working code examples in this ADR because it needed a concrete value to illustrate the store configuration — it is not a researched decision the way the rest of this ADR's choices are.

Two open questions SP-16 must resolve:

**1. Provider for server-side embedding.** OpenAI `text-embedding-3-small` is one option. Given the rest of the stack already depends on OpenRouter for chat completions, does OpenRouter also expose an embeddings endpoint suitable for this use case, avoiding a second LLM vendor dependency? This needs verifying directly against OpenRouter's current API surface — it should not be assumed either way.

**2. Whether Android needs on-device RAG at all — and if so, what embeds it.** Institutional memory search (`search_past_investigations`) currently only exists in the server-side `why_generator` path. But per ADR-003, Koog runs the equivalent graph on Android in all three connectivity modes, including fully offline. As written, an offline Android investigation has zero access to institutional memory — no past-investigation matches surface, regardless of how much history the org has accumulated. This is an unaddressed asymmetry between the two platforms, not a deliberate simplification.

SP-16 must decide between:

- **(a) RAG stays server-only, connectivity-gated** — consistent with how search tools already degrade in ADR-003 (STRONG=4 tools, NONE=Wikipedia only). Institutional memory becomes unavailable exactly when signal is unusable, the same as the other three search tools. Simplest; no new on-device dependency; but the field operator — the persona this product cares most about per the Hill — loses institutional memory precisely when working alone in the field, which may be the moment it matters most.
- **(b) Ship on-device embeddings for a synced subset of institutional memory** — using Liquid AI's `LFM2.5-Embedding-350M` (350M params, GGUF/llama.cpp, day-one Android support via Liquid's LEAP edge platform, released June 2026). This would require: a sync mechanism pulling a relevant subset of the org's `AsyncRedisStore` entries down to Android's Room DB, a local vector index (or brute-force cosine similarity given realistic per-org data volumes), and re-embedding at the same dimensionality the server uses, or a translation layer between the two embedding spaces — server and on-device embeddings from different models are not directly comparable, a real complexity, not a footnote.

**SP-16 time-box:** 2 days. Output: provider decision for (1), and an explicit accept/reject decision for (2) with a documented reason — not a deferral. If (2) is rejected, the ADR-003 search-tool-degradation pattern is extended explicitly to cover institutional memory so the gap is a stated design decision rather than an oversight.

---

## Similarity Threshold Calibration (SP-12)

The default threshold of 0.75 is tuned via SP-12 (2-day spike) using real investigation data from the pilot. The spike runs blind evaluation: three domain experts rate top-3 results for 10 queries as relevant or irrelevant. Threshold is set to maximise precision at ≥ 2/3 relevant results.

---

## Alternatives Considered

**Separate vector database (Pinecone, Weaviate, pgvector):** Richer filtering and better scaling. Adds a third infrastructure dependency. Rejected for current phase — Redis vector search is sufficient for expected investigation volume. Revisit at scale.

**In-memory embedding store:** Does not survive restarts, cannot be shared across workers. Rejected.

**Decay-based memory:** Older conversations have less influence over time. Rejected — progressive compaction preserves meaning without forgetting. Decay-based systems lose context users expect to be remembered.
