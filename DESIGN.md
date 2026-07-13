---
name: Rhizolve
description: >-
  Design system for Rhizolve — an AI-assisted 5 Whys root cause investigation
  platform for field operators and desk analysts. Dual-mode (light and dark are
  independently designed, not inverted), WCAG AA (4.5:1 normal text), with a
  dedicated node-status vocabulary for the why-tree and fault-tree.
version: 0.2.0

tokens:
  colors:
    # --- Surfaces (independently designed per mode, not inverted) ---
    surface-0:            # page canvas base
      light: "#FAF7F2"    # warm off-white editorial surface
      dark:  "#12161C"    # deep navy-charcoal (Search Party)
    surface-1:            # in-flow card / structural backgrounds
      light: "#F3EEE6"
      dark:  "#1A1F27"
    surface-2:            # raised panel / primary overlay card
      light: "#FFFFFF"
      dark:  "#222833"

    # --- Text (AA verified: 4.5:1+ normal / 3:1+ large) ---
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
    on-accent:            # text on top of accent-fill
      light: "#FFFFFF"
      dark:  "#04121F"

    # --- Semantic roles (system alerts, toasts, validation states) ---
    success:
      light: "#0F6E56"    # teal-600; ~5.8:1 on light
      dark:  "#5DCAA5"
    danger:
      light: "#A32D2D"    # red-600
      dark:  "#F09595"
    warning:
      light: "#854F0B"    # amber-800; ~6.3:1 on light
      dark:  "#EF9F27"

  # --- Node-status vocabulary (why-tree + fault-tree ONLY) ---
  # These are semantic investigation states, never used for UI chrome.
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

  # --- Project dashboard status vocabulary (ProjectCard status dot ONLY) ---
  # Separate from nodeStatus (which stays investigation-state-only per the
  # chrome/content firewall) but visually echoes the same coral/amber
  # vocabulary per US-32 T07 — solid coral = active, hollow = closed,
  # amber = draft.
  projectStatus:
    active:               # solid coral — project has an in-progress investigation
      light: "#D85A30"
      dark:  "#F0997B"
    closed:               # hollow grey — all investigations complete
      light: "#888780"
      dark:  "#B4B2A9"
    draft:                # amber — no investigations started yet
      light: "#854F0B"
      dark:  "#EF9F27"

  typography:
    sans:
      fontFamily: "Inter, system-ui, sans-serif"
    voice:                # AI TL;DR, suggestions, agent-authored prose
      fontFamily: "'Source Serif 4', Georgia, serif"
    mono:                 # hashes, investigation IDs, log timestamps
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

# Rhizolve Design System

Rhizolve guides personnel—from field operators standing on warehouse floors to desk analysts handling multi-incident retrospectives—from an initial operational failure down to a programmatically verified root cause using a structured 5 Whys architecture. 

---

## Core UX Principles

### 1. Two Environments, Tailored Layout Hierarchies
* **Desk View (Desktop Canvas):** Uses a multi-pane layout. Left pane maintains continuous context (incident metadata, timeline); center pane hosts the interactive AI Co-Pilot chat workspace; right pane renders the expansive 2D branching graph (`@xyflow/react`).
* **Field View (Mobile Execution):** Strips away the 2D infinite canvas entirely. Mobile operators interact via a linearized, chronological stack of actionable **Gemba Check Cards**. They review single hypotheses, snap verifying evidence photos, and input concrete system metrics.

### 2. Strict Semantic Separation (The Chrome/Content Firewall)
* **The System Chrome Layer (Exclusively Blue):** Interactivity, submission vectors, controls, layout frames, and action buttons utilize the `accent` (Blue) token set. 
* **The Investigation State Layer (Exclusively Coral/Status-Mapped):** System states within the why-tree use the `nodeStatus` vocabulary. Coral represents a live path under scrutiny. A coral shape must never serve as a basic navigational button or action trigger.

### 3. Clear Cognitive Voice Distinctions
* **Human/System Layouts:** Rendered in `sans` (Inter). Anything structural, functional, or user-authored uses clean, standard typography to preserve rapid information scanning.
* **AI Agent Co-Pilot Layouts:** Rendered in `voice` (Source Serif 4). When the AI synthesizes a TL;DR summary, proposes an auxiliary branch hypothesis, or reviews a countermeasure, it is presented in an editorial serif wrapper. The user knows instantly that the text was generated, not captured.

---

## Workspace Layout Blueprints

### Desktop: Three-Pane Infinite Canvas Architecture
* **Left Sidebar (Width: 320px, `surface-1`):** Navigation, active incident logs, structural tags, and investigator verification signatures (`mono`).
* **Center Stage (Flexible, `surface-0`):** The AI Co-Pilot chat environment. Chat bubbles alternate between user inputs (sans text on subtle gray backgrounds) and agent answers (serif text inside clear white panels).
* **Right Panel (Width: 400px, `surface-2`):** The infinite-canvas why-tree. Graph nodes connected with orthogonal right-angle paths (`d3-hierarchy`). Active paths use solid `nodeStatus.active` vectors.

### Mobile (Android): Linear Stream Architecture
* No infinite-zoom scrolling. Mobile operators receive full-bleed cards representing individual nodes marked as `active` by the desk team.
* **The Touch-Target Mandate:** Controls must sit inside clear `56dp` interaction zones to safely enable single-thumb taps by engineers wearing physical industrial gloves on active plant floors.

---

## Graph Node Vocabulary (Visual Matrices)

This exact schema must match across the interactive React visualization layer (`@xyflow/react`), server-rendered SVGs in exportable PDFs, and mobile card indicators.

| Node State | Border Execution | Background Fill | Meaning / Context |
| :--- | :--- | :--- | :--- |
| **Active** | Solid Coral | `surface-1` | Branch under review; currently being analyzed or waiting on field data. |
| **Confirmed** | Solid Coral | Solid Coral (`#D85A30`) | Hypothesized fault is a verified reality. Gemba check failed (NOK). |
| **Ruled Out** | Solid Grey Outline | `surface-1` (Opacity: 50%) | Hypothesis broken. Gemba check passed (OK). Dead end path. |
| **Root Cause** | Solid Green Outline | Subtle Teal Fill | Terminal node. Remediation applied here permanently stops recurrence. |
| **Suspended** | Dashed Blue Outline | `surface-0` | Path temporarily shelved by analyst to avoid graph clutter. |
| **Conflict** | Alternating Split Donut | `surface-2` | Field operators report contradictory physical proof vs. desk logs. |

---

## AI Co-Pilot Design Patterns

To maintain structural authority, the AI agent cannot alter the why-tree layout autonomously.

1. **Staged Suggestions:** When the AI proposes an addition to the 5 Whys chain, the recommendation renders as a dashed-outline serif card directly adjacent to the target node.
2. **Explicit Human Validation:** A proposed AI node contains a primary blue button (`accent-fill`) labeled "Accept Suggestion" and a minor button labeled "Dismiss." The graph only transforms permanently once a human hits the blue trigger.

---

## Tooling & Verification Constraints

* **Linting Boundary:** The `@google/design.md` v0.3.0 CLI checks document formatting and structural YAML accuracy only. It does **not** evaluate WCAG color contrast or text legibility bounds.
* **Programmatic Testing:** Contrast validity and cross-platform variable extraction are handled via the native testing pipeline (`tests/design/test_token_parity.py`). Run the python test suite before shipping modifications to production web or mobile codebases.