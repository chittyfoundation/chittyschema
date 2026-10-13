---
title: "Legal/Evidence Schema Collision Audit"
date: 2026-10-13
status: DRAFT
tracks:
  - chittyfoundation/chittycanon#96
  - chittyfoundation/chittycanon#97
  - chittyfoundation/chittyschema#88
visibility: INTERNAL
---

# Legal/Evidence Schema Collision Audit — 2026-10-13

## Executive finding

The portfolio contains **multiple independently evolved legal/evidence semantic models**. Several are copies of the same early Evidence Ledger model; others are newer schemas with incompatible lifecycle or classification semantics.

This is a governance risk because the same words currently mean different things in different runtimes.

The required architecture is:

```text
ChittyCanon              semantic ontology + canonical identifiers
      ↓
ChittySchema             versioned runtime shapes + collision/drift gates
      ↓
ChittyEvidence           evidence processing + governed factual state/custody
      ↓
Canonical Evidence Set / Matrix
      ↓
controlled projections: UI / agents / ledger refs / CSV / filing maps / analytics
```

**Freeze rule:** no repository may introduce another legal/evidence semantic enum or factual lifecycle while Canon issue #96 is open. Existing definitions are compatibility inputs, not proof of canonical status.

## Canonical owner decisions

| Capability | Decision | Canonical owner | Notes |
|---|---|---|---|
| Legal/evidence ontology | KEEP | ChittyCanon | P/L/T/E/A remains core; Scientific–Legal Epistemic Ontology is PROPOSED in Canon PR #97. |
| Runtime schema shapes | KEEP / REFACTOR | ChittySchema | Must reference Canon semantic identifiers and publish compatibility mappings. |
| Source bytes / storage identity | KEEP | ChittyStorage | No legal factual-lifecycle ownership. |
| Evidence processing + governed factual state | KEEP / HARDEN | chittyos/chittyevidence-db | One legal evidence authority; must consume Canon/Schema semantics. |
| Immutable audit/hash-chain substrate | KEEP | chittyfoundation/chittyledger | Ledger only. Evidence projections reference governed evidence; Ledger does not define truth. |
| Evidence UI | PROJECT | ChittyVerify / other clients | Read-only projection; no independent schema authority. |
| Legal analysis / work product | PROJECT | ChittyCounsel | Separate from evidence and factual lifecycle. |
| Timeline/audit projection | PROJECT | ChittyChronicle | Must reference canonical evidence/fact IDs. |
| Scoring | PROJECT | ChittyScore | Scores records; does not define semantic class/lifecycle. |
| Routing / integration | GATEWAY | ChittyRouter / ChittyConnect | No independent legal-fact persistence. |

## Semantic collisions

### Legacy `classification_level`

Observed values:

`FACT | SUPPORTED_CLAIM | ASSERTION | ALLEGATION | CONTRADICTION`

This is not a coherent ontology axis:

- `FACT` is being used as a proposition/truth posture.
- `SUPPORTED_CLAIM` combines proposition class with an evidentiary relationship.
- `ASSERTION` / `ALLEGATION` describe assertion acts.
- `CONTRADICTION` is a relationship between propositions.

**Disposition:** compatibility-only. New contracts must decompose these dimensions.

### Legacy `fact_type`

Observed values:

`DATE | AMOUNT | ADMISSION | IDENTITY | LOCATION | RELATIONSHIP | ACTION | STATUS`

Most values describe normalized value/subject shapes, but `ADMISSION` is an assertion-act subtype.

**Disposition:** compatibility-only. `ADMISSION` must not remain in a value datatype taxonomy.

### Factual lifecycle collision

Observed models include:

- `DRAFT → VERIFIED → LOCKED → SUPERSEDED`
- `draft | verified | locked | disputed | archived | rejected`
- `extracted | verified | disputed | rejected`
- evidence-level `pending | verified | rejected | disputed`

The legal operating constitution currently governs factual state as:

`draft | verified | locked | disputed | archived | rejected`

with `locked` terminal. Corrections create a new version and archive the prior record where permitted.

**Disposition:** lifecycle is a distinct governed axis. Evidence-processing status and evidence-authentication status must not be reused as fact lifecycle.

## Repository/runtime collision inventory

