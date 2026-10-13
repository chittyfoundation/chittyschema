# Legal / Evidence Schema Collision Audit

Status: ACTIVE AUDIT / FREEZE
Owner: ChittySchema
Upstream ontology authority: ChittyCanon
Tracking: chittyfoundation/chittyschema#86
Canon freeze: chittyfoundation/chittycanon#96
Ontology proposal: chittyfoundation/chittycanon#97

## Decision

One ontology owner, one runtime schema owner, one evidence/fact authority.

- ChittyCanon owns semantic ontology.
- ChittySchema owns runtime shapes, schema ownership, drift and compatibility.
- ChittyStorage owns source bytes and storage identity/location.
- ChittyEvidence owns evidence processing, facts/custody and governed legal evidence state.
- Everything else is a consumer, projection, router, analyzer, scorer, ledger reference, timeline, or compatibility surface unless explicitly governed otherwise.

Existing local enums are frozen as compatibility artifacts. They are not permission to create new consumers.

## Confirmed collision

The same legacy semantic bundle appears across multiple repositories:

`FACT | SUPPORTED_CLAIM | ASSERTION | ALLEGATION | CONTRADICTION`

and:

`DATE | AMOUNT | ADMISSION | IDENTITY | LOCATION | RELATIONSHIP | ACTION | STATUS`.

The first list mixes proposition semantics with relations. The second mixes value/subject types with `ADMISSION`, which is an assertion-act subtype. These lists MUST NOT be promoted as a new canonical ontology.

## Inventory

| Surface | Observed competing behavior/schema | Source confidence | Governor disposition |
|---|---|---:|---|
| `chittyfoundation/chittyschema` | Defines `fact_type`, `classification_level`, evidence tiers, evidence/facts/contradictions tables in ChittyLedger migration; generated enum copies also exist | verified default branch | **KEEP authority, MIGRATE contract** — compatibility source now; future runtime shapes must derive from Canon ontology |
| `chittyfoundation/chittychain` | Carries its own evidence-ledger schema and legacy atomic-fact classifications | verified default branch | **MERGE / PROJECT** — consume ChittySchema; no local semantic ownership |
| `chittyfoundation/chittyscore` | Embedded `chittyverify` / `chittychain` copies define evidence/fact/contradiction models | verified default branch | **RETIRE embedded schema authority**; scoring only |
| `chittyfoundation/chittyid` | Notion atomic-facts setup/sync repeats legacy enum lists | verified default branch | **PROJECT** — remove local enum authority; map from ChittySchema |
| `chittyos/chittyevidence-db` | Canonical runtime evidence pipeline; current local schemas and matrix branch can still duplicate semantics if not Canon-bound | verified default branch + active PRs | **KEEP evidence authority**; consume Canon/Schema semantics, do not own ontology |
| `chittyos/chittyrouter` | Local atomic-facts Notion schema/sync, classification/credibility enums, extraction/sync paths | verified default branch | **RETIRE/MERGE** semantic/extraction ownership; route/projection only |
| `chittyos/chittyintel` | Direct `atomic_facts` reads/writes and local assumptions about columns/classification | verified default branch | **GATEWAY / PROPOSAL PRODUCER** — analysis may propose; authoritative persistence crosses ChittyEvidence |
| `chittyos/chittyledger` | Own application schema/endpoints for atomic facts, contradiction management and evidence ledger concepts | verified default branch | **BOUNDARY MIGRATION** — ledger may reference evidence facts, not independently govern legal truth |
| `chittyos/chittychronicle` | Embedded copied `chittyverify` evidence/fact schema | verified default branch | **RETIRE clone**; Chronicle is timeline/audit projection |
| `chittyos/chittyapi` | `api-verify` contains independent evidence/atomic-facts/contradiction DDL | verified default branch | **HOLD → RETIRE or ADAPT** after runtime/traffic proof |
| `chittyos/chittyos-workspace` | Contains older/mirrored ChittySchema schemas with expanded classification enums and mapping logic | verified default branch | **MIRROR/HISTORICAL** — must not be a schema authority; reconcile then retire stale copies |
| `chittyapps/chittyevidence` | Legacy/case-specific evidence runtime with local `evidence_registry`, local categories, daemon + Worker; architecture doc itself says consolidate toward `chittyevidence-db` | verified default branch; runtime status not yet proved | **HOLD → MERGE/RETIRE runtime** after traffic/storage reconciliation |
| `chittyapps/chittychat` | Embedded `chittychain/shared/evidence-ledger-schema.ts` copy | verified default branch | **RETIRE clone / PROJECT** |
| `chicagoapps/chittycases` | Embedded ChittyChain evidence/facts services and type schema | verified default branch | **RETIRE clone / PROJECT** |
| `chittyfoundation/.chittychain` | Separate evidence-ledger SQL/docs/types with the same legacy enums | verified searchable repository | **HOLD / historical compatibility** — determine current ownership and runtime before retirement |
| `chittyfoundation/chittyledger` | Ledger service exists; no equivalent atomic-facts schema surfaced in the initial default-branch search | partial | **HOLD** — inspect runtime DB ownership and API before assigning migration |

