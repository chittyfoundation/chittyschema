# CLAUDE.md

## Project Overview

ChittySchema is the schema governance service for the ChittyOS ecosystem. It serves callable schema definitions that all services validate against at runtime. ChittyCanon defines the ontology (what types exist); ChittySchema serves the data shapes those types take. Includes generated TypeScript types, Zod validators, a Hono API worker, and database introspection tooling.

**Repo:** `CHITTYFOUNDATION/chittyschema`
**Deploy:** Cloudflare Workers at `schema.chitty.cc`
**Stack:** Hono TypeScript (API), Zod (validation), PostgreSQL (introspection), Cloudflare KV
**Canonical URI:** `chittycanon://core/services/chitty-schema` | Tier 0
**Package:** `@chittyos/schema` (published to GitHub npm registry)

## Common Commands

All commands run from `development/chittyschema/`:

```bash
npm run dev              # Watch mode (tsx watch src/index.ts)
npm run dev:api          # Start API dev server (wrangler dev)
npm run build            # Compile TypeScript (tsc + tsc-alias)
npm run deploy           # Deploy Worker to Cloudflare
npm run deploy:staging   # Deploy to staging environment
npm run deploy:production # Deploy to production
npm test                 # Run vitest test suite
npm run test:watch       # Run vitest in watch mode
npm run lint             # ESLint src/
npm run format           # Prettier formatting
```

### Schema Generation Pipeline

```bash
npm run introspect       # Introspect all database schemas
npm run generate         # Full pipeline: introspect + types + validators + docs
npm run generate:types   # Generate TypeScript types from introspected schemas
npm run generate:validators  # Generate Zod validators
npm run generate:docs    # Generate documentation
npm run validate         # Validate schemas
npm run certify          # Run service compliance validation
```

### Database Migrations

```bash
npm run migration:create   # Create a new migration
npm run migration:apply    # Apply pending migrations
npm run migration:rollback # Rollback last migration
```

Secrets (via wrangler or environment):
```bash
DATABASE_URL=            # Neon PostgreSQL connection string (for introspection)
```

## Architecture

The repo has a `development/chittyschema/` directory containing the full implementation. The root level contains only CHARTER.md, CHITTY.md, and the development directory.

### Ontology Stack

```
ChittyCanon (defines ontology)
        |
        | publishes
        v
@chittyfoundation/ontology (package)
        |
        | consumed by
        v
ChittySchema (serves schemas via API)
        |
        | used by
        v
All Services (validate at runtime)
```

### API Worker (`api/`)

Cloudflare Worker deployed at `schema.chitty.cc`. Entry point: `api/index.ts`.

| Route | Handler | Purpose |
|-------|---------|---------|
| `/api/tables` | `api/routes/tables.ts` | List available schema tables |
| `/api/validate` | `api/routes/validate.ts` | Validate data against schema |
| `/api/generate` | `api/routes/generate.ts` | Generate schemas on demand |
| `/api/registry` | `api/routes/registry.ts` | Schema registry operations |

Supporting libraries:
- `api/lib/schema-loader.ts` -- Schema loading from KV
- `api/lib/generators.ts` -- Schema generation utilities

### Worker Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `REGISTRY_KV` | KV | Schema registry storage |

### Generated Types (`src/types/`)

Two database schemas are introspected and typed:

- `src/types/chittyledger/` -- ChittyLedger database types (evidence, cases, legal, foundational entities, financial, identity)
- `src/types/chittyos-core/` -- ChittyOS Core database types (services, registrations, trust, identity, audit)

### Generated Validators (`src/validators/`)

Zod validators matching each type definition:

- `src/validators/chittyledger/` -- Validators for ledger tables
- `src/validators/chittyos-core/` -- Validators for core tables

### Introspection and Generation Scripts (`scripts/`)

- `scripts/introspect-all.ts` -- Introspect all configured database schemas
- `scripts/introspect-schema.ts` -- Introspect a single schema
- `scripts/generate-types-multi.ts` -- Generate TypeScript types for multiple schemas
- `scripts/generate-validators-multi.ts` -- Generate Zod validators for multiple schemas
- `scripts/generate-docs-multi.ts` -- Generate documentation for multiple schemas
- `scripts/validate-service-compliance.ts` -- Validate a service against schema compliance

### Database Migrations (`migrations/`)

SQL migrations organized by target database:
- `migrations/chittycanon/` -- ChittyCanon ontology schema
- `migrations/chittyledger/` -- ChittyLedger evidence schema
- `migrations/chittyos-core/` -- ChittyOS Core schema upgrades

### Integrations

- `integrations/chittyregister-hook.ts` -- Hook for ChittyRegister to validate schemas during service registration

## Key Files

- `development/chittyschema/api/index.ts` -- Hono Worker API entry point
- `development/chittyschema/src/index.ts` -- Package library entry point
- `development/chittyschema/src/types/` -- Generated TypeScript type definitions
- `development/chittyschema/src/validators/` -- Generated Zod validators
- `development/chittyschema/scripts/` -- Introspection and generation scripts
- `development/chittyschema/migrations/` -- SQL migration files
- `development/chittyschema/integrations/` -- Service integration hooks
- `development/chittyschema/wrangler.jsonc` -- Cloudflare Workers configuration
- `development/chittyschema/package.json` -- Package definition (`@chittyos/schema`)
- `development/chittyschema/database-config.json` -- Database introspection configuration
- `development/chittyschema/cli.ts` -- CLI entry point (`chittyschema` command)

## Related Services

- **ChittyCanon** -- Ontology definitions that schemas implement (upstream)
- **All Services** -- Consume schemas for runtime validation (downstream)
- **ChittyRegister** -- Schema validation during service registration (peer)
- **ChittyCertify** -- Schema compliance for certification (peer)
