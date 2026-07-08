---
name: Rhizolve
description: >-
  Design system for Rhizolve — an AI-assisted 5 Whys root cause investigation
  platform for field operators and desk analysts. Dual-mode (light and dark are
  independently designed, not inverted), WCAG AA (4.5:1 normal text), with a
  dedicated node-status vocabulary for the why-tree and fault-tree.
version: 0.1.0

tokens:
  colors:
    # --- Surfaces (independently designed per mode, not inverted) ---
    # Light mode: warm off-white editorial base. Dark mode: navy/charcoal (Search Party).
    surface-0:            # page canvas
      light: "#FAF7F2"    # warm off-white
      dark:  "#12161C"    # deep navy-charcoal
    surface-1:            # in-flow card / subtle fill
      light: "#F3EEE6"
      dark:  "#1A1F27"
    surface-2:            # raised panel / primary card
      light: "#FFFFFF"
      dark:  "#222833"

    # --- Text (AA verified: 4.5:1+ normal / 3:1+ large against intended surface) ---
    text-primary:
      light: "#1C2024"    # ~13.8:1 on surface-0 light
      dark:  "#F4F1EC"    # ~14.2:1 on surface-0 dark
    text-secondary:
      light: "#44494F"    # ~8.1:1 on surface-0 light
      dark:  "#BDB8B0"    # ~7.4:1 on surface-0 dark
    text-muted:
      light: "#5E625F"    # ~5.8:1 on surface-0 light (clears AA normal 4.5:1)
      dark:  "#8A857D"

    # --- Brand accent: calm BLUE (chrome only — buttons, links, active nav) ---
    # Deliberately NOT coral. Coral is reserved for node-status semantics.
    accent:
      light: "#0C447C"    # blue-800; ~7.6:1 on surface-0 light
      dark:  "#85B7EB"    # blue-200; ~7.3:1 on surface-0 dark
    accent-fill:          # solid accent button background
      light: "#185FA5"
      dark:  "#378ADD"
    on-accent:            # text on accent-fill
      light: "#FFFFFF"
      dark:  "#04121F"

    # --- Semantic roles ---
    success:
      light: "#0F6E56"    # teal-600; ~5.8:1 on light, clears AA normal
      dark:  "#5DCAA5"
    danger:
      light: "#A32D2D"    # red-600
      dark:  "#F09595"
    warning:
      light: "#854F0B"    # amber-800; ~6.3:1 on light, clears AA normal
      dark:  "#EF9F27"

  # --- Node-status vocabulary (why-tree + fault-tree ONLY) ---
  # These are semantic investigation states, never used for UI chrome.
  # Coral lives here and nowhere else.
  nodeStatus:
    active:               # solid coral fill — awaiting/mid verification
      light: "#D85A30"
      dark:  "#F0997B"
    confirmed:            # solid coral — Gemba NOK, real cause
      light: "#D85A30"
      dark:  "#F0997B"
    ruledOut:             # hollow outline — Gemba OK
      light: "#888780"
      dark:  "#B4B2A9"
    rootCause:            # green-plus marker — fixing prevents recurrence
      light: "#0F6E56"
      dark:  "#5DCAA5"
    suspended:            # dashed outline — soft-reset branch
      light: "#378ADD"
      dark:  "#85B7EB"
    conflict:             # split donut — field result disputes closed branch
      light: "#BA7517"
      dark:  "#EF9F27"

  typography:
    # Two-typeface split: sans for all UI chrome, serif for AI/agent voice.
    sans:
      fontFamily: "Inter, system-ui, sans-serif"
    voice:                # AI TL;DR, shallow answers, agent-authored prose
      fontFamily: "'Source Serif 4', Georgia, serif"
    mono:                 # hashes, IDs, code
      fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    scale:
      caption:
        fontSize: 12px
        lineHeight: 1.4
      body:
        fontSize: 16px
        lineHeight: 1.7
      heading-3:
        fontSize: 16px
        fontWeight: 500
      heading-2:
        fontSize: 18px
        fontWeight: 500
      heading-1:
        fontSize: 22px
        fontWeight: 500

  space:
    xs: 4px
    sm: 8px
    md: 12px
    lg: 16px
    xl: 24px

  radius:
    control: 8px
    card: 12px
    pill: 9999px
