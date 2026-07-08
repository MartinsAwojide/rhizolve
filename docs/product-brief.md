# Rhizolve — Product Brief

**Version:** 2.0  
**Date:** 2026-07-04  
**Status:** Active

---

## 1. Problem

Root cause analysis is broken in practice. Teams conduct 5 Whys investigations from memory, in meetings, on whiteboards — without a structured tool to enforce the methodology, capture evidence, or produce an auditable output. The result is investigations that stop at symptoms, Gemba checks that are skipped, institutional knowledge that never compounds, and reports that are manually typed after the fact without chain-of-custody.

The problem is universal across manufacturing, IT, services, and consulting — wherever structured problem-solving matters.

---

## 2. Hill

> **Anyone who encounters a problem — on the floor or at a desk — can move from observation to verified root cause through a structured investigation, and trust that the outcome is defensible regardless of who reviews it.**

This is the single product Hill. It is solution-agnostic and does not change between releases.

---

## 3. Platforms

| Platform | Primary users | Connectivity |
|----------|--------------|--------------|
| Web app (React) | Analysts, managers, consultants, service engineers | Always online |
| Android app (Kotlin + Koog + Cactus) | Field operators, field analysts, on-site technicians | Online-first, offline capable |

Both platforms share the same FastAPI + LangGraph backend. The Android app is a client — not a separate product.

---

## 4. Personas

**P1 — Analyst / Owner:** Quality engineer, service engineer, software engineer, IT ops, consultant, field technician who leads investigations. Found on web and Android.

**P2 — Contributor:** Subject matter expert brought in at a specific branch or hypothesis. Contributes expertise at hypothesis review and assigned Gemba checks. Project-level scope. Found on web and Android.

**P3 — Gemba Operator:** Factory floor technician, field worker, helpdesk agent who executes physical or procedural verification checks. Primarily on Android. Can start their own investigations as Owner.

**P4 — Manager:** Quality manager, delivery lead, ops director. Read-only across projects they are a member of. Found on web.

**P5 — Viewer:** Client, auditor, external stakeholder. Read-only on specific projects they are explicitly invited to. Found on web.

---

## 5. Domain Coverage

Rhizolve is domain-agnostic. The `domain` and `system_or_process_context` fields adapt hypothesis generation to any field.

**Physical operations:** manufacturing, aerospace & defence, automotive, food & beverage, pharmaceuticals, oil & gas, utilities & energy, construction, logistics & supply chain.

**Technology:** software engineering, IT infrastructure, cloud & DevOps, cybersecurity, electronics.

**Services:** financial services, healthcare & clinical, customer service & support, retail & e-commerce, consulting, general business process.

---

## 6. Core Concepts

**Chat-first:** The primary interface is a conversation. Shallow questions get direct answers. Deep questions trigger the 5 Whys graph automatically. The agent decides the mode; the user can override via a subtle indicator.

**Shallow mode:** Direct conversational answer from the agent. No graph. No methodology.

**Deep mode:** Agent confirms with the user, extracts investigation parameters from the conversation, and invokes the LangGraph graph. Investigation proceeds through the full 5 Whys methodology.

**Verbose / Quiet:** User preference. Verbose — agent shows what it extracted and asks for confirmation. Quiet — agent populates settings silently and proceeds.

**/btw:** While in Deep mode, `/btw` opens a completely independent parallel thread for a quick question without interrupting the investigation. The thread is ephemeral.

**Cross-session memory:** The agent remembers the user's domain expertise, preferences, and past investigation patterns across sessions via progressive compaction. Nothing decays — only distils.

**Project:** The unit of work. Any authenticated user can create a project and becomes its Owner. Projects have visibility: Private, Team, or Organisation.

**Maturity level:** A 1–5 scale set at organisation level, inherited by project, overridable at process level. Governs hypothesis complexity — level 1 = basic poka-yoke failures, level 5 = complex systemic failures.

**Investigation:** The 5 Whys graph run, tied to a project. State persisted in Redis via `AsyncRedisSaver`, namespaced as `project_id:investigation_id`.

**Gemba Check:** A physical or procedural verification step. The graph interrupts, presents a hypothesis and instructions, and resumes when OK/NOK/ROOT_CAUSE is submitted with text, image, or audio evidence.

**Steering:** The user can intervene at four interrupt points: hypothesis review, Gemba check, validator decision review, and countermeasure review. Context injection (`aupdate_state`) is available at any time.

**Driver model:** The most senior active participant in a session is automatically the driver. Seniority follows role hierarchy. Driver transfers automatically when participants join or leave. Only the driver executes steering actions.

**Quorum:** Majority of active Owner + Analyst + Contributor participants must signal Ready before the driver can advance. Operators, Managers, and Viewers do not count toward quorum. Solo investigator is always quorum of one.

**Auto-mode (Android):** The app measures network quality continuously and routes inference and search automatically. Three modes: cloud APIs (strong/moderate signal), hybrid (weak signal — OpenRouter + Cactus fallback), fully local (no signal — Cactus only). Koog runs the graph in all modes. Cactus only loads when APIs are unavailable.

**State interchange:** LangGraph (server) and Koog (Android) use a canonical JSON schema for investigation state. Either graph can resume an investigation started by the other.

---

## 7. Role Permission Matrix

