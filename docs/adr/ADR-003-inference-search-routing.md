# ADR-003 — Auto-Mode Inference and Search Routing

**Status:** Accepted  
**Date:** 2026-07-04  
**Refs:** [Product Brief](../product-brief.md), [ADR-007](ADR-007-state-interchange-format.md)

---

## Context

Rhizolve operates across two connectivity environments:

1. **Web app (desk):** Always online. OpenRouter API and Serper available at all times.
2. **Android app (field):** Variable connectivity. Factory floors and remote sites frequently have weak or no signal.

An earlier design made Android a thin client that delegated all graph execution to the server. This was revised: the Android app is self-contained, running the Koog graph on device in all connectivity states. What changes by signal quality is only the inference provider and search tools underneath Koog.

Cactus is not loaded unless APIs are unavailable — it is the fallback, not the default.

---

## Decision

### Three Operating Modes (Android Only)

```
STRONG / MODERATE signal (>150Kbps, internet available)
    Koog graph:    running on device
    Inference:     OpenRouter API (claude-3.5-haiku or equivalent)
    Search:        Serper (all 4 tools on STRONG; failure modes + wiki on MODERATE)
    Collaboration: Backend SSE for real-time updates
    Cactus:        NOT loaded

WEAK signal (<150Kbps)
    Koog graph:    running on device
    Inference:     OpenRouter API with 8s timeout → Cactus fallback on failure
    Search:        Wikipedia only
    Collaboration: None (no SSE)
    Cactus:        Downloaded and ready; used only on API failure

NONE signal
    Koog graph:    running on device
    Inference:     Cactus (qwen3-0.6, LOCAL mode)
    Search:        Wikipedia only
    Collaboration: None
    Cactus:        Active
```

### Web App (Always Online)

The browser never calls OpenRouter directly. All inference runs server-side: the React client calls the FastAPI backend, LangGraph runs the graph, and LangGraph calls OpenRouter. No Cactus, no fallback, no on-device model — the web client is a thin presentation layer over the server graph. If OpenRouter is unavailable the backend surfaces an error to the client; web users are at a desk on reliable connectivity, so no offline path is needed.

This is the key asymmetry between platforms:

| | Graph runs | Inference caller | Offline path |
|---|---|---|---|
| **Web** | Server (LangGraph) | Backend → OpenRouter | None |
| **Android** | Device (Koog) | Koog → OpenRouter or Cactus | Cactus on device |

The routing logic below (`RhizolveInferenceRouter`, `NetworkMonitor`) is **Android-only**. The web client has no routing decision to make — it always talks to the backend.

### Inference Router (Kotlin)

```kotlin
class RhizolveInferenceRouter @Inject constructor(
    private val openRouter: OpenRouterClient,
    private val cactusLM: CactusLM,
    private val network: NetworkMonitor,
) {
    suspend fun complete(messages: List<ChatMessage>, maxTokens: Int = 500): String =
        when (network.quality()) {
            STRONG, MODERATE -> runCatching {
                openRouter.complete(messages, model = "anthropic/claude-3.5-haiku",
                                    maxTokens = maxTokens)
            }.getOrElse { cactusInference(messages, maxTokens) }
            WEAK, NONE -> cactusInference(messages, maxTokens)
        }

    private suspend fun cactusInference(messages: List<ChatMessage>, maxTokens: Int): String {
        cactusLM.downloadModel("qwen3-0.6")  // no-op if cached
        return cactusLM.generateCompletion(
            messages = messages,
            params = CactusCompletionParams(mode = InferenceMode.LOCAL, maxTokens = maxTokens)
        )?.response ?: error("On-device inference failed")
    }
}
```

### Search Router (Kotlin)

```kotlin
class RhizolveSearchRouter {
    fun availableTools(quality: NetworkQuality): List<KoogTool> = when (quality) {
        STRONG   -> listOf(searchFailureModes, searchRecentFailures,
                           searchEngineeringPapers, lookupWikipedia)
        MODERATE -> listOf(searchFailureModes, lookupWikipedia)
        WEAK,
        NONE     -> listOf(lookupWikipedia)
    }
}
```

