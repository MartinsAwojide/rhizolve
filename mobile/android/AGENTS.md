# AGENTS.md — mobile/android/

Kotlin 2.x, Jetpack Compose, Hilt DI. Koog (graph orchestration) + Cactus (on-device inference) + Moonshine (on-device transcription).

## Commands

- Build debug: `./gradlew assembleDebug`
- Unit tests: `./gradlew test`
- Instrumented tests (needs emulator/device): `./gradlew connectedAndroidTest`
- Lint: `./gradlew ktlintCheck` — fix: `./gradlew ktlintFormat`

## Code style

- Compose screens are stateless where possible — state hoisted to a `ViewModel` with `StateFlow`, not raw `mutableStateOf` at the screen level beyond local UI toggles.
- Coroutines for all async work. No callbacks, no raw `Thread`.
- Routing pattern used throughout the inference layer — follow it, don't reinvent it per call site:
```kotlin
suspend fun complete(messages: List<ChatMessage>): String =
    when (network.quality()) {
        STRONG, MODERATE -> runCatching { openRouter.complete(messages) }
            .getOrElse { cactusInference(messages) }
        WEAK, NONE -> cactusInference(messages)
    }
```

## Testing

- MockK for mocking. `runTest` from `kotlinx-coroutines-test` for coroutine tests — never `runBlocking` in a test.
- Compose UI tests use `createAndroidComposeRule`. Any new field-facing touch target asserts `≥ 48.dp` — see `docs/agile/e06-android-client.md`.

## Boundaries

- Never call Cactus directly from a Composable or ViewModel. Always route through `RhizolveInferenceRouter` — the signal-quality routing logic must stay centralized in one place. See `docs/adr/ADR-003-inference-search-routing.md`.
- Never block the main thread for Moonshine transcription. It runs via `DeferredTranscriptionWorker`, gated on CPU idle, never synchronous with Gemba submission. See `docs/adr/ADR-006-project-collaboration.md`.
- Model names in `RhizolveInferenceRouter` (`qwen3-0.6`, `lfm2-1.2b`) are provisional pending SP-08 verification — don't treat them as settled without checking Cactus's current supported model list first.

## Definition of Done (mobile/android)

- [ ] `./gradlew ktlintCheck` clean
- [ ] `./gradlew test` green; `connectedAndroidTest` green on at least one AVD
- [ ] Touch targets verified `≥ 48.dp` for any new field-facing UI
