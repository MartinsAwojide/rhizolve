# Web client UI kit

High-fidelity recreation of the Rhizolve **web app** (React 19 + Vite + Tailwind in production; here composed from the design-system components). Desk personas: analysts, managers, consultants, service engineers.

## Screens (`index.html` is an interactive click-through)

1. **LoginScreen** — warm editorial split: brand rail (logo, Hill statement in the serif voice) + sign-in card. → sign in goes to the dashboard.
2. **DashboardScreen** — metrics row (active investigations, root causes, avg depth, Gemba completion), responsive project grid of `ProjectCard`s with a dashed "New project" tile, and a right-hand "Needs attention" rail (assigned Gemba, conflict flags, awaiting quorum). → clicking a project opens the investigation.
3. **InvestigationScreen** — the three-column flagship (`240px sidebar / chat / 420px why-tree panel`):
   - **Sidebar** — logo, project list with status dots, new-project.
   - **Chat (center)** — presence bar (avatars, driver ring, "driving" badge, export), the thread (`ChatBubble` — serif for the agent, sans for the user), a docked interrupt card (`GembaCheckCard` → `ValidatorReviewCard` → `CountermeasureReviewCard`, advancing as you submit), and the composer with the `ModeIndicator` (● Shallow / ◆ Deep) and `/btw` hint.
   - **Why-tree (right)** — `WhyTree.jsx`, a cosmetic recreation of the interactive `@xyflow/react` tree: top-down layout, orthogonal connectors, `NodeStatusMarker` nodes sized by depth, and a legend collapsed by default behind a toggle (SP-00b decision).

4. **ReportScreen** — the completed-investigation report (E08). AI TL;DR in the serif voice, the static fault-tree SVG (same node vocabulary as the interactive tree), root cause + countermeasure, steering-decisions log, per-format export panel (PDF / Markdown / AIAG 8D / ZIP), and the HMAC-SHA256 signature footer in mono. Reached from the investigation's **Export report** button.

A floating **◐ Theme** button toggles light/dark (both modes are first-class).

## Files
- `index.html` — shell + screen router + theme toggle
- `LoginScreen.jsx`, `DashboardScreen.jsx`, `InvestigationScreen.jsx`, `ReportScreen.jsx`, `WhyTree.jsx`

## Notes
- The why-tree here is static/cosmetic — production uses `@xyflow/react` + `d3-hierarchy` (ADR-008). The node vocabulary, connector style, and size-for-depth are faithful; pan/zoom and live SSE updates are not recreated.
- Layout responsiveness (panel collapse < 1280px, drawers < 768px) is documented in E05 US-31 but the kit is shown at desk width.
- Source of truth: `docs/agile/e05-web-client.md`, `frontend/web/AGENTS.md`.
