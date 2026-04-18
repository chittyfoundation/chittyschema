# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **🎯 Project Orchestration:** This project follows [ChittyCan™ Project Standards](../CHITTYCAN_PROJECT_ORCHESTRATOR.md)

## ChittySchema Overview

**ChittySchema** is the universal data framework and central hub for the ChittyOS ecosystem. It is **NOT** a collection of hard-coded schemas - it dynamically:

- **Introspects** the live `chittyos-core` Neon PostgreSQL database
- **Generates** TypeScript types that exactly match the database
- **Creates** Zod validators for runtime validation
- **Produces** documentation with ownership and relationships
- **Distributes** these artifacts as an npm package to all services

**Critical Role:** This is the single source of truth. All ChittyOS services import types and validators from `@chittyos/schema` - they never write their own types.

## Architecture: Dynamic Generation, Not Hard-Coding

### The Workflow

```
Live Database → Introspect → Generate Types → Generate Validators → Publish → Services Import
```

1. **Database is the source of truth**: Schema lives in PostgreSQL, not in code files
2. **Introspection script**: `npm run introspect` reads the entire database schema
3. **Type generation**: `npm run generate:types` creates TypeScript interfaces
4. **Validator generation**: `npm run generate:validators` creates Zod schemas
5. **Distribution**: Services `npm install @chittyos/schema` and get perfect types

### No Hard-Coding Allowed

❌ **NEVER** manually write types like:
```typescript
interface Identity {
  id: string;
  did: string;
  // ...
}
```

✅ **ALWAYS** generate from database:
```bash
npm run generate
```

## Project Structure

```
chittyschema/
├── scripts/
│   ├── introspect-schema.ts      # Reads live database schema via pg
│   ├── generate-types.ts         # Creates TypeScript types
│   ├── generate-validators.ts    # Creates Zod validators
│   └── generate-docs.ts          # Creates documentation
├── src/
│   ├── generated/
│   │   └── schema.json           # Complete schema snapshot (generated)
│   ├── types/                    # TypeScript type files (generated)
│   ├── validators/               # Zod validator files (generated)
│   └── index.ts                  # Main export file
├── dist/                         # Build output (published to npm)
├── tests/
├── package.json
├── tsconfig.json
├── .coderabbit.yaml              # AI code review config
└── CLAUDE.md
```

**Key point:** `src/generated/`, `src/types/`, and `src/validators/` are **git-ignored** because they're dynamically generated.

## Essential Commands

### Schema Generation (Most Important)

```bash
# Complete regeneration workflow
npm run generate                  # Introspect + generate types + validators + docs

# Individual steps
npm run introspect                # Read database → schema.json
npm run generate:types            # schema.json → TypeScript types
npm run generate:validators       # schema.json → Zod validators
npm run generate:docs             # schema.json → Markdown docs
```

### Development

```bash
npm install                       # Install dependencies
npm run build                     # Build for distribution
npm test                          # Run tests
npm run lint                      # Lint TypeScript
npm run format                    # Format with Prettier
```

### Database Connection

```bash
# Set environment variable (required for introspection)
export NEON_DATABASE_URL="postgres://..."

# Introspection connects to live database
npm run introspect
```

### Publishing

```bash
npm run build                     # Build types and validators
npm publish                       # Publish to npm registry
```

Services then install:
```bash
npm install @chittyos/schema@latest
```

## How Services Use This Package

### Installation in Other Services

```json
{
  "dependencies": {
    "@chittyos/schema": "^1.0.0"
  }
}
```

### Import Types for Type Safety

```typescript
import { Identity, ApiToken, Verification } from '@chittyos/schema';

const identity: Identity = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  did: 'did:chitty:01-C-ACT-AB12-P-2511-3-X',
  biometric_hash: 'sha256:...',
  public_key: '-----BEGIN PUBLIC KEY-----...',
  status: 'active',
};
```

### Runtime Validation with Zod

```typescript
import { IdentitySchema, ApiTokenInsert } from '@chittyos/schema';

// Validate incoming data
const result = IdentitySchema.safeParse(requestBody);
if (!result.success) {
  return { error: result.error.issues };
}

// Use validated data
const identity = result.data;
```

### Access Schema Metadata

```typescript
import { schemaMetadata } from '@chittyos/schema';

console.log(`Database: ${schemaMetadata.database}`);
console.log(`Last introspected: ${schemaMetadata.timestamp}`);
console.log(`Tables: ${schemaMetadata.tables.map(t => t.name).join(', ')}`);
```

## Database Schema Ownership

The live database contains tables owned by different services:

| Table(s) | Owner | Purpose |
|----------|-------|---------|
| `identities`, `credentials` | chittyid | Core identity management with ChittyIDs |
| `api_tokens`, `oauth_clients`, `oauth_authorization_codes`, `registrations` | chittyauth | Authentication and OAuth |
| `verifications` | chittyverify | Evidence verification and chain of custody |
| `trust_networks`, `trust_scores` | chittytrust | 6D trust scoring and networks |
| `audit_logs` | shared | System-wide audit trail for all services |

ChittySchema doesn't "own" tables - it **reflects** what's in the database.

## Introspection Details

The `introspect-schema.ts` script reads:

