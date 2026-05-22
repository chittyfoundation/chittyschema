# CLAUDE.md

## Project Overview

ChittySchema is the schema governance service for the ChittyOS ecosystem. It serves callable schema definitions that all services validate against at runtime. ChittyCanon defines the ontology (what types exist); ChittySchema serves the data shapes those types take. Includes generated TypeScript types, Zod validators, a Hono API worker, and database introspection tooling.

**Repo:** `CHITTYFOUNDATION/chittyschema`
**Deploy:** Cloudflare Workers at `schema.chitty.cc`
**Stack:** Hono TypeScript (API), Zod (validation), PostgreSQL (introspection), Cloudflare KV
**Canonical URI:** `chittycanon://core/services/chittyschema` | Tier 0
**Package:** `@chittyos/schema` (published to GitHub npm registry)

## Repository Layout — Fractal Trinity

This repo follows the ChittyOS fractal trinity layout (identity / authority / connectivity), mirroring the `scopes` data primitive at the directory level. See `scope.json` at the repo root for the scope manifest.

```
<repo>/
├── identity/                    # ChittyID layer — what this service IS
│   ├── src/                     # source code
│   │   ├── types/               # generated TS (per database)
│   │   ├── validators/          # generated Zod (per database)
│   │   └── generated/           # introspected schema.json snapshots
│   ├── agents/                  # subagent definitions (chittyschema-overlord)
│   ├── scripts/                 # introspect / generate / validate / migrate
│   ├── schemas/                 # JSON Schema definitions served at /meta/*
│   ├── docs/                    # generated schema documentation
│   ├── cli.ts                   # CLI entry point
│   └── README.md
│
├── authority/                   # ChittyTrust + ChittyCert + ChittyCanon layer
│   ├── canon/                   # chittycanon:// citations
│   ├── certifications/          # ChittyCertify badges + endpoint contracts
│   ├── owners/                  # CODEOWNERS, governance metadata
│   ├── DEV_GUIDE.md             # detailed dev guide (deeper than this CLAUDE.md)
│   └── SCHEMA_GOVERNANCE.md     # canonical governance policy
│
├── connectivity/                # ChittyConnect + ChittyRouter layer
│   ├── api/                     # Hono Worker (inbound)
│   │   ├── index.ts             # entry point (wrangler.jsonc main)
│   │   ├── lib/                 # canon-client, drift-check, schema-loader, etc.
│   │   └── routes/              # generate / meta / owners / registry / tables / validate
│   ├── integrations/            # outbound hooks (chittyregister-hook)
│   ├── migrations/              # SQL per database (chittycanon, chittyledger, chittyos-core, chittyfinance)
│   │   └── DATABASE_ARCHITECTURE.md  # BINDING: what goes in Core vs per-service DBs
│   ├── releases/                # CHANGELOG, version notes
│   ├── deployments/             # deploy logs, beacon reports
│   ├── consumers/               # downstream services (populated from Owner Manifest)
│   └── upstreams/               # dependency declarations
│
├── scopes/                      # nested fractal sub-services (currently empty)
│
├── scope.json                   # repo-level scope manifest (the scope this repo IS)
├── database-config.json         # which databases this scope manages + tableOwners
├── package.json                 # tooling (paths reference identity/, connectivity/)
├── tsconfig.json                # rootDir: identity/src, outDir: identity/dist
├── wrangler.jsonc               # main: connectivity/api/index.ts
├── CHARTER.md                   # API contract (root)
├── CHITTY.md                    # architecture (root)
└── CLAUDE.md                    # this file (root)
```

## Common Commands

All commands run from repo root:

```bash
npm run dev              # Watch mode (tsx watch identity/src/index.ts)
npm run dev:api          # Wrangler dev on connectivity/api/index.ts
npm run build            # tsc + tsc-alias → identity/dist
npm run deploy           # wrangler deploy
npm run deploy:staging   # wrangler deploy --env staging
npm run deploy:production # wrangler deploy --env production
npm test                 # vitest run
npm run lint             # eslint identity/src
npm run format           # prettier identity/src
```

### Schema Generation Pipeline

```bash
npm run introspect             # Introspect all DBs → identity/src/generated/<db>/schema.json
npm run generate               # Full pipeline: introspect + types + validators + docs
npm run generate:types         # → identity/src/types/<db>/
npm run generate:validators    # → identity/src/validators/<db>/
npm run generate:docs          # → identity/docs/
npm run validate               # Validate schemas
npm run validate:manifest      # Validate database-config.json against meta-schema
npm run validate:service       # Validate a target service against schema compliance
npm run certify                # Run service compliance validation
```

### Database Migrations

```bash
npm run migration:create   # Author a new migration
npm run migration:apply    # Apply pending migrations
npm run migration:rollback # Rollback last migration
```

Migration files live in `connectivity/migrations/<db>/`.

Secrets are injected via wrangler / 1Password — never hardcoded. The manifested env var names (per `database-config.json` `databases[].envVar`):
- `CHITTYOS_CORE_DB_URL`
- `CHITTYLEDGER_DB_URL`
- `CHITTYCANON_DB_URL`
- `CHITTYEVIDENCE_DB_URL`
- `CHITTYCOMMAND_DB_URL`
- `CHITTYAGENT_TASKS_DB_URL`
- `CHITTYCONNECT_DB_URL`
- `CHITTYDISPUTE_DB_URL`
- `CHITTYFINANCE_DB_URL`

## Architecture

### Ontology Stack

