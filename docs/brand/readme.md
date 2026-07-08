# Rhizolve design system

Rhizolve is an **AI-assisted 5 Whys root cause investigation platform** for field operators and desk analysts. Anyone who hits a problem — on a factory floor or at a desk — moves from observation to a *verified* root cause through a structured, chat-first investigation, and can trust the output is defensible regardless of who reviews it. *(Tracks DESIGN.md v0.2.0.)*

Two platforms share one FastAPI + LangGraph backend and one visual language:
- **Web app** (React 19 · Vite · Tailwind) — analysts, managers, consultants; always online; three-column workspace.
- **Android app** (Kotlin · Compose · Koog · Cactus) — field operators; online-first, fully offline-capable; chat-first with a glove-tappable Gemba surface.

The signature surface is the **why-tree / fault-tree**, whose node-status vocabulary (the coral system) is the heart of the brand.

## Sources (provided; reader may not have access — recorded for reference)
- `uploads/rhizolve-docs-v2/` — product docs, ADRs, and agile epics. Key files:
  - `DESIGN.md` — the canonical token + rationale doc (Google Stitch `design.md` spec). **This is the ground truth** for every colour, type, spacing and radius value here.
  - `docs/product-brief.md` — problem, personas (P1–P5), core concepts, role matrix, maturity scale, report formats.
  - `docs/agile/e05-web-client.md`, `docs/agile/e06-android-client.md` — screen specs used for the UI kits.
  - `docs/agile/e08-reporting-compliance.md` — fault-tree SVG, PDF, 8D, signing.
  - `docs/adr/ADR-008-…` — shadcn/ui + `@xyflow/react` + `d3-hierarchy` decisions.
  - `docs/brand/*.svg` — the real brand assets (logo + node-status sheet, light & dark), copied into `assets/`.
  - `tools/generate_brand_assets.py` — regenerates the SVGs from `DESIGN.md` tokens.
- No Figma, no live codebase — the docs and SVGs are the complete source.

---

## Content fundamentals

How Rhizolve writes, drawn from the product docs and DESIGN.md:

- **Sentence case, everywhere.** Headings, labels, buttons — all sentence case. "Start investigation", not "Start Investigation". No Title Case, no ALL CAPS.
- **British spelling** in product prose: "colour", "optimising", "prioritise", "organisation". (Tokens/code use whatever the spec wrote; UI copy leans British.)
- **Plain, calm, evidentiary.** The tone is a careful investigator, not a hype cycle. "From observation to verified root cause." No exclamation marks, no growth-marketing verbs, no emoji in the product.
- **Two voices, and they matter.** UI chrome speaks in Inter (structural, terse: "Hypothesis review", "Generate checks"). Anything the *AI* authors — the TL;DR, a shallow answer, a hypothesis, a rationale — speaks in the Source Serif 4 voice, in fuller sentences. The typeface tells the user who is speaking before they read a word. Never mix them.
- **"You" for the user, the agent refers to itself as "I".** e.g. "I have opened a Deep-mode run and extracted the phenomenon. Confirm to proceed."
- **Domain-neutral vocabulary.** Copy adapts to manufacturing, IT, pharma, financial services alike — say "phenomenon", "hypothesis", "Gemba check", "root cause", "countermeasure", "branch 3.1", not industry-specific jargon.
- **Numbers are precise and defensible.** "> 80% of completed", "confidence 86%", "depth 3 · 5 nodes · 1 root cause". Mono type for IDs, hashes, signatures.
- **Methodology words are load-bearing terms of art**, capitalised only as proper nouns of the system: Gemba check, 5 Whys, Deep / Shallow mode, driver, quorum, Owner / Analyst / Contributor / Operator / Manager / Viewer, maturity level, `/btw`.

---

## Visual foundations

**Dual mode, equal weight.** Light and dark are *independently designed*, never inverted. Light is a warm off-white editorial surface (`#FAF7F2`) for desk work — closer to Notion/Mastercard than clinical white. Dark is a deep navy-charcoal (`#12161C`) drawn from the Search Party investigative aesthetic, legible outdoors on a phone. Cards step *up* toward the extreme of each mode (pure white in light, raised slate `#222833` in dark).

**Colour vibe.** Warm, restrained, technical. Surfaces are warm-neutral; the single strong chrome colour is a **calm blue** accent. Warmth + a cool accent = "editorial blueprint," which reinforces the evidentiary character.

