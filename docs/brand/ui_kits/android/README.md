# Android client UI kit

High-fidelity recreation of the Rhizolve **Android field client** (Kotlin + Jetpack Compose + Koog + Cactus in production; here composed from the shared design-system components in a phone frame). Field personas: operators, field analysts, on-site technicians.

## Screens (`index.html`)
- **MobileChatScreen** — chat-first investigation. Top app bar with the always-visible `ConnectivityIndicator`, the thread (`ChatBubble`), a tappable "Gemba check assigned" affordance, a voice-input composer, and a bottom tab row (Chat / Why tree). The why-tree tab shows a vertical node chain (`NodeStatusMarker`), since a phone is portrait.
- **MobileGembaScreen** — the full-screen Gemba field surface built on `GembaCheckCard`: evidence capture (Voice / Photo / Type) **first**, then three stacked ≥56dp result buttons (OK hollow · NOK coral · Root cause green-plus). Glove-tappable, outdoor-legible.

Two phones are shown: a light-mode device (tap the Gemba card to open the field surface) and a dark-mode device on hybrid routing (weak signal). The **◐ Theme** button flips both.

## Files
- `index.html` — phone frames + screen router + theme toggle
- `MobileScreens.jsx` — `MobileChatScreen`, `MobileGembaScreen`, shared `TopBar` / `TabRow`

## Notes
- On-device inference routing (cloud / hybrid / local via `RhizolveInferenceRouter`) is represented only by the `ConnectivityIndicator` state — no real network logic.
- Touch targets follow the field rule: ≥48dp everywhere, 56dp for Gemba result buttons (E06 US-41).
- The why-tree here is a simplified vertical chain; production uses a Compose `Canvas` diagram.
- Source of truth: `docs/agile/e06-android-client.md`, `mobile/android/AGENTS.md`.
