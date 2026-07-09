# Rhizolve — Sprint Map

**Total sprints:** 26 (SP00 + SP01–SP24 + SP06b removed, folded into SP00)  
**Sprint length:** 2 weeks  
**Velocity:** 20 hours/week, solo engineer + Claude Code  
**Methodology:** Sequence-based, no fixed deadline

---

## Epic Index

| ID | Epic | Sprints |
|----|------|---------|
| E01 | Foundation & Infrastructure | SP01 |
| E02 | Investigation Engine | SP02–SP03 |
| E03 | Identity & Access | SP04–SP05 |
| E04 | Project & Collaboration | SP05–SP06, SP15–SP16 |
| E05 | Web Client | SP00, SP07–SP10 |
| E06 | Android Client | SP12–SP14 |
| E07 | Connectivity & Intelligence Routing | SP11 |
| E08 | Reporting & Compliance | SP17–SP18 |
| E09 | Institutional Memory | SP19–SP20 |
| E10 | Rhizolve MCP Server | SP21 |
| E11 | External MCP Integrations | SP22–SP23 |
| E12 | Integration Test Suite | SP24 |

---

## Sprint Map

| Sprint | Epic(s) | Focus | Key output |
|--------|---------|-------|------------|
| **SP00** | E05 | Design system spike, UX wireframing spike (Miro/Linear/Together AI synthesis via getdesign.md), DESIGN.md per Google Stitch spec, SVG/asset generation via Opus + Fable | `DESIGN.md` merged and lint-clean before any implementation begins; brand assets and wireframes ready |
| **SP01** | E01 | Monorepo, CI/CD, Redis, FastAPI skeleton, ADRs | Stack runs locally, CI green, `system_or_process_context` renamed |
| **SP02** | E02 | Chat agent, Shallow/Deep mode, `/btw` thread, parameter extraction, cross-session memory | Conversational agent answers shallow + triggers deep |
| **SP03** | E02 | LangGraph graph, all 9 nodes, 4 interrupt points, steering resumes, context injection, compaction. US-11 gained T04a-c (`gemba_dispatcher` body + `FiveWhysAgent` wrapper) to cover a gap no story owned. | Full investigation completable in tests |
| **SP04** | E03 | Clerk auth integration, org creation, user sync, internal + external invitation | Users can log in, org populated from Clerk |
| **SP05** | E03 + E04 | RBAC middleware, project CRUD, 6 roles, visibility, Gemba assignment | Projects created, members invited, access enforced |
| **SP06** | E04 | Real-time presence, driver model, quorum, readiness signal, Gemba attachments, tree reset | Collaborative session features complete |
| **SP07** | E05 | Three-column React layout, auth screens, project list, chat thread shell | User can log in and see projects |
| **SP08** | E05 | Investigation setup, hypothesis review card, Gemba check card, mode indicator | User can start and advance an investigation |
| **SP09** | E05 | Validator review card, countermeasure review card, context injection, `/btw` panel, why tree | Full investigation completable from browser |
| **SP10** | E01 + E05 | HF Spaces deployment, Dockerfile, pilot launch, smoke tests | App live on HF Spaces, pilot team investigating |
| **SP11** | E07 | Network monitor, inference router, search router, Cactus proactive download | Auto-mode routing works on emulator |
| **SP12** | E06 | Android project init, Koog graph on device, HITL workaround, Room DB | Graph runs offline on emulator |
| **SP13** | E06 | Full Compose UI, hypothesis/Gemba/validator/countermeasure cards, why tree diagram, voice input | Full investigation completable on Android |
| **SP14** | E06 + E07 | FCM push, Gemba assignment on Android, My Checks screen, signal transition prompts, state sync endpoint | Operator receives assignments, offline transitions work |
| **SP15** | E04 + E05 | SSE stream endpoint, React `useInvestigationStream`, presence bar, readiness panel | Web collaborators see live updates |
| **SP16** | E04 + E06 | Android polling, conflict resolution UI, notification deep links, concurrent investigation testing | Multi-user investigation confirmed stable |
| **SP17** | E08 | ISO standard selection, AI TL;DR, server-side fault tree SVG, enhanced markdown report | Report includes TL;DR, fault tree, steering log |
| **SP18** | E08 | WeasyPrint PDF, AIAG 8D export, HMAC signing, audit trail, ZIP download | All report formats downloadable, audit trail complete |
| **SP19** | E09 | Maturity model, AsyncRedisStore setup, investigation indexing, maturity-aware prompts | Completed investigations indexed in vector store |
| **SP20** | E09 | RAG retrieval in why_generator, past matches in hypothesis review, structured + document import | Institutional memory surfaces in new investigations |
| **SP21** | E10 | SP-14 spike, FastMCP 3.0 OpenAPIProvider, 14 tools verified, Claude Desktop tested | Rhizolve callable as MCP provider |
| **SP22** | E11 | SP-15 spike, context translation layer, freshness governance, Twenty.com integration | Twenty.com context enriches investigations |
| **SP23** | E11 | Plane.so integration, ERPNext integration, countermeasure pushback to external systems | All three open source integrations live |
| **SP24** | E12 | Seed data per platform, 9 scenarios, integration test suite, customer showcase PDF | Full showcase with 9 real-world demonstrations |

