# E06 — Android Client

**Epic statement:** Field operators and field analysts need a native Android application that works in field conditions so that they can participate in investigations from where the problem actually is.

**Sprints:** SP12 (project + graph), SP13 (full UI), SP14 (FCM + assignment + state sync)  
**Refs:** [ADR-003](../adr/ADR-003-inference-search-routing.md), [ADR-007](../adr/ADR-007-state-interchange-format.md), [Sprint Map](../build-plan/sprint-map.md)

---

## Done When

- Self-contained Android app runs Koog graph on device in all connectivity states
- Koog calls OpenRouter on good signal; falls back to Cactus on weak/no signal
- Full investigation completable offline; state syncs to backend on reconnect
- State interchange: Koog state uploadable to LangGraph; LangGraph state downloadable to Koog
- Full Compose UI matching DESIGN.md visual language
- FCM push notifications for Gemba assignments with deep link
- Voice input for phenomenon and Gemba notes
- Tested on API 30, 33, and 35 emulators

---

## Spikes

*("SP-##" below is a spike ID, unrelated to the "SP##" sprint numbers in `docs/build-plan/sprint-map.md` — see AGENTS.md.)*

**SP-09 — Koog HITL feature status**  
Time-box: 0.5 day. Check GitHub issue #2064. If shipped: use native HITL. If not: use `CompletableDeferred<GembaResponse>` workaround. Done when: HITL approach confirmed and documented.

**SP-10 — Koog Android APK size and compatibility**  
Time-box: 1 day. Measure APK size increase from adding Koog. Identify incompatible transitive dependencies on API 24+. Done when: App builds and runs with Koog added, no `NoSuchMethodError` at runtime.

---

## SP12 Stories — Project + Graph

### US-39 — Android project initialised with all dependencies

**As a** developer, **I want** the Android project set up with Koog, Cactus, Room, Hilt, and Retrofit, **so that** every subsequent story builds on a verified foundation.

**Acceptance criteria:**
- `./gradlew assembleDebug` succeeds on API 24+
- Cactus initialises without crash on Pixel 9 Pro AVD (API 35)
- Koog initialises; no dependency conflicts
- Room tables `investigations` and `pending_gemba` exist

**Tasks:**
- T01: Init project in `mobile/android/` with Kotlin 2.x, Jetpack Compose
- T02: Declare dependencies in `build.gradle.kts`: Cactus 1.4.1-beta, Koog 1.0.0, Moonshine Android (native, MIT `tiny` English model), Room 2.7.0, WorkManager 2.10.0, Retrofit 2.11.0, Hilt 2.52
- T03: Write `AppModule.kt` with Hilt providers
- T04: Write `RhizolveDatabase` with both tables

**Tests:**
```kotlin
@Test fun tablesExistOnInit() = runTest {
    val investigations = db.investigationDao().getAll()
    assertNotNull(investigations)
}
```

---

### US-40 — On-device Koog graph runs the full 5 Whys methodology

**As a** field analyst, **I want** the full investigation graph on my Android device, **so that** I can conduct complete root cause analysis without any server connection.

**Acceptance criteria:**
- Koog graph runs intake → report with all nine node equivalents
- HITL at `gembaCheck` node (native or `CompletableDeferred` workaround per SP-09)
- `FiveWhysState` saved to Room after each node
- NOK → goes deeper; OK → closes branch; max depth → countermeasure

**Tasks:**
- T01: Write `mobile/android/agent/FiveWhysGraph.kt` using Koog graph DSL
- T02: Implement HITL workaround if SP-09 confirms issue #2064 still open
- T03: Wire `RhizolveInferenceRouter` as LLM provider for all LLM nodes
- T04: Persist `FiveWhysState` to Room after each node completion

**Tests:**
```kotlin
@Test fun `graph pauses at gemba check`() = runTest {
    coEvery { inferenceRouter.complete(any(), any()) } returns mockHypothesisJson
    val job = launch { graph.run(mockState) }
    advanceUntilIdle()
    assertTrue(graph.isAwaitingGemba())
    job.cancel()
}
```

---

## SP13 Stories — Full UI

### US-41 — Full investigation UI in Jetpack Compose matching DESIGN.md

**As a** field analyst, **I want** the Android app to feel like the web app, **so that** switching platforms requires no relearning.

**Acceptance criteria:**
- Material 3 theme tokens match DESIGN.md colour and typography
- Chat-first: chat primary, why tree accessible via tab
- All interactive elements ≥ 48dp × 48dp
- Connectivity indicator visible in all states
- **`GembaCheckCard` result selection is three stacked full-width buttons (OK / NOK / Root cause), each ≥ 56dp tall with a plain-language subtitle** (SP-00b decision) — not a compact segmented control. Glove-tappable and outdoor-legible outweighs vertical density on the field surface.
- **Evidence capture (Voice / Photo / Type) is placed above the result selection** (SP-00b decision) — the operator records what they observed first, then chooses the result; ordering follows the physical workflow.
- Result buttons carry the Search Party node vocabulary from `DESIGN.md`: OK = hollow outline, NOK = solid coral, Root cause = green-plus outline — identical to the why-tree and fault-tree.