**Chrome is blue; investigation state is coral — this separation is load-bearing.** The brand accent (buttons, links, active nav) is a calm blue (`--accent`, `--accent-fill`). **Coral appears in exactly one place: node-status meaning** in the why-tree, fault-tree, and the dashboard status dot (a project's status *is* its investigation state). A coral element on screen always means "confirmed or active cause," never "button." Do not use coral for UI chrome.

**Node-status vocabulary (the coral system).** Five states, identical across three renderers (xyflow tree, report SVG, Android buttons):
- **active** — solid coral *ring* (surface fill): a branch under review.
- **confirmed** — solid coral *fill*: a Gemba-NOK verified real cause.
- **ruled out** — grey outline, faded to 50% (optional red-X for emphasis): a Gemba-OK dead end.
- **root cause** — green outline + subtle teal fill + green-plus marker.
- **suspended** — dashed blue outline.
- **conflict** — split-colour donut.
Node **size** encodes depth/importance; **orthogonal (right-angle) connectors** reproduce the Search Party board look. These six states are the complete vocabulary (active and confirmed are the two coral treatments) — do not invent a seventh. (DESIGN v0.2.0 made active vs confirmed visually distinct — a ring vs a solid disc.)

**Type.** Inter for all UI chrome; Source Serif 4 for the AI voice; JetBrains Mono for hashes/IDs/signatures. **Two weights only: 400 and 500.** Scale: caption 12/1.4, body 16/1.7, h3 16/500, h2 18/500, h1 22/500. Generous body line-height (1.7) — this is a reading tool.

**Space & radius.** 8px base scale (xs 4 → xl 24). Controls 8px radius, cards 12px, pills fully round. Touch targets ≥48dp on Android, 56dp for Gemba result buttons.

**Backgrounds.** Flat warm/navy surfaces — **no gradients, no imagery, no texture, no patterns.** The canvas is deliberately quiet so node colour carries all the signal. The only "image" content is the why-tree/fault-tree itself.

**Borders & elevation.** Hairline borders (`--border`, warm `#E7E0D5` / navy `#2C333D`) on every card and panel. Shadows are *soft and low-spread* (editorial, not material) — `--shadow-sm/md/lg`. Cards = surface-2 + hairline border + 12px radius + a soft shadow.

**Motion.** Restrained. Short fades and 120ms ease transitions on hover/press; new tree nodes animate in within ~3s of an SSE update. No bounces, no decorative loops.

**Hover / press states.** Hover = subtle background shift or slight darken; primary buttons keep their fill. Press/selected = a 2px accent (or node-colour) border and a faint tinted fill (`color-mix(... 12%)`), never a scale-down. Focus = a 3px accent ring.

**Transparency / blur.** Used sparingly — only the sticky top bar uses a translucent surface + `backdrop-filter: blur`. Everything else is opaque.

---

## Iconography

- **Lucide** is the icon set (shadcn/ui's default; ADR-008 selects shadcn New York). Stroke icons, ~1.5–2px weight, rounded joins — matching Inter's tone. Load from CDN (`lucide` / `lucide-react`) in production; the UI kits here use text/emoji stand-ins only where an icon is incidental (e.g. the mic glyph) — swap for the Lucide equivalent in real work.
- **The node-status markers are the one bespoke "icon" system** — they are SVG, defined once (`NodeStatusMarker`, and `assets/node-status-{light,dark}.svg`) and reused verbatim in the interactive tree, the server-rendered report SVG, and the Android result buttons. Never redraw them per surface.
- **The logo** is a rhizome mark (`assets/logo-{light,dark}.svg`): a hollow blue root node branching orthogonally down to a coral terminal cause, beside the "Rhizolve" wordmark in Inter medium. Light and dark are separate files. **Do not recolour, redraw, or reconstruct the mark** — use the provided SVGs.
- **No emoji** in the product UI. No decorative unicode. Icons are functional only.

---

## Components

Reusable primitives, grouped by concern. Each is `Name.jsx` + `Name.d.ts` + `Name.prompt.md`, mounted from `window.RhizolveDesignSystem_959827`.

**Primitives** (`components/primitives/`): **Button**, **Card** (+ `CardHeader`), **Badge**, **Input**.

**Investigation vocabulary** (`components/investigation/`): **NodeStatusMarker** (the coral system), **StatusDot**, **ModeIndicator**, **ConnectivityIndicator**, **MaturityMeter**.

**Chat** (`components/chat/`): **ChatBubble** (the two-voices split), **HypothesisReviewCard**, **GembaCheckCard**, **ValidatorReviewCard**, **CountermeasureReviewCard**, **SuggestionCard** (the AI Co-Pilot staged-suggestion pattern — dashed serif card, human-gated accept).

**Project** (`components/project/`): **ProjectCard**.

*Intentional additions* (not literal in DESIGN.md, added because the UI needs them, all built from documented tokens): `--border` / `--border-strong` / `--ring` hairline + focus tokens, `--shadow-sm/md/lg` elevation, and the `MaturityMeter`, `StatusDot`, `ModeIndicator`, `ConnectivityIndicator` chrome components (each maps directly onto a documented concept in the product brief / epics).

## UI kits
- **`ui_kits/web/`** — the web client: Login → Dashboard → three-column Investigation workspace (sidebar / chat / why-tree). Interactive `index.html`.
- **`ui_kits/android/`** — the Android field client: chat-first screen + full-screen Gemba surface, in phone frames, light & dark.

## Foundations (Design System tab)
Specimen cards live in `guidelines/` — Colors (surfaces, text, accent, semantic, node-status), Type (scale, body, the two voices, mono), Spacing (scale, radius, elevation), Brand (logos, node-status sheet, principles).

## Root manifest / index
- `styles.css` — global entry point (imports only). Consumers link this.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `fonts.css`.
- `assets/` — `logo-{light,dark}.svg`, `node-status-{light,dark}.svg`.
- `components/` — primitives · investigation · chat · project.
- `guidelines/` — foundation specimen cards.
- `ui_kits/` — `web/`, `android/`.
- `SKILL.md` — Agent-Skills wrapper.

## Font note
Inter, Source Serif 4, and JetBrains Mono are loaded from **Google Fonts** (`tokens/fonts.css`) rather than shipped as local binaries — all three are the exact families named in `DESIGN.md`, so this is a delivery choice, not a substitution. If you need self-hosted/offline binaries, drop the `.woff2` files into `assets/fonts/` and replace the `@import` with local `@font-face` rules.