---

## Spike Index

| ID | Spike | Sprint | Time-box |
|----|-------|--------|----------|
| SP-01 | Upstash Redis + `AsyncRedisSaver` HTTPS compatibility | SP01 | 0.5 day |
| SP-02 | `interrupt_after` sequencing with conditional edges | SP02 | 1 day |
| SP-03 | Clerk SDK FastAPI integration — token verification approach | SP04 | 0.5 day |
| SP-04 | Email delivery — Resend vs Postmark Python SDK | SP05 | 0.5 day |
| SP-05 | SSE reliability on HF Spaces — nginx buffering | SP06 | 1 day |
| SP-00a | Design system & why-tree lib — RESOLVED: shadcn/ui + @xyflow/react + d3-hierarchy (see ADR-008) | SP00 | 1 day |
| SP-00b | UX research and wireframing — comparable tools review | SP00 | 2 days |
| SP-08 | Cactus model download — proactive vs lazy; OOM risk on budget devices | SP11 | 1 day |
| SP-09 | Koog HITL — shipped in 1.0.0 or still open issue #2064? | SP12 | 0.5 day |
| SP-10 | Koog Android APK size and incompatible transitive dependencies | SP12 | 1 day |
| SP-11 | Audit log storage — Redis Streams vs Postgres append-only table | SP17 | 1 day |
| SP-12 | AsyncRedisStore vector search threshold calibration | SP19 | 2 days |
| SP-13 | Embedding cost projection at 100 investigations/month | SP19 | 0.5 day |
| SP-14 | FastMCP 3.0 OpenAPIProvider with Rhizolve FastAPI — tool auto-generation | SP21 | 2 days |
| SP-15 | Open source MCP availability — Twenty.com, Plane.so, ERPNext | SP22 | 2 days |
| SP-16 | Embedding provider — OpenRouter embeddings API availability; Android on-device RAG accept/reject decision (Liquid AI `LFM2.5-Embedding-350M`) | SP19 | 2 days |

---

## Dependency Chain

```
SP00 (E05 design — DESIGN.md, wireframes, assets; no code, precedes all implementation)
  └── SP01 (E01)
        └── SP02 → SP03 (E02)
              └── SP04 → SP05 (E03/E04)
                    └── SP06 (E04)
                          └── SP07 → SP08 → SP09 → SP10 (E05)
                                                      └── SP11 (E07)
                                                            └── SP12 → SP13 (E06)
                                                                        └── SP14 (E06/E07)
                                                                              └── SP15 → SP16 (E04/E05/E06)
                                                                                          └── SP17 → SP18 (E08)
                                                                                                      └── SP19 → SP20 (E09)
                                                                                                                  └── SP21 (E10)
                                                                                                                        └── SP22 → SP23 (E11)
                                                                                                                                    └── SP24 (E12)
```

---

## Phase Gates

| Gate | Condition | Blocks |
|------|-----------|--------|
| After SP10 | 5 completed pilot investigations with written feedback | SP15 onwards |
| After SP14 | Android offline investigation end-to-end on 3 AVD levels | SP15 |
| After SP16 | 5 concurrent investigations without state collision | SP17 |
| After SP20 | RAG hypothesis quality measurably higher vs without | SP21 |
| After SP24 | All 9 integration scenarios green | Release |
