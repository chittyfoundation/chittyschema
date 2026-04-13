---
uri: chittycanon://docs/ops/policy/chitty-schema-charter
namespace: chittycanon://docs/ops
type: policy
version: 1.0.0
status: DRAFT
registered_with: chittycanon://core/services/canon
title: "ChittySchema Charter"
certifier: chittycanon://core/services/chittycertify
visibility: PUBLIC
---

# ChittySchema Charter

## Classification
- **Canonical URI**: `chittycanon://core/services/chitty-schema`
- **Tier**: 0 (Trust Anchors)
- **Organization**: CHITTYFOUNDATION
- **Domain**: schema.chitty.cc

## Mission

ChittySchema is the **schema governance service** for the ChittyOS ecosystem. It serves callable schema definitions that all services validate against. ChittyCanon defines the ontology (what types exist); ChittySchema serves the data shapes those types take at runtime.

## Scope

### IS Responsible For
- Serving canonical schema definitions via API
- Database schema governance across the ecosystem
- Cross-service schema compatibility validation
- Schema drift detection between services
- Publishing `@chittyfoundation/ontology` package definitions

### IS NOT Responsible For
- Ontology definition and entity types (ChittyCanon)
- Individual service database migrations
- Business compliance standards (ChittyGov)
- Service registration (ChittyRegister)

## Three Aspects (TY VY RY)

Source: `chittycanon://gov/governance#three-aspects`

| Aspect | Abbrev | Question | ChittySchema Answer |
|--------|--------|----------|---------------------|
| **Identity** | TY | What IS it? | Schema governance service — serves callable schema definitions for runtime validation |
| **Connectivity** | VY | How does it ACT? | Consumes ontology from ChittyCanon; publishes schemas via API; all services validate against it at runtime |
| **Authority** | RY | Where does it SIT? | Tier 0 Trust Anchor — the authoritative source of data shapes; no service may define schemas that contradict it |

## Dependencies

| Type | Service | Purpose |
|------|---------|---------|
| Upstream | ChittyCanon | Ontology definitions (types, characterizations) |
| Downstream | All Services | Serves schemas for runtime validation |
| Peer | ChittyRegister | Schema validation during registration |
| Peer | ChittyCertify | Schema compliance for certification |

## API Contract

**Base URL**: https://schema.chitty.cc

### Core Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check (ChittyOS standard) |
| `/api/v1/status` | GET | Service metadata + binding status |
| `/api/tables` | GET | List all manifested tables with ownership |
| `/api/owners` | GET | Schema Owner Manifest (filterable by database/service/canonType/legalHold) |
| `/api/owners/summary` | GET | Rollup counts by database, service, canonType |
| `/api/owners/:table` | GET | Single-table ownership lookup (collision-aware) |
| `/api/owners/:database/:table/drift` | GET | Latest drift state from KV |
| `/api/owners/validate` | POST | On-demand drift check for one manifested table |
| `/api/owners/announce` | POST | Service deployment announcement |
| `/api/owners/announcements` | GET | List all deployment announcements |
| `/api/validate` | POST | Validate data against schema |
| `/meta` | GET | List available meta-schemas |
| `/meta/:name` | GET | Serve single meta-schema (JSON Schema 2020-12) |
| `/api/generate/:lang/:table` | GET | Generate types for python/typescript/zod |
| `/api/registry` | GET | Schema registry entries |

## Ownership

| Role | Owner |
|------|-------|
| Service Owner | ChittyFoundation |
| Technical Lead | @chittyos-infrastructure |
| Contact | schema@chitty.cc |

## Compliance

- [ ] Service registered in ChittyRegistry
- [ ] Health endpoint operational at /health
- [ ] CLAUDE.md development guide present
- [ ] CHITTY.md badge/one-pager present
- [ ] Schema serving and validation functional

## Document Triad

This charter is part of a synchronized documentation triad. Changes to shared fields must propagate.

| Field | Canonical Source | Also In |
|-------|-----------------|---------|
| Canonical URI | CHARTER.md (Classification) | CHITTY.md (blockquote) |
| Tier | CHARTER.md (Classification) | CHITTY.md (blockquote) |
| Domain | CHARTER.md (Classification) | CHITTY.md (blockquote), CLAUDE.md (header) |
| Endpoints | CHARTER.md (API Contract) | CHITTY.md (Endpoints table), CLAUDE.md (API section) |
| Dependencies | CHARTER.md (Dependencies) | CHITTY.md (Dependencies table), CLAUDE.md (Architecture) |
| Certification badge | CHITTY.md (Certification) | CHARTER.md frontmatter `status` |

**Related docs**: [CHITTY.md](CHITTY.md) (badge/one-pager) | [CLAUDE.md](CLAUDE.md) (developer guide)

---
*Charter Version: 1.0.0 | Last Updated: 2026-02-23*