## Collision classes

### C1 — Epistemic classification collision

Observed values:

`FACT | SUPPORTED_CLAIM | ASSERTION | ALLEGATION | CONTRADICTION`

Problem:
- `FACT` is proposition characterization;
- `SUPPORTED_CLAIM` is a proposition plus support relationship;
- `ASSERTION` / `ALLEGATION` describe assertion acts;
- `CONTRADICTION` describes a relation between propositions.

Disposition: split across Canon semantic classes + typed relations.

### C2 — fact_type collision

Observed values:

`DATE | AMOUNT | ADMISSION | IDENTITY | LOCATION | RELATIONSHIP | ACTION | STATUS`

Problem:
- most values describe proposition subject or normalized value;
- `ADMISSION` describes an assertion act.

Disposition: split `ADMISSION` from value/subject taxonomy.

### C3 — factual lifecycle collision

Observed vocabularies include:
- `DRAFT | VERIFIED | LOCKED | SUPERSEDED`;
- `draft | verified | locked | disputed | archived | rejected`.

Current legal operating governance recognizes the second set. Existing four-state projections are compatibility-only until migration is explicitly designed.

### C4 — contradiction collision

Observed forms:
- classification enum;
- `contradicts_facts` arrays;
- standalone contradiction tables;
- contradiction-resolution engines.

Disposition:
- semantic contradiction becomes a typed relation;
- detection/resolution remains an analysis/workflow record;
- no "winning fact" operation may erase the competing proposition.

### C5 — evidence treatment collision

Observed concepts include:
- evidence tier;
- source reliability;
- credibility factors;
- trust/weight;
- authentication;
- verification;
- blockchain mint status.

These are separate axes and must not be collapsed into one "strength" enum.

## Migration queue

### P0 — stop new divergence
1. Freeze new local legal/evidence enums and schema ownership.
2. Mark legacy enum definitions compatibility-only.
3. Require Canon/Schema version refs in new legal/evidence consumers.
4. Block new independent authoritative fact writers.

### P0 — authority and runtime proof
5. Verify which of the competing services are actually deployed and write-capable.
6. Identify the physical databases/tables each writer can mutate.
7. Identify all routes that create, verify, lock, dispute, correct, or resolve facts.
8. Identify all Notion/Sheets/other projection syncs that can write back upstream.

### P1 — ontology/schema convergence
9. Simulate the Scientific–Legal Epistemic Ontology.
10. Produce ChittySchema versioned runtime shapes after Canon allows provisional use.
11. Add compatibility adapters for every persisted legacy enum.
12. Move contradiction semantics to relationships without deleting historical rows.
13. Separate lifecycle, semantic class, subject taxonomy, legal treatment, and verification.

### P1 — producer migration
14. ChittyRouter → route/project only.
15. ChittyIntel → candidate/proposal producer.
16. ChittyLedger → reference/ledger projection only for legal facts.
17. ChittyChronicle → timeline/audit projection.
18. ChittyScore → scoring projection.
19. ChittyVerify/UI → read-only governed projection.
20. legacy ChittyEvidence app/runtime → reconcile then merge/retire.

