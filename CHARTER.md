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
| `/health` | GET | Health check |
| `/api/v1/schemas` | GET | List available schemas |
| `/api/v1/schemas/:type` | GET | Get schema for entity type |
| `/api/v1/validate` | POST | Validate data against schema |
| `/api/v1/drift` | POST | Detect schema drift between services |

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