### Network Quality Classification

```kotlin
enum class NetworkQuality { STRONG, MODERATE, WEAK, NONE }

class NetworkMonitor(context: Context) {
    fun quality(): NetworkQuality {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val cap = cm.getNetworkCapabilities(cm.activeNetwork)
            ?: return NetworkQuality.NONE
        return when {
            !cap.hasCapability(NET_CAPABILITY_INTERNET) -> NetworkQuality.NONE
            cap.linkDownstreamBandwidthKbps < 150       -> NetworkQuality.WEAK
            cap.linkDownstreamBandwidthKbps < 1000      -> NetworkQuality.MODERATE
            else                                         -> NetworkQuality.STRONG
        }
    }
    fun isUsable() = quality() in setOf(STRONG, MODERATE)
}
```

### Signal Transition During Collaboration

When signal drops during a collaborative session (multiple users active):

**Solo investigation:** Silent transition to lower mode. Connectivity indicator updates. No prompt.

**Collaborative investigation:** Modal prompt with two choices:

- **Submit Gemba only** — app drops to minimal mode, only current Gemba check available, server continues with other collaborators, result syncs on reconnect
- **Go fully offline** — user detaches from collaboration session, other participants notified, Koog continues full investigation on device, state syncs and reconciles on reconnect using soft/hard reset model (see ADR-006)

### Cactus Model

**Model selection is pending SP-08 verification, not a settled default.** The names below (`qwen3-0.6`, `lfm2-1.2b`) reflect what was current at time of writing this ADR — Cactus's supported model list and the broader small-model landscape move quickly enough that either name could be stale by the time SP-08 runs. SP-08 must re-verify against Cactus's current documentation before committing to a model, and this section should be updated with the SP-08 outcome rather than treated as pre-decided.

Working assumption pending that verification: `qwen3-0.6` (~400MB) as the default; `lfm2-1.2b` (~700MB) as an upgrade path for devices with >4GB RAM. Downloaded proactively on first app launch via WorkManager with `NetworkType.CONNECTED` constraint. Stored in app-private storage. Subsequent launches check presence — no re-download if cached.

### UI Indicator

```kotlin
sealed class ConnectivityMode {
    object Cloud    : ConnectivityMode()   // ☁ Cloud
    object Hybrid   : ConnectivityMode()   // ⚡ Hybrid
    object OnDevice : ConnectivityMode()   // 📱 On-device
    object Offline  : ConnectivityMode()   // ○ Offline
}
```

Shown persistently in Android status bar. User never configures routing — indicator is informational only.

---

## Consequences

**Positive:**
- Koog always runs — no architectural difference between online and offline states, only the provider changes
- Cactus loaded only when needed — no unnecessary memory consumption on good connections
- Silent fallback on API failure means investigation never stops due to transient API errors
- Search tool reduction on poor signal is automatic — operators never configure this
- Full feature parity between strong-signal Android and web app

**Negative:**
- Cactus model download (~400MB) on first launch — must be communicated to user with progress indicator
- Hypothesis quality on NONE is lower than cloud — inherent limitation of smaller models
- `search_recent_failures` and `search_engineering_papers` unavailable offline — `why_generator` prompt must acknowledge this gracefully

---

## Alternatives Considered

**Thin client on strong signal, Koog only on weak:** Android delegates to server on strong signal. Rejected — creates two different architectures within the same app, complicates state management, and means collaboration features require a different code path.

**Always Cactus, use OpenRouter as enhancement:** Cactus runs always, OpenRouter augments when available. Rejected — cloud models produce significantly better hypotheses; defaulting to on-device degrades quality unnecessarily when APIs are available.

**Manual mode switch:** User configures cloud vs local. Rejected — operators on factory floor should not manage connectivity settings. Automatic routing removes a failure point.