| Action | OWNER | ANALYST | CONTRIBUTOR | OPERATOR | MANAGER | VIEWER |
|--------|:-----:|:-------:|:-----------:|:--------:|:-------:|:------:|
| Create project | ✓ | — | — | — | — | — |
| Edit project settings / visibility | ✓ | — | — | — | — | — |
| Invite members, assign roles | ✓ | — | — | — | — | — |
| Start / resume investigation | ✓ | ✓ | — | — | — | — |
| Generate hypotheses | ✓ | ✓ | — | — | — | — |
| Steer at hypothesis review | ✓ | ✓ | ✓ | — | — | — |
| Assign Gemba check to operator | ✓ | ✓ | — | — | — | — |
| Submit Gemba result | ✓ | ✓ | ✓ | ✓ | — | — |
| Start own investigation | ✓ | ✓ | ✓ | ✓ | — | — |
| Override validator decision | ✓ | ✓ | — | — | — | — |
| Review / edit countermeasure | ✓ | ✓ | — | — | — | — |
| Inject context | ✓ | ✓ | ✓ | — | — | — |
| Be session driver | ✓ | ✓ | ✓ | — | — | — |
| Execute tree reset (soft/hard) | Driver only | | | | | |
| View full investigation tree | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| View assigned checks only | — | — | — | ✓ | — | — |
| View all org investigations | — | — | — | — | ✓ | — |
| Export report | ✓ | ✓ | — | — | ✓ | ✓ |
| Archive / delete project | ✓ | — | — | — | — | — |

Note: An Operator who creates their own project becomes its Owner within that project.

External invitees (non-org members) are limited to Contributor, Operator, or Viewer roles.

**This matrix shows role capability within a user's membership scope — it is not the full picture on its own.** Every checkmark above is additionally gated by whether the member is `INTERNAL` (their org matches the project's org) or `EXTERNAL` (it doesn't). `EXTERNAL` scope overrides several checkmarks regardless of role: an external Contributor cannot inject context despite the ✓ above, and an external Viewer cannot export a report despite the ✓ above. External members can see hypotheses and tree structure but never `domain_context`, RAG past-matches, external integration data, or the audit log. See [ADR-006 §External Membership Model](adr/ADR-006-project-collaboration.md) for the full `MembershipScope` enforcement model — read this matrix together with that section, not in isolation.

---

## 8. Steering Model

| Graph node | Interrupt type | Who can act |
|-----------|---------------|------------|
| `gemba_dispatcher` | `interrupt_before` — hypothesis review | Driver (Owner, Analyst, or Contributor) |
| `gemba_check` | `interrupt_before` — Gemba submission | Owner, Analyst, Contributor, Operator |
| `root_cause_validator` | `interrupt_after` — validator decision review | Driver |
| `countermeasure_generator` | `interrupt_after` — countermeasure review | Driver |

Context injection (`aupdate_state`) is available at any time and does not require an interrupt.

---

## 9. Maturity Scale

| Level | Label | Hypothesis character |
|-------|-------|---------------------|
| 1 | Basic | Missing procedures, no error-proofing, operator confusion, poka-yoke gaps |
| 2 | Developing | Recurring issues, training gaps, inconsistent standards |
| 3 | Defined | Documented failures, equipment drift, specification gaps |
| 4 | Managed | Measurement errors, process capability issues, systemic design flaws |
| 5 | Optimising | Complex failure interactions, statistical outliers, edge cases |

---

## 10. Report Formats

| Format | Primary use | Generated |
|--------|------------|-----------|
| Markdown | Working document, audit trail | Always, on investigation completion |
| PDF (WeasyPrint) | Formal submission, client delivery | On demand |
| AIAG 8D PDF | Automotive supply chain corrective action | On demand, manufacturing/automotive domains only |
| ZIP | Download all formats | On demand |

All reports include: AI-generated TL;DR, fault tree SVG, why tree, root causes, countermeasures, steering decisions log, model attribution, HMAC-SHA256 signature.

---

## 11. Permanent Non-Goals

- Not a general-purpose chatbot — investigation methodology is the core
- Not a replacement for domain expert judgment — AI proposes, humans decide
- Not public SaaS — internal enterprise tool
- No Tauri desktop client — browser serves desk users fully
- No parallel graph execution on mobile — Koog handles the full graph on device
- AIAG 8D is not the primary report format — it is an optional on-demand export

---

## 12. Product-Level Success Metrics

| Metric | Target |
|--------|--------|
| % investigations reaching confirmed root cause | > 80% of completed |
| Hypothesis acceptance rate (user keeps AI hypothesis) | > 60% unmodified |
| Gemba check completion rate | > 90% assigned vs submitted |
| Android offline Gemba submit + sync success rate | > 99% |
| Audit report acceptance rate (Phase 4) | ISO 9001 compliant output |
| External context influence on hypothesis quality | Measurably higher with RAG vs without |

---

## 13. Architecture References

| ADR | Decision |
|-----|----------|
| [ADR-001](adr/ADR-001-fastapi-gradio-server.md) | FastAPI as primary server |
| [ADR-002](adr/ADR-002-redis-checkpointer.md) | `AsyncRedisSaver` for investigation state |
| [ADR-003](adr/ADR-003-inference-search-routing.md) | Auto-mode inference + search routing (3 modes) |
| [ADR-004](adr/ADR-004-redis-namespacing.md) | Redis namespace per `project_id:investigation_id` |
| [ADR-005](adr/ADR-005-async-redis-store.md) | `AsyncRedisStore` for memory + RAG |
| [ADR-006](adr/ADR-006-project-collaboration.md) | Project collaboration model, driver, quorum |
| [ADR-007](adr/ADR-007-state-interchange-format.md) | LangGraph ↔ Koog state interchange |
| [ADR-008](adr/ADR-008-design-system-and-why-tree-library.md) | shadcn/ui + `@xyflow/react` + `d3-hierarchy` |
