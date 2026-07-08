# ADR-008 — Design System and Why-Tree Library

**Status:** Accepted
**Date:** 2026-07-04
**Sprint:** SP00 (SP-00a spike)
**Refs:** [E05 Web Client](../agile/e05-web-client.md), [E08 Reporting](../agile/e08-reporting-compliance.md), `DESIGN.md`

---

## Context

SP-00a (design sprint, precedes all implementation) had to settle two library choices that everything in E05 and E06 builds on: the React component system, and the library that renders the interactive why-tree — Rhizolve's single most differentiating surface. Both had to be verified against their current 2026 state rather than chosen from memory, since an early wrong choice here is expensive to unwind after components are built.

## Decision

### Component system — shadcn/ui (unified `radix-ui`, New York style)

- Full React 19 + Tailwind v4 support, confirmed current on the official site (not inferred).
- Component source is copied into the repo — no version lock-in, and it aligns with the clean-code / `AGENTS.md` ownership discipline already established. The team can tune colour tokens to WCAG AA without fighting a vendor theme.
- Ships an MCP server and agent "skills" — compounds directly with E10 (Rhizolve MCP server) and the Claude Code build workflow.
- Uses the unified `radix-ui` package (as of the Feb 2026 shadcn change), not the legacy per-component `@radix-ui/react-*` packages.

**Rejected:** Ant Design — heavier, opinionated theming resists custom AA-tuned tokens and the Search Party node aesthetic. Radix alone — shadcn already sits on Radix and adds copy-in ergonomics on top.

### Why-tree — `@xyflow/react` + `d3-hierarchy`

- The package is `@xyflow/react` (React Flow's current name), not the legacy `reactflow` package.
- Layout engine is **`d3-hierarchy`**, not Dagre. A 5 Whys investigation is a strict single-root, single-parent tree (confirmed with product owner: a node never has more than one parent), which is exactly what `d3-hierarchy`'s `d3.tree()` is built for.
- `d3-hierarchy` is actively maintained and free; its orthogonal link style reproduces the Search Party right-angle connector aesthetic (see ADR referenced in E05 US-30) natively.

**Rejected:** Dagre — xyflow's own maintainer states it is currently unmaintained, and the expand/collapse example that matches Rhizolve's soft-reset/suspended-branch interaction sits behind the xyflow Pro License. elkjs — actively maintained but explicitly flagged by xyflow as complex to support; unnecessary power for a strict single-root tree.

## Consequences

**Positive**
- Every component is in-repo and contrast-tunable; no vendor fights the dual-mode palette.
- `d3-hierarchy` is a maintained, free, single-purpose fit — no paywalled interaction, no unmaintained dependency in the most important UI surface.
- shadcn's MCP server and skills reduce friction with the existing Claude Code + E10 workflow.

**Negative**
- `d3-hierarchy` outputs a layout, not React Flow nodes — a small adapter (`d3.hierarchy` → `@xyflow/react` node/edge positions) must be written and unit-tested in E05 US-35. This is a few dozen lines, not a library.
- shadcn's copy-in model means component updates are manual, by design — the team owns the maintenance surface it gains control over.

## Alternatives Considered

Covered inline above (Ant Design, Radix-alone, Dagre, elkjs). The decisive factors were: contrast-tunability without vendor resistance (component system) and maintained-and-free single-root tree layout without a Pro license (why-tree).

## Verification note

All four library states (shadcn React 19 support, `radix-ui` unification, Dagre unmaintained status + Pro-licensed expand/collapse, `@xyflow/react` naming) were confirmed against primary sources — official docs, changelog, and xyflow maintainer statements on GitHub — during SP-00a on 2026-07-04, per the standing rule to verify currency rather than rely on training data.