---

# Rhizolve design system

Rhizolve helps anyone — a field operator on a factory floor or a desk analyst — move from a problem to a verified root cause through a structured 5 Whys investigation. The interface has to work in two very different places: a bright warehouse on a phone at arm's length, and a desk on a wide monitor. That tension drives every decision below.

## Principles

1. **Two modes, equal weight.** Light and dark are designed independently, not derived from each other. Light mode is a warm off-white editorial surface for desk work; dark mode is a navy/charcoal surface (drawn from the Search Party investigative aesthetic) that stays legible outdoors and at night. Neither is "the real one."
2. **AA, verified.** Every text-on-surface pairing meets WCAG AA (4.5:1 for normal text, 3:1 for large). Contrast is checked programmatically per token (see the token-parity test), not eyeballed. AA was chosen over AAA deliberately: AAA's 7:1 floor forces semantic colours (success teal, danger red, warning amber) toward muddy near-black on the warm off-white surface, weakening their signal value; AA keeps them vivid while staying accessible.
3. **Chrome is blue. Investigation state is coral.** The brand accent — buttons, links, active nav — is a calm blue. Coral is reserved exclusively for node-status meaning in the why-tree and fault-tree. A coral element on screen always means "this is a confirmed or active cause," never "this is a button." This separation is load-bearing; do not use coral for UI chrome.
4. **Two voices, two typefaces.** UI chrome is sans (Inter). Anything the AI authors — the TL;DR, a shallow-mode answer, agent commentary — renders in a serif voice (Source Serif 4). The typeface tells the user who is speaking before they read a word.

## Colors

### Surfaces

Light mode uses a warm off-white (`surface-0` `#FAF7F2`) rather than clinical white — it reads as editorial and calm, closer to Notion/Mastercard than ClickHouse. Dark mode uses a deep navy-charcoal (`#12161C`) that carries the Search Party reference and holds up under sunlight glare on a phone. Cards step up toward the lighter/darker extreme of each mode (`surface-2` is pure white in light, a raised slate in dark).

### Brand accent — blue

`accent` is blue and lives on chrome only: links, active navigation, the composer send affordance, primary buttons (`accent-fill` for solid backgrounds, with `on-accent` text). It is intentionally the calmest strong color in the system so that coral can carry all the semantic weight.

### Node-status vocabulary — the coral system

This is the heart of Rhizolve's visual identity and the one part that must stay perfectly consistent across three renderers: the interactive why-tree (`@xyflow/react`), the static fault-tree in reports (server-side SVG), and the Android Gemba result buttons.

- **active / confirmed** — solid coral fill. A hypothesis being verified, or a Gemba-NOK confirmed cause.
- **ruled out** — hollow circle, grey outline. A Gemba-OK dead end.
- **root cause** — green-plus marker. Fixing this prevents recurrence.
- **suspended** — dashed blue outline. A branch parked by a soft reset.
- **conflict** — split-color donut. A synced field result disputes an already-closed branch.

Node **size** encodes depth/importance; **orthogonal connectors** (right angles, via `d3-hierarchy`) reproduce the Search Party board look. These five states are the complete vocabulary — do not invent a sixth without an ADR.

## Typography

Sans (`Inter`) for everything structural. Serif voice (`Source Serif 4`) for AI-authored text. Mono (`JetBrains Mono`) for hashes, investigation IDs, and signatures in the audit footer. Two weights only across the system: 400 regular, 500 medium. Sentence case everywhere, including headings and labels.

## Space and radius

An 8px-based scale (`xs` 4 → `xl` 24). Controls use an 8px radius, cards 12px, pills fully rounded. Touch targets on Android are never below 48dp; the Gemba result buttons are 56dp for glove use.

## Known tooling note

The `@google/design.md` v0.3.0 CLI `lint` validates YAML/markdown structure only — it does **not** check WCAG contrast in this release (verified empirically: malformed colour values pass lint clean). AA contrast is therefore verified programmatically in the cross-platform token-parity test (`tests/design/test_token_parity.py`), not by the linter. Re-check whether a later CLI version adds contrast linting before relying on it. The CLI `spec` and `export` subcommands are also broken in 0.3.0 (missing bundled `spec.md`; empty theme export) — track upstream before depending on token export.