- **Tables**: Name, schema, comment, ownership
- **Columns**: Name, type, nullable, default, constraints, comments
- **Primary Keys**: Which columns form the primary key
- **Foreign Keys**: Relationships, CASCADE/RESTRICT rules
- **Indexes**: Name, columns, type (btree, gist), uniqueness
- **Views**: Active views like `active_credentials_with_trust`
- **Functions**: PostgreSQL functions like `get_current_trust_score()`
- **Extensions**: Installed extensions (uuid-ossp, pgcrypto, postgis)

Output: `src/generated/schema.json` - complete schema snapshot.

## Type Generation Details

The `generate-types.ts` script creates:

- **Base type**: `Identity`, `ApiToken`, etc.
- **Insert type**: `IdentityInsert` (auto-generated fields optional)
- **Update type**: `IdentityUpdate` (all fields optional except id)

PostgreSQL → TypeScript type mapping:
- `uuid` → `string`
- `text`, `varchar` → `string`
- `integer`, `bigint`, `numeric` → `number`
- `boolean` → `boolean`
- `jsonb` → `Record<string, any>`
- `timestamp with time zone` → `Date | string`
- `ARRAY`, `text[]` → `string[]`
- `USER-DEFINED` (enums, geography) → `string`

## Validator Generation Details

The `generate-validators.ts` script creates Zod schemas with:

- Proper Zod type for each PostgreSQL type
- UUID validation: `z.string().uuid()`
- IP validation: `z.string().ip()`
- Optional/nullable handling based on database constraints
- Insert schemas (omit auto-generated fields)
- Update schemas (all optional except id)

## Migration Strategy

When schema changes are needed:

1. **Modify the database** (via migration SQL or manual ALTER)
2. **Re-run introspection**: `npm run generate`
3. **Review generated changes**: Check git diff on types/validators
4. **Test**: Ensure all services still work with new types
5. **Publish**: `npm run build && npm publish`
6. **Update services**: `npm update @chittyos/schema`

### Creating Migrations

```bash
npm run migration:create -- add_column_to_identities
```

This creates a migration file. Edit it to add SQL for both `up` and `down`.

```bash
npm run migration:apply      # Apply pending migrations
npm run migration:rollback   # Rollback last migration
```

## Neon GitHub Integration

This repository is connected to **ChittyOS-Core** Neon database. Benefits:

- **Automated database branches**: Each PR gets isolated database
- **Schema diff reviews**: See schema changes in PR comments
- **Safe testing**: Test migrations on branch before merging

**GitHub Actions workflow** (example):
```yaml
- name: Create Neon branch
  uses: neondatabase/create-branch-action@v4
  with:
    project_id: ${{ vars.NEON_PROJECT_ID }}
    api_key: ${{ secrets.NEON_API_KEY }}
    branch_name: preview/pr-${{ github.event.number }}

- name: Introspect and generate
  env:
    NEON_DATABASE_URL: ${{ steps.create_neon_branch.outputs.db_url }}
  run: npm run generate
```

## Code Review with CodeRabbit

This repository uses **CodeRabbit AI** for automated reviews. See `.coderabbit.yaml` for configuration.

**Key review focuses:**
- Generated files should match database schema exactly
- No manual type writing - only generation scripts
- Migration safety (reversibility, data preservation)
- Cross-service compatibility
- Documentation accuracy

**CodeRabbit commands:**
- `@coderabbitai review this migration for safety`
- `@coderabbitai configuration` - Export current config

## Critical Constraints

1. **Database is the source of truth** - never hard-code types
2. **Always regenerate** after database changes
3. **Publish after changes** so services can update
4. **Test services** after schema updates to catch breaking changes
5. **Coordinate deployments** - schema changes affect all services
6. **Never edit generated files** - edit generation scripts instead

## Validation Testing

```bash
npm test
```

Tests should verify:
- Schema introspection connects successfully
- Generated types match schema.json
- Zod validators accept valid data
- Validators reject invalid data (wrong types, missing required fields)
- Migration up/down functions are reversible

## Technology Stack

- **Language**: TypeScript
- **Database**: Neon PostgreSQL (shared `chittyos-core`)
- **Schema Introspection**: `pg` library with information_schema queries
- **Type Generation**: Custom script (not `pg-to-ts` - more control)
- **Validation**: Zod for runtime validation
- **Testing**: Vitest
- **Build**: TypeScript compiler + tsc-alias
- **Runtime**: Node.js 18+ / tsx for development

## Related Services

All services import from this package:

- [chittyid](https://github.com/chittyfoundation/chittyid) - Identity generation
- [chittyauth](https://github.com/chittyfoundation/chittyauth) - Authentication
- [chittyverify](https://github.com/chittyfoundation/chittyverify) - Evidence verification
- [chittytrust](https://github.com/chittyfoundation/chittytrust) - Trust scoring
- [chittyconnect](https://github.com/chittyfoundation/chittyconnect) - Integration hub
- [chittyrouter](https://github.com/chittyfoundation/chittyrouter) - Email routing

## Related Documentation

- Parent ecosystem guide: `../CLAUDE.md`
- Database init script: `../chittyauth/init-database.sql` (current complete schema)
- Neon documentation: https://neon.com/docs
- CodeRabbit documentation: https://docs.coderabbit.ai
