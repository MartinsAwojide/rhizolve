# E07 — Connectivity & Intelligence Routing

**Epic statement:** Anyone using Rhizolve on a mobile device needs automatic selection of the best available AI inference and search for their current signal strength so that the investigation continues at the highest possible quality regardless of network conditions.

**Sprint:** SP11  
**Refs:** [ADR-003](../adr/ADR-003-inference-search-routing.md), [ADR-007](../adr/ADR-007-state-interchange-format.md)

---

## Done When

- `NetworkMonitor` classifies signal as STRONG/MODERATE/WEAK/NONE continuously
- Koog inference routes to OpenRouter on usable signal, Cactus on weak/none
- Search tools selected automatically by signal quality
- Cactus model downloaded proactively on first app launch
- Solo signal drop transitions silently; collaborative signal drop prompts user choice
- State transfer endpoint live and tested (see ADR-007)

---

## Spike

**SP-08 — Cactus model download strategy**  
Time-box: 1 day. Question: Proactive (first launch) vs lazy (first offline inference)? OOM risk on budget Exynos devices? Output: Download strategy documented in ADR-003. Done when: Download completes without OOM on Pixel 6a AVD.

---

## US-46 — Network quality continuously measured and classified

See E06 US-40 for `NetworkMonitor` implementation. This story verifies the full classification range and flow integration.

**Tests:**
```kotlin
@Test fun `STRONG above 1000kbps`() {
    every { caps.linkDownstreamBandwidthKbps } returns 5000
    assertEquals(STRONG, monitor.quality())
}
@Test fun `NONE when no active network`() {
    every { cm.getNetworkCapabilities(any()) } returns null
    assertEquals(NONE, monitor.quality())
}
```

---

## US-47 — Inference provider swaps automatically by signal quality

**As a** field analyst, **I want** the best available AI model for my signal strength, **so that** I get the strongest reasoning available without configuring anything.

**Acceptance criteria:**
- STRONG/MODERATE: OpenRouter called; Cactus used silently on failure
- WEAK/NONE: Cactus called directly; OpenRouter never called
- Fallback invisible to user — no error shown, no notification

**Tests:**
```kotlin
@Test fun `NONE calls Cactus only`() = runTest {
    coEvery { network.quality() } returns NONE
    coEvery { cactus.generateCompletion(any()) } returns CactusCompletionResult(true, "result")
    router.complete(listOf(ChatMessage("user", "test")))
    coVerify(exactly = 0) { openRouter.complete(any(), any(), any()) }
}
@Test fun `OpenRouter failure falls back to Cactus silently`() = runTest {
    coEvery { network.quality() } returns STRONG
    coEvery { openRouter.complete(any(), any(), any()) } throws IOException("timeout")
    coEvery { cactus.generateCompletion(any()) } returns CactusCompletionResult(true, "fallback")
    val result = router.complete(listOf(ChatMessage("user", "test")))
    assertEquals("fallback", result)
}
```

---

## US-48 — Search tools selected automatically by signal quality

**Tests:**
```kotlin
@Test fun `STRONG returns four tools`() = assertEquals(4, router.availableTools(STRONG).size)
@Test fun `NONE returns Wikipedia only`() {
    val tools = router.availableTools(NONE)
    assertEquals(1, tools.size); assertEquals("lookup_wikipedia", tools[0].name)
}
```

---

## US-49 — Cactus model downloaded proactively on first launch

**As a** field analyst, **I want** the on-device model ready before I need it, **so that** going offline never triggers a blocking download mid-investigation.

**Acceptance criteria:**
- First launch with connectivity: `qwen3-0.6` downloads in background with `LinearProgressIndicator`
- Already downloaded: subsequent launches skip silently
- Download interrupted: resumes on next launch via WorkManager

**Tasks:**
- T01: Write `ModelDownloadManager.kt` checking `DataStore<Preferences>` for `model_downloaded`
- T02: Schedule download via WorkManager with `NetworkType.CONNECTED` on first launch
- T03: Show `LinearProgressIndicator` in non-blocking bottom sheet during download

---

## US-50 — Signal drop during collaboration prompts user choice

**As a** field analyst in a collaborative session, **I want** to be prompted when signal drops so I can choose Gemba-only or fully offline, **so that** I make a deliberate decision about leaving the collaboration session.

**Acceptance criteria:**
- Active collaborators + signal drop: modal prompt immediately (cannot be dismissed without choosing)
- Gemba only: investigation continues on server; only current Gemba check available; result syncs on reconnect
- Go fully offline: user detaches from SSE; other participants notified; Koog continues full investigation
- Solo investigation: silent transition, no prompt

**Tasks:**
- T01: Write `ConnectionTransitionManager.kt` checking `sessionManager.hasActiveCollaborators()`
- T02: Write `ConnectionTransitionDialog.kt` composable with two action buttons
- T03: Wire `GembaOnly` decision to detach from SSE but keep `GembaCheckCard` active
- T04: Wire `GoFullyOffline` to `POST .../presence` with `action: "offline_detach"`

**Tests:**
```kotlin
@Test fun `solo drop transitions silently`() = runTest {
    coEvery { sessionManager.hasActiveCollaborators() } returns false
    val decision = manager.handleSignalDrop()
    assertEquals(TransitionDecision.GoOfflineSilently, decision)
}
@Test fun `collaboration drop shows prompt`() = runTest {
    coEvery { sessionManager.hasActiveCollaborators() } returns true
    val decision = manager.handleSignalDrop()
    assertTrue(decision is TransitionDecision.AwaitingUserChoice)
}
```