| Repository / artifact | Observed competing surface | Runtime confidence | Risk | Disposition | Tracking |
|---|---|---:|---:|---|---|
| **chittyfoundation/chittycanon** | Canon ontology + lifecycle | verified authority | critical | **KEEP** | #96, PR #97 |
| **chittyfoundation/chittyschema** | `connectivity/migrations/chittyledger/001_initial_evidence_schema.sql`; generated enum/types/docs | verified authority but semantically stale | critical | **KEEP / REFACTOR** | #88 |
| **chittyos/chittyevidence-db** | `evidence_statement_of_facts`, `evidence_extracted_facts`, Neon `atomic_facts`, processing workflow | verified active evidence code; production details require bounded validation | critical | **KEEP / HARDEN** | #158; PR #159 closed/blocked |
| **chittyfoundation/chittyledger** | hash-chain ledger / custody entries | verified canonical substrate | high | **KEEP** | no collision issue needed; protect boundary |
| **chittyos/chittystorage** | storage/classification helpers | active surface known | high | **KEEP / BOUNDARY** | chittyos/chittystorage#91 |
| **chittyfoundation/chittychain** | `master_evidence`, `atomic_facts`, legacy enums | code verified; deployment status not yet proven | critical | **PROJECT or RETIRE semantic ownership** | #6 |
| **chittyfoundation/.chittychain** | `evidence-ledger-schema.sql`, contradiction tracking | code verified; runtime reachability unknown | critical | **HOLD** | #10 |
| **chittyfoundation/chittyscore** | embedded `chittyverify` and `chittychain` evidence schemas/services | code verified; runtime reachability mixed/unknown | critical | **RETIRE/HOLD embedded copies** | #5 |
| **chittyfoundation/chittyid** | Notion legal-fact select enums / sync | code verified; active use unknown | high | **PROJECT** | #29 |
| **chittyos/chittyrouter** | Notion atomic-facts DB, hard-coded enums, extraction/sync | code verified | critical | **GATEWAY / MERGE** | chittyos/chittyrouter#116 |
| **chittyos/chittyintel** | direct `atomic_facts` persistence and analysis routes | code verified | critical | **MERGE** into proposal→Evidence governance path | chittyos/chittyintel#37 |
| **chittyos/chittyledger** | legacy evidence UI/schema/backend | repo/code verified; Foundation Ledger says no deploy | high | **RETIRE** | chittyos/chittyledger#23 |
| **chittyos/chittyverify** | evidence UI | intended thin client | medium | **PROJECT** | chittyos/chittyverify#61 |
| **chittyos/chittyscore** | copied ChittyVerify schema/backend | code verified | high | **RETIRE embedded copy** | chittyos/chittyscore#28 |
| **chittyos/chittychronicle** | copied ChittyVerify schema/routes | code verified | high | **RETIRE embedded copy / PROJECT timeline** | chittyos/chittychronicle#46 |
| **chittyos/chittyconnect** | evidence routes / gateway | active gateway | high | **GATEWAY** | chittyos/chittyconnect#350 |
| **chittyos/chittyapi** | `api-verify/src/index.ts` defines evidence, atomic_facts, contradictions | code verified; deploy/write target unknown | critical | **HOLD / GATEWAY** | chittyos/chittyapi#137 |
| **chittyos/chittyos-workspace** | multiple incompatible mirrored ChittySchema DB schemas + direct AI evidence writer | code verified; workspace default branch is nonstandard; production reachability unknown | critical | **RETIRE AS AUTHORITY** | chittyos/chittyos-workspace#12 |
| **chittyapps/chittyevidence** | case-specific daemon/Worker, local `evidence_registry`, claims evidence.chitty.cc | code and charter verified; live runtime not proven in this audit | critical | **MERGE / RETIRE** into chittyevidence-db | #15 |
| **chittyapps/chittychat** | embedded ChittyChain evidence schemas | code verified; runtime reachability unknown | high | **RETIRE/HOLD embedded copy** | #33 |
| **chicagoapps/chittycases** | embedded ChittyChain fact service/types/Notion client | code verified; runtime reachability unknown | high | **PROJECT / MERGE** | #94 |

## Additional duplicate family

The same legacy Evidence Ledger taxonomy appears across multiple repositories and generations:

- `chittyfoundation/chittychain/shared/evidence-ledger-schema.ts`
- `chittyfoundation/chittyscore/chittyverify/shared/schema.ts`
- `chittyfoundation/chittyscore/chittypm/chittychain/shared/evidence-ledger-schema.ts`
- `chittyos/chittyscore/chittyverify/shared/schema.ts`
- `chittyos/chittychronicle/chittyverify/shared/schema.ts`
- `chittyapps/chittychat/chittychain/shared/evidence-ledger-schema.ts`
- `chicagoapps/chittycases/chittychain/lib/evidence-ledger/*`
- Notion bridges/setup scripts in ChittyID and ChittyRouter
- older workspace copies under `chittyos/chittyos-workspace/CHITTYFOUNDATION/chittyschema`

These are **not evidence that the duplicated enum is canonical**. They are evidence of propagation.

## Migration doctrine

1. **Freeze semantics first.** No new local legal/evidence enums.
2. **Inventory runtime reachability.** A source file existing is not proof it is deployed.
3. **Map, do not overwrite.** Preserve legacy values and map to canonical semantic IDs.
4. **Generate contracts.** Consumers import/generated types from ChittySchema instead of copying lists.
5. **Single writer boundary.** Legal factual state changes through ChittyEvidence fact governance.
6. **Projections carry identity.** Every UI/export retains canonical fact/proposition ID, version, source/provenance reference, and schema/ontology version.
7. **Contradiction is relational.** Preserve both propositions; never replace one with a “winner” by schema side effect.
8. **Assertion act ≠ asserted truth.** An authentic allegation/admission/testimony record does not automatically verify its proposition.
9. **No destructive backfill.** Compatibility adapters precede any persisted schema migration.
10. **Release drift gate.** Any deploy touching legal/evidence semantics fails closed when its consumed Canon/Schema versions are incompatible.

## Immediate migration queue

### P0 — block semantic multiplication

- Canon #96: maintain semantic freeze.
- Canon PR #97: run ontology simulation/collision review; do not promote directly to CANONICAL.
- ChittySchema #88: enumerate every owned legal/evidence table/type and publish compatibility map.
- ChittyEvidence #158: rewrite Matrix as a projection of Canon/Schema, not a local ontology.
- ChittyAPI #137: determine whether api-verify is an active writer.
- ChittyApps Evidence #15: determine live daemon/Worker ownership and stop duplicate evidence service authority.
- Workspace #12: prevent mirrored ChittySchema from serving as an authority.
- Foundation ChittyChain #6 and .chittychain #10: prove runtime usage and isolate ledger/proof from legal semantics.

### P1 — migrate projections and duplicate consumers

- Router #116
- Intel #37
- Foundation ChittyScore #5
- Foundation ChittyID #29
- OS ChittyScore #28
- Chronicle #46
- Verify #61
- Connect #350
- Storage #91
- ChittyChat #33
- ChittyCases #94

## Holds / missing evidence

The audit intentionally does **not** assume runtime state from repository presence alone.

Still to prove:
- which duplicate schema files are compiled into deployed artifacts;
- which databases are currently written by ChittyChain, ChittyAPI api-verify, ChittyApps Evidence, and embedded ChittyVerify copies;
- whether any Notion atomic-fact database is still a write source rather than a projection;
- exact consumer graph of the legacy `classification_level` and `fact_type` enums;
- live registry/deployment mapping for competing `evidence.chitty.cc` claims.

Until those are proven, the appropriate disposition is HOLD or compatibility-only — not deletion.

## Non-collision clarification

**chittyfoundation/chittyledger is not the legacy evidence application.** Its current charter/README define the canonical immutable ledger substrate. The conflicting legacy evidence UI is **chittyos/chittyledger**. Do not merge or retire the Foundation ledger while cleaning up the legacy repo.

## Exit criteria

This audit is not complete until:

- [ ] every legal/evidence semantic definition is owned by Canon/Schema or explicitly marked compatibility-only;
- [ ] every active writer is identified;
- [ ] every active writer has one governed write path;
- [ ] every projection imports/references a versioned canonical contract;
- [ ] collision/drift CI blocks new local enum/schema divergence;
- [ ] legacy records remain readable and auditable;
- [ ] ChittyEvidence emits one referencible/verifiable canonical data set;
- [ ] Ontology Guardian has reviewed the ontology promotion stage.