```
ChittyCanon (defines ontology — chittycanon://gov/governance#core-types)
        |
        | publishes
        v
@chittyfoundation/ontology (package)
        |
        | consumed by
        v
ChittySchema (serves data shapes — this repo)
        |
        | used by
        v
All Services (validate at runtime via schema.chitty.cc)
```

### Canonical Entity Types (P/L/T/E/A — BINDING)

Every entity type validation, regex, or map MUST include all five:

| Code | Name | Definition |
|------|------|-----------|
| **P** | Person | Actor with agency (Natural / Synthetic / Legal) |
| **L** | Location | Context in space — jurisdiction, venue, place |
| **T** | Thing | Object without agency — document, asset, artifact |
| **E** | Event | Occurrence in time — transaction, decision, action |
| **A** | Authority | Source of weight — credential, certification, decision |

ChittyID format: `VV-G-LLL-SSSS-T-YM-C-X` where `T` ∈ `{P, L, T, E, A}`.

### API Worker (`connectivity/api/`)

Cloudflare Worker deployed at `schema.chitty.cc`. Entry: `connectivity/api/index.ts`.

| Route | Handler | Purpose |
|-------|---------|---------|
| `/api/tables` | `connectivity/api/routes/tables.ts` | List schema tables |
| `/api/validate` | `connectivity/api/routes/validate.ts` | Validate data against schema |
| `/api/generate` | `connectivity/api/routes/generate.ts` | Generate schemas on demand |
| `/api/registry` | `connectivity/api/routes/registry.ts` | Schema registry ops |
| `/api/owners` | `connectivity/api/routes/owners.ts` | Schema Owner Manifest |
| `/meta/*` | `connectivity/api/routes/meta.ts` | Serve meta-schemas (manifest, table-owner, drift-event, …) |

Supporting libs (`connectivity/api/lib/`):
- `schema-loader.ts` — load generated types/validators
- `meta-validator.ts` — Ajv-based meta-schema validation
- `drift-check.ts` — detect drift between manifest and live DB
- `queue-producer.ts`, `queue-consumer.ts` — DRIFT_QUEUE fan-out
- `r2-archive.ts` — DRIFT_ARCHIVE writes
- `canon-client.ts` — fetch + cache canon ontology
- `generators.ts` — schema generation utilities

### Worker Bindings (wrangler.jsonc)

| Binding | Type | Purpose |
|---------|------|---------|
| `REGISTRY_KV` | KV | Schema registry storage |
| `BEACON_STORE` | KV | Service deployment announcements |
| `CANON_CACHE` | KV | Cached canon.chitty.cc ontology |
| `CANONICAL_SCHEMAS` | R2 | JSON Schemas served at /meta/* |
| `DRIFT_ARCHIVE` | R2 | Compliance retention for drift events |
| `DRIFT_QUEUE` | Queue | Hourly drift-scan fan-out |

### Generated Types (`identity/src/types/`)

Database schemas introspected and typed (one subdir per database):
- `identity/src/types/chittyledger/` — evidence, cases, legal, foundational P/L/T/E/A
- `identity/src/types/chittyos-core/` — services, registrations, trust, identity, audit
- `identity/src/types/chittyfinance/` — entities, accounts, transactions, ledger, properties, units, leases (19 tables)

### Generated Validators (`identity/src/validators/`)

Zod validators matching each type:
- `identity/src/validators/chittyledger/`
- `identity/src/validators/chittyos-core/`

### Database Migrations (`connectivity/migrations/`)

- `connectivity/migrations/chittycanon/` — ontology schema
- `connectivity/migrations/chittyledger/` — evidence schema
- `connectivity/migrations/chittyos-core/` — schema upgrades, includes 6D trust upgrade (001) + fractal scopes primitive (002)
- `connectivity/migrations/chittyfinance/` — financial operations schema

### Integrations (`connectivity/integrations/`)

- `chittyregister-hook.ts` — schema-validation hook for ChittyRegister during service registration

### Subagents (`identity/agents/`)

- `chittyschema-overlord.md` — schema governance subagent (the canonical home; chittymarket plugin references this via pointer)

## No Mocks / No Fake Data / No Placeholder Endpoints (BINDING)

Every endpoint, every test, every PR must validate against real Neon. See the global policy in `~/.claude/CLAUDE.md`.

For chittyschema specifically:
- All routes execute real queries against the manifested databases
- Tests exercise real behavior — no `vi.mock` of DB modules in new tests
- Schema PRs include real-Neon validation evidence in the body (Neon MCP `run_sql` output)
- `npm run certify` must be green before merge

## Key Files

- `connectivity/api/index.ts` — Hono Worker API entry
- `identity/src/index.ts` — package library entry
- `identity/src/types/` — generated TS (do not hand-edit)
- `identity/src/validators/` — generated Zod (do not hand-edit)
- `identity/scripts/` — introspection + generation pipeline
- `identity/schemas/meta/` — meta-schemas served at `/meta/*`
- `identity/agents/chittyschema-overlord.md` — schema governance subagent
- `connectivity/migrations/` — SQL migrations per database
- `connectivity/integrations/chittyregister-hook.ts` — register hook
- `wrangler.jsonc` — Worker config (main: `connectivity/api/index.ts`)
- `package.json` — package + scripts (paths reference trinity dirs)
- `database-config.json` — manifest of databases + tableOwners (canonType per table)
- `scope.json` — fractal scope manifest

## Related Services

- **ChittyCanon** — Ontology definitions (upstream)
- **ChittyTrust / ChittyCert** — Authority signals (peer)
- **ChittyRegister** — Schema validation during service registration (peer)
- **All Services** — Consume schemas via `schema.chitty.cc` for runtime validation (downstream)
