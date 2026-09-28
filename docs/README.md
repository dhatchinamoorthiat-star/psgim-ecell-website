# PSGIM E-Cell Platform — Documentation

Start with **[ARCHITECTURE_DECISION_RECORD](ARCHITECTURE_DECISION_RECORD.md)** (the frozen baseline) and **[PHASE_1_AUTHORIZATION](PHASE_1_AUTHORIZATION.md)** (go/no-go and open human decisions).

| Decision docs | |
|---|---|
| [ARCHITECTURE_DECISION_RECORD](ARCHITECTURE_DECISION_RECORD.md) | current state, 5 decisions, target architecture, principles |
| [ADR-008 Backend hosting](ADR-008-BACKEND-HOSTING.md) | Render paid + Neon; fallback Cloud Run |
| [ADR-009 Cloudflare deployment](ADR-009-CLOUDFLARE-DEPLOYMENT.md) | what the `ECell` branch means; target CI |
| [ORGANIZATIONAL_STRUCTURE](ORGANIZATIONAL_STRUCTURE.md) | vertical evidence (unconfirmed) |
| [PHASE_1_AUTHORIZATION](PHASE_1_AUTHORIZATION.md) | blockers classification |
| [PHASE_1_IMPLEMENTATION_NOTES](PHASE_1_IMPLEMENTATION_NOTES.md) | what Phase 1 built, how to run and test it, limitations |
| [ADR-010 Governance grant exemption](ADR-010-GOVERNANCE-GRANT-EXEMPTION.md) | contradiction found in Phase 1 and its resolution |
| [PHASE_2_AUTHORIZATION](PHASE_2_AUTHORIZATION.md) | Phase 2 go/no-go — AUTHORIZED (session override 2026-09-28), N-3/N-4/F9 still open |
| [ADR-011 CMS content model](ADR-011-CMS-CONTENT-MODEL.md) | typed relational detail models vs. generic JSON — ACCEPTED |
| [ADR-012 Event model split](ADR-012-EVENT-MODEL-SPLIT.md) | content/operational split for Event — PROPOSED |
| [ADR-013 Visual page builder](ADR-013-VISUAL-PAGE-BUILDER.md) | Canva/Figma-like block editor, extends ADR-011 — IMPLEMENTED (Phase 2A), proposed for ratification |

| # | Doc | Also referred to as |
|---|---|---|
| 00 | [Audit](00_AUDIT.md) | |
| 01 | [Product requirements](01_PRODUCT_REQUIREMENTS.md) | |
| 02 | [System architecture + ADRs](02_SYSTEM_ARCHITECTURE.md) | |
| 03 | [RBAC model](03_RBAC_MODEL.md) | |
| 04 | [Permission matrix](04_PERMISSION_MATRIX.md) | |
| 05 | [Data model](05_DATA_MODEL.md) | DATA_MODEL.md |
| 06 | [CMS architecture](06_CMS_ARCHITECTURE.md) | |
| 07 | [Content workflow](07_CONTENT_WORKFLOW.md) | |
| 08 | [Event operating model](08_EVENT_OPERATING_MODEL.md) | |
| 09 | [Audit log spec](09_AUDIT_LOG_SPECIFICATION.md) | |
| 10 | [Academic year & succession](10_ACADEMIC_YEAR_AND_SUCCESSION.md) | |
| 11 | [Knowledge base](11_KNOWLEDGE_BASE.md) | |
| 12 | [API contract](12_API_CONTRACT.md) | API_CONTRACT.md |
| 13 | [Frontend architecture](13_FRONTEND_ARCHITECTURE.md) | |
| 14 | [Design system](14_DESIGN_SYSTEM.md) | DESIGN_SYSTEM.md |
| 15 | [Migration plan](15_MIGRATION_PLAN.md) | |
| 16 | [Deployment](16_DEPLOYMENT.md) | DEPLOYMENT.md |
| 17 | [Developer handover](17_DEVELOPER_HANDOVER.md) | DEVELOPER_HANDOVER.md |
| 18 | [Testing strategy](18_TESTING_STRATEGY.md) | |
| 19 | [Implementation roadmap](19_IMPLEMENTATION_ROADMAP.md) | |
| 20 | [CMS content model (Phase 2 proposal)](20_CMS_CONTENT_MODEL.md) | |
| 21 | [CMS workflow (Phase 2 operationalization)](21_CMS_WORKFLOW.md) | |
| 22 | [Legacy migration matrix](22_MIGRATION_MATRIX.md) | |
| 23 | [Operations model: content vs. event](23_OPERATIONS_MODEL.md) | |
| 24 | [Succession & governance](24_SUCCESSION_GOVERNANCE.md) | |
| 25 | [Visual editor architecture](25_VISUAL_EDITOR_ARCHITECTURE.md) | Phase 2A implemented; 2B-2E not built |
