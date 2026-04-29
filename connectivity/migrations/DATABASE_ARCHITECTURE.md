# ChittyOS Database Architecture — What Goes Where

**Status**: BINDING | **Date**: 2026-04-23 | **Owner**: ChittySchema
**Canon**: `chittycanon://gov/governance#database-architecture`

## Principle

**ChittyOS-Core holds cross-service primitives. Domain data lives in per-service Neon projects.**

A table belongs in Core if and only if multiple services need to read or write it. If a table is owned and consumed by a single service, it belongs in that service's own project.

## Neon Organization Map

| Org | Purpose |
|-----|---------|
| Chitty(OS/APPS) Central | Active service databases |
| ChittyFoundation | Foundation-tier governance databases |
| Chitty - Vercel | Vercel-managed deployments |
| Furnished-Condos.com | Property/rental domain |
| ChittyCorp LLC | Reserved (empty) |

## ChittyOS-Core (restless-grass-40598426) — What Belongs Here

Core is the shared platform database. Only these table families belong:

### Identity (Tier 0 — ChittyID)
`identities`, `identity_phones`, `credentials`, `chittyid_audit`

Cross-service identity resolution. Every service reads identities.

### Trust (Tier 0 — ChittyTrust)
`trust_scores`, `trust_networks`, `verifications`

Cross-service trust assessment. Read by auth, registry, and domain services.

### Auth (Tier 1 — ChittyAuth)
`api_tokens`, `oauth_clients`, `oauth_authorization_codes`, `mcp_client_bindings`

Platform-wide authentication and authorization.

### Registry (Tier 1 — ChittyRegister)
`service_registrations`, `service_validations`, `service_bindings`, `service_capabilities`, `service_certifications`, `service_registration_events`, `service_health_history`, `registrations`, `discovered_services`, `discovery_cache_metadata`

Ecosystem service catalog. Read by discovery, monitor, and all services at startup.

### Chronicle (Tier 3 — ChittyChronicle)
`chronicle_events`, `audit_logs`

Immutable cross-service audit trail.

### Canon (Tier 0 — ChittyCanon)
`ontology_terms`, `canon_audit_log`, `known_abbreviations`, `reserved_words`, `standards_sources`, `standards_terms`, `term_observations`, `divergence_registry`, `schema_registry`

Ontology governance. Read by schema validation, code auditing.

### Fractal Scopes (Cross-service)
`scopes`, `scope_parties`, `scope_events`, `scope_artifacts`

The fractal scope primitive. **Every service projects scopes here** so there is one place to query "what is happening across the entire ecosystem." This is the canonical cross-service state container.

**Scopes are truly fractal — they exist at every level.** Each service writes to its own `scopes` table (authoritative) AND to Core (aggregation). The service DB is the source of truth for its own scopes. Core provides cross-service queryability — one `SELECT * FROM scopes WHERE status = 'active'` returns active workflows from all services.

Run `002_fractal_scopes.sql` on **both** Core and each service's own Neon project.

## Per-Service Projects — What Belongs There

Each service that owns domain data gets its own Neon project. Domain data = tables that only that service reads and writes.

| Service | Neon Project | Tables |
|---------|-------------|--------|
| ChittyFinance | `solitary-rice-14149088` | accounts, transactions, tenants, users, properties, leases, etc. |
| ChittyCommand | `cool-bar-13270800` | cc_* tables (disputes, obligations, properties, scrape_jobs, etc.) |
| ChittyCounsel | `broad-smoke-03361608` | counsel-specific case management |
| ChittyLedger | `shy-sound-75632194` | immutable event ledger |
| ChittyCanon | `weathered-mud-04119716` | canon governance (may overlap with Core canon tables) |
| ChittyRental | `young-mouse-42795827` | rental/property management |

## Squatter Tables in Core (Migration Backlog)

These tables are currently in ChittyOS-Core but belong in per-service projects. They were created before per-service DBs existed. Migrate incrementally — when touching a service, move its tables out.