### P2 — enforcement
21. ChittySchema drift gate rejects unauthorized legal/evidence enum definitions.
22. CI scans repositories for copied canonical enum literals and competing DDL.
23. Runtime contract tests reject schema-version disagreement.
24. Historical rows retain source vocabulary + compatibility mapping for audit.

## Holds / missing proof

The following must not be guessed:
- whether every discovered repo is currently deployed;
- which Notion databases remain writable/authoritative;
- whether `chittyfoundation/.chittychain` is still consumed;
- whether `chittyapps/chittyevidence` local daemon remains running anywhere;
- whether `chittyos/chittyapi/api-verify` is live;
- exact database ownership between ChittyLedger variants and current ChittyEvidence projections.

These require runtime/deployment/database inspection before destructive retirement.

## Source anchors

- ChittyCanon ontology lifecycle: `chittyfoundation/chittycanon/specs/ONTOLOGY_LIFECYCLE.md`
- ChittyCanon portfolio hardening: `chittyfoundation/chittycanon/governance/PORTFOLIO_HARDENING.md`
- Matter/Legalink authority map: `chittyfoundation/chittycanon/planning/MATTER_LEGALINK_ARCHITECTURE.md`
- ChittySchema legacy evidence migration: `chittyfoundation/chittyschema/connectivity/migrations/chittyledger/001_initial_evidence_schema.sql`
- ChittyEvidence legacy consolidation statement: `chittyapps/chittyevidence/UNIFIED_ARCHITECTURE.md`


## Runtime proof — 2026-10-13

Cloudflare account inventory confirms deployed Workers named `chittyevidence-db`, `chittyrouter`, `chittyintel`, `chittyledger`, `chittyapi`, `chittychronicle`, `chittyconnect`, `chittyschema`, `chittyid`, `chittyscore-worker`, and `chittystorage`.

Inspection of the deployed Worker bundles establishes the following write-capability findings:

### P0: chittyintel — deployed independent atomic-fact writer

The deployed `chittyintel` bundle contains:
- direct `INSERT INTO atomic_facts`;
- legacy `classification_level` semantics;
- candidate extraction logic that can label records with legacy epistemic classes;
- source code configured with `NEON_DATABASE_URL` for direct database access.

Repository source confirms both case-wide and single-evidence analysis routes call `persistFacts()` directly. This is an independent legal fact writer and is not merely a projection.

Containment PR: `chittyos/chittyintel#38` gates the legacy writer off by default pending migration to ChittyEvidence.

### P0: chittyrouter — deployed competing schema + write-capable projection

The deployed `chittyrouter` bundle contains the legacy lists:
- `DATE | AMOUNT | ADMISSION | IDENTITY | LOCATION | RELATIONSHIP | ACTION | STATUS`;
- `FACT | SUPPORTED_CLAIM | ASSERTION | ALLEGATION | CONTRADICTION`.

It also contains `NotionAtomicFactsSync` configured through `NOTION_DATABASE_ID_ATOMIC_FACTS`, with create/update upsert behavior. This proves the deployed router still carries a competing semantic contract and a write-capable projection path.

The projection must not be allowed to promote its values back into the governed ChittyEvidence store.

### P0: chittyevidence-db — deployed dual factual models

The deployed canonical evidence Worker currently contains:
- D1 `evidence_statement_of_facts` logic; and
- a separate Neon `atomic_facts` sync path.

The Neon path writes legacy classification/certainty fields while the D1 path implements the current legal fact-governance store. This is an internal split-brain risk inside the canonical service itself and must be reconciled before the Evidence Matrix contract is finalized.

### Runtime activity limitation

A Workers Observability query for the prior seven days returned zero log events for these three services. That result does **not** prove zero requests or zero writes: log availability/coverage is not established. Deployed code and configured write paths establish capability; actual recent invocation frequency remains unverified and requires database/audit-log or request-traffic evidence.