**Tasks:**
- T01: Configure Material 3 theme in `ui/theme/RhizolveTheme.kt` from DESIGN.md tokens (both `values/` and `values-night/`)
- T02: Write `ProjectListScreen`, `InvestigationScreen` with chat list and tab row
- T03: Write `HypothesisReviewCard`, `GembaCheckCard` (evidence-first, three stacked ≥56dp result buttons), `ValidatorReviewCard`, `CountermeasureReviewCard`
- T04: Write `WhyTreeDiagram` composable using `Canvas`
- T05: Write `ConnectivityIndicator` composable

**Tests:**
```kotlin
@Test fun `GembaCheckCard result buttons meet 56dp minimum`() {
    composeTestRule.setContent { GembaCheckCard(hypothesis = "X", instructions = "Y", onSubmit = {}) }
    listOf("OK", "NOK", "ROOT_CAUSE").forEach { label ->
        composeTestRule.onNodeWithText(label, substring = true)
            .assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(56.dp)
    }
}

@Test fun `evidence capture renders above result selection`() {
    composeTestRule.setContent { GembaCheckCard(hypothesis = "X", instructions = "Y", onSubmit = {}) }
    val evidenceTop = composeTestRule.onNodeWithText("Voice").fetchSemanticsNode().boundsInRoot.top
    val resultTop = composeTestRule.onNodeWithText("OK", substring = true).fetchSemanticsNode().boundsInRoot.top
    assertTrue(evidenceTop < resultTop)
}
```

---

### US-42 — Voice input for phenomenon and Gemba notes

**As an** operator, **I want** to dictate by voice, **so that** I can use the app hands-free while inspecting equipment.

**Tasks:**
- T01: Write `VoiceInputButton` composable using `SpeechRecognizer`
- T02: Handle `RECORD_AUDIO` permission with Accompanist `rememberPermissionState`
- T03: Add to phenomenon field and Gemba notes field

---

## SP14 Stories — FCM + Assignment + State Sync

### US-43 — FCM push notifies operator of assigned Gemba check

**As an** operator, **I want** push notifications for assigned Gemba checks, **so that** I am immediately aware without polling the app.

**Acceptance criteria:**
- `POST .../assign` sends FCM push to operator's registered device
- Notification deep-links to `GembaCheckScreen` for the assignment
- No device token: assignment succeeds silently

**Tasks:**
- T01: Write `backend/core/fcm.py` with `send_push(token, payload)` via FCM HTTP v1
- T02: Write `POST /api/v1/users/device-token`
- T03: Write `RhizolveFirebaseService` with `onMessageReceived` and `onNewToken`
- T04: Configure deep link `rhizolve://checks/{project_id}/{investigation_id}`

**Tests:**
```kotlin
@Test fun `onNewToken registers with backend`() = runTest {
    coEvery { api.registerDeviceToken(any()) } just Runs
    service.onNewToken("new-token")
    coVerify { api.registerDeviceToken(match { it.token == "new-token" }) }
}
```

---

### US-44 — Investigation state syncs bidirectionally between Koog and LangGraph

**As a** developer, **I want** investigation state serialisable to canonical JSON that both graphs read and write, **so that** either graph can continue an investigation started by the other.

**Acceptance criteria:**
- `FiveWhysState` → canonical JSON → `OverallState` round-trip preserves all `why_nodes`, `pending_hypotheses`, depth
- LangGraph does not regenerate hypotheses already in the Koog pending queue
- `transferred_from` field provides provenance

**Tasks:**
- T01: Write `mobile/android/sync/StateSerializer.kt` per ADR-007 canonical schema
- T02: Write `mobile/android/sync/StateTransferManager.kt` with upload and download
- T03: Write `backend/api/routes/sync.py` with `GET` (export) and `POST` (import) endpoints

**Tests:**
```kotlin
@Test fun `round-trip preserves why_nodes and pending_hypotheses`() {
    val original = mockFiveWhysState()
    val json = StateSerializer.toJson(original)
    val restored = StateSerializer.fromJson(json)
    assertEquals(original.whyNodes.size, restored.whyNodes.size)
    assertEquals(original.pendingHypotheses.size, restored.pendingHypotheses.size)
}
```

---

### US-45 — App tested on API 30, 33, and 35 emulators

**As a** developer, **I want** the app validated across three Android API levels, **so that** it covers the range of devices in the field.

**Tasks:**
- T01: Configure Android CI in `.github/workflows/ci-android.yml` with three AVD matrix
- T02: Write end-to-end Espresso test: login → project → start investigation → hypothesis review → Gemba submit
- T03: Profile memory during Cactus inference on API 30 AVD (target: < 512MB)
