---
service_chittyid: "TBD-pending-canonical-mint"
service_name: "chittyschema"
canonical_uri: "chittycanon://core/services/chittyschema"
pentad_version: "0.1.0"
required_for_tier: 0
last_reviewed: "2026-05-26"
---

# ChittySchema — Threat Model (Tier 0)

## 1. STRIDE

| Threat | Vector | L | I | Mitigation |
|---|---|---|---|---|
| Spoofing | Forged schema_registry entry | L | C | Schema signing; ledger anchor |
| Tampering | Mutate schema after publish | L | C | Append-only schema versions; CHECK constraints |
| Repudiation | Schema author denies authorship | L | M | Author ChittyID on every schema row |
| Info Disclosure | Reveal internal schema fields | L | M | Public schemas are public; private flag enforces ACL |
| DoS | Schema validate request storm | M | M | Rate limit; cache validations |
| Elevation | Inject invalid schema accepted | L | C | Strict JSON-schema validation; reviewer-class required for promotion |

## 2. Abuse cases

### AC-1: Schema poisoning
Adversary publishes a schema with overly permissive fields; downstream services use it as authoritative.
- **Mitigation**: schema registry requires reviewer approval before promotion to `ratified`

### AC-2: Empty registry exploit (current state per F-055)
- **Current**: `schema_registry` table is empty — there are NO ratified canonical schemas to validate against
- **Risk**: validators fall through to no-check or hardcoded fallbacks
- **Mitigation**: populate registry as part of Wave A backfill (per SOP-040 backfill schedule)

## 3. Mitigations

| Threat | Status |
|---|---|
| Spoofing | implemented |
| Tampering | partial (per F-055 — empty registry) |
| Repudiation | partial |
| Info Disclosure | implemented |
| DoS | implemented |
| Elevation | partial |

## 4. Residual risk

- Per F-055, registry is empty; no schemas exist to validate against. Until populated, this service has no useful function.

## 5. Review cadence

- Next review: 2026-08-26