| Tables | Should Be In | Priority |
|--------|-------------|----------|
| `accounts`, `transactions`, `intercompany_transactions`, `tenants`, `tenant_users`, `users`, `tasks`, `integrations`, `properties`, `property_valuations`, `units`, `leases`, `ai_messages` | ChittyFinance | Low (finance already has own project with these tables) |
| `cc_*` (13 tables) | ChittyCommand | Medium |
| `cases`, `evidence`, `chain_of_custody`, `contradictions`, `analysis_results`, `alignment_map`, `atomic_facts`, `semantic_documents` | ChittyEvidence (new project) | Medium |
| `reception_calls`, `reception_messages`, `reception_sessions` | ChittyReception (new project) | Low |
| `switchboard_calls`, `switchboard_messages`, `switchboard_workflow_audit` | ChittySwitchboard (new project) | Low |
| `chittycan_events`, `chittycan_sessions` | ChittyCan (new project) | High (25MB, largest table) |
| `leadership_initiatives` | ChittyCommand | Low |
| `spatial_ref_sys` | Drop (PostGIS artifact, 7MB, unused) | Low |

## Hyperdrive Bindings

Workers connect to Neon via Cloudflare Hyperdrive (TCP connection pooling, no raw credentials in secrets).

| Hyperdrive Config | Neon Project | Used By |
|-------------------|-------------|---------|
| `neondb-chittyos-core` (1d126444...) | ChittyOS-Core | Scope projector (all services) |
| `chittycommand-db` (6f6cba43...) | ChittyCommand | ChittyCommand Worker |
| `chittycounsel-neon` (38d25002...) | ChittyCounsel | ChittyCounsel Worker |
| `chittyledger-dispute` (bd15768d...) | ChittyLedger | ChittyDispute Worker |
| `neondb-chittyledger` (f44961eb...) | ChittyLedger | Legacy |

### Scope Projector Wiring

The scope projector writes to **two targets** in parallel (fractal dual-write):
- **`SERVICE_SCOPE_DB`** (Hyperdrive) or `SERVICE_SCOPE_DATABASE_URL` (env var) → service's own scopes table (authoritative)
- **`CHITTYOS_CORE_DB`** (Hyperdrive) or `CHITTYOS_CORE_DATABASE_URL` (env var) → Core scopes table (aggregation)

Either target may be absent — the projector writes to whichever is configured. Both use `Pool` (TCP) for Hyperdrive or `neon()` (HTTP) for direct URLs.

## Credential Delivery

Two mechanisms, depending on whether the connection needs TCP pooling:

### Hyperdrive (for scope projector and high-traffic connections)
- Provides TCP connection pooling + query caching
- Configured once, bound to Workers via `[[hyperdrive]]` in wrangler.toml
- Scope projector uses `Pool` from `@neondatabase/serverless` with `env.CHITTYOS_CORE_DB.connectionString`

### Cloudflare Secrets Store (for domain DB connection strings)
- Centralized secret management — one secret, many Workers
- Store ID: `e914522471964c3c8cf1e601770edcc3` (default_secrets_store)
- Bound via `[[secrets_store_secrets]]` in wrangler.toml
- Provisioned via `setup-secrets.sh` in each service (chains Neon API → CF Secrets Store, credential never in CLI args)

### What NOT to use
- `wrangler secret put` with pasted values — credentials end up in terminal history
- Raw connection strings in wrangler.toml `[vars]` — plaintext in source control
- Hardcoded credentials anywhere — blocked by hook `block-credentials-in-commands.sh`

## Rules for New Tables

1. **Ask: does more than one service need this table?** If yes → Core. If no → service project.
2. **Never create domain tables in Core.** If the service doesn't have a Neon project yet, create one.
3. **Scopes go to Core.** Run `002_fractal_scopes.sql` on Core, not on service DBs.
4. **Use Hyperdrive for Core connections.** Scope projector and high-traffic reads use `neondb-chittyos-core` Hyperdrive.
5. **Use CF Secrets Store for service DB credentials.** Provision via `setup-secrets.sh` pattern — Neon API → pipe → CF Secrets Store.
6. **Prefix convention for Core**: no prefix needed (shared namespace). For service DBs: use the service's table naming convention.
