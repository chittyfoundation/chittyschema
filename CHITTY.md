---
uri: chittycanon://docs/ops/architecture/chitty-schema
namespace: chittycanon://docs/ops
type: architecture
version: 1.0.0
status: DRAFT
registered_with: chittycanon://core/services/canon
title: "ChittySchema"
certifier: chittycanon://core/services/chittycertify
visibility: PUBLIC
---

# ChittySchema

> `chittycanon://core/services/chitty-schema` | Tier 0 (Trust Anchors) | schema.chitty.cc

## What It Does

Schema governance service for the ChittyOS ecosystem. Serves callable schema definitions that all services validate against at runtime. ChittyCanon defines the ontology (what types exist); ChittySchema serves the data shapes those types take.

## Architecture

Schema service deployed at schema.chitty.cc. Consumes ontology from ChittyCanon and publishes runtime-queryable schemas. Supports drift detection across services.

### Stack
- **Runtime**: Cloudflare Workers (Hono)
- **Package**: `@chittyos/schema` (published to GitHub npm registry)
- **Database**: Neon PostgreSQL (introspection via `@neondatabase/serverless`)
- **Validation**: Zod (runtime) + Ajv (meta-schema)
- **Observability**: ChittyTrack via tail consumer

### Ontology Stack
```
ChittyCanon (defines ontology)
        │
        │ publishes
        ▼
@chittyfoundation/ontology (package)
        │
        │ consumed by
        ▼
ChittySchema (serves schemas via API)
        │
        │ used by
        ▼
All Services (validate at runtime)
```

## Three Aspects (TY VY RY)

| Aspect | Abbrev | Answer |
|--------|--------|--------|
| **Identity** | TY | Schema governance — callable schema definitions for runtime validation |
| **Connectivity** | VY | Consumes ontology from ChittyCanon; serves schemas to all services via API |
| **Authority** | RY | Tier 0 — authoritative source of data shapes; no service may contradict it |

## ChittyOS Ecosystem

### Certification
- **Badge**: ChittyOS Compatible
- **Certifier**: ChittyCertify (`chittycanon://core/services/chittycertify`)
- **Last Certified**: --

### ChittyDNA
- **ChittyID**: --
- **DNA Hash**: --
- **Lineage**: root (schema trust anchor)

### Dependencies
| Service | Purpose |
|---------|---------|
| ChittyCanon | Ontology definitions (types, characterizations) |
| All Services | Serves schemas for runtime validation |
| ChittyRegister | Schema validation during registration |
| ChittyCertify | Schema compliance for certification |

### Endpoints
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/health` | GET | No | Health check (ChittyOS standard) |
| `/api/v1/status` | GET | No | Service metadata + binding status |
| `/api/tables` | GET | No | List all manifested tables with ownership |
| `/api/owners` | GET | No | Schema Owner Manifest (filterable) |
| `/api/owners/summary` | GET | No | Rollup by database/service/canonType |
| `/api/owners/:table` | GET | No | Single-table ownership lookup |
| `/api/owners/:database/:table/drift` | GET | No | Latest drift state from KV |
| `/api/owners/validate` | POST | No | On-demand drift check |
| `/api/owners/announce` | POST | No | Service deployment announcement |
| `/api/owners/announcements` | GET | No | List deployment announcements |
| `/api/validate` | POST | No | Validate data against schema |
| `/meta` | GET | No | List meta-schemas |
| `/meta/:name` | GET | No | Serve meta-schema (JSON Schema 2020-12) |
| `/api/generate/:lang/:table` | GET | No | Generate types |
| `/api/registry` | GET | No | Schema registry entries |

## Document Triad

This badge is part of a synchronized documentation triad. Changes to shared fields must propagate.

| Field | Canonical Source | Also In |
|-------|-----------------|---------|
| Canonical URI | CHARTER.md (Classification) | CHITTY.md (blockquote) |
| Tier | CHARTER.md (Classification) | CHITTY.md (blockquote) |
| Domain | CHARTER.md (Classification) | CHITTY.md (blockquote), CLAUDE.md (header) |
| Endpoints | CHARTER.md (API Contract) | CHITTY.md (Endpoints table), CLAUDE.md (API section) |
| Dependencies | CHARTER.md (Dependencies) | CHITTY.md (Dependencies table), CLAUDE.md (Architecture) |
| Certification badge | CHITTY.md (Certification) | CHARTER.md frontmatter `status` |

**Related docs**: [CHARTER.md](CHARTER.md) (charter/policy) | [CLAUDE.md](CLAUDE.md) (developer guide)
