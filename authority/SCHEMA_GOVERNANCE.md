# ChittySchema: Schema Governance & Authority

**chittyschema** is the **SINGLE SOURCE OF TRUTH** for all database schemas in the ChittyOS ecosystem. This document establishes the governance model, workflow, and rules for schema management.

## Core Principles

### 1. Database is the Source of Truth
- Schema lives in PostgreSQL, **NOT** in code files
- Types are generated from live database, never manually written
- Services import types from `@chittyos/schema` package
- Zero tolerance for manual type definitions in service repos

### 2. Central Authority Model
- **chittyschema** owns all schema definitions
- Services **consume** types, they do NOT define them
- Schema changes must go through chittyschema first
- Database migrations managed in chittyschema repo

### 3. Two-Database Architecture

#### ChittyOS-Core (Operational Database)
- **Purpose**: Live operational data
- **Tables**: 19 tables (identities, credentials, api_tokens, verifications, etc.)
- **Ownership**: Distributed across services (chittyid, chittyauth, chittyverify, etc.)
- **Pattern**: Frequently updated, real-time queries
- **Connection**: `CHITTYOS_CORE_DB_URL`

#### ChittyLedger (Immutable Ledger)
- **Purpose**: Append-only immutable records
- **Tables**: 24 tables (evidence, cases, financial_transactions, event_ledger, blockchain_records, etc.)
- **Ownership**: Ledger-focused services (chittyledger, chittychain, bane)
- **Pattern**: Write-once, audit trail, court-admissible
- **Connection**: `CHITTYLEDGER_DB_URL`

## Workflow: How to Make Schema Changes

### Step 1: Propose Change
```bash
# Create a new migration file
cd chittyschema
npm run migration:create -- add_column_to_evidence
```

This creates: `migrations/{database}/XXX_description.sql`

### Step 2: Write Migration
```sql
-- migrations/chittyledger/002_add_verified_by_column.sql

-- UP: Add new column
ALTER TABLE evidence ADD COLUMN verified_by UUID REFERENCES users(id);
CREATE INDEX idx_evidence_verified_by ON evidence(verified_by);

-- DOWN: Rollback
DROP INDEX idx_evidence_verified_by;
ALTER TABLE evidence DROP COLUMN verified_by;
```

### Step 3: Test Locally
```bash
# Apply migration to your local database branch
npm run migration:apply

# If it breaks, rollback
npm run migration:rollback
```

### Step 4: Regenerate Types
```bash
# Introspect updated database
npm run introspect

# Generate new types
npm run generate:types

# Verify changes
git diff src/types/
```

### Step 5: Publish to npm
```bash
# Bump version
npm version patch  # or minor, or major

# Build and publish
npm run build
npm publish

# Services can now update
cd ../chittyauth
npm update @chittyos/schema
```

## Service Integration Rules

### ✅ DO: Import Types from chittyschema

```typescript
// In chittyauth/src/routes/tokens.ts
import { ApiToken, ApiTokenInsert } from '@chittyos/schema';

export async function createToken(data: ApiTokenInsert): Promise<ApiToken> {
  const token = await db.insert('api_tokens', data);
  return token;
}
```

### ✅ DO: Use Zod Validators

```typescript
import { ApiTokenSchema } from '@chittyos/schema';

const result = ApiTokenSchema.safeParse(requestBody);
if (!result.success) {
  return { error: result.error.issues };
}
```

### ❌ DON'T: Define Types Locally

```typescript
// ❌ WRONG - Never do this!
interface ApiToken {
  id: string;
  token: string;
  // ...
}
```

### ❌ DON'T: Create Tables from Services

```typescript
// ❌ WRONG - Schema changes must go through chittyschema
await db.query(`
  CREATE TABLE my_new_table (
    id UUID PRIMARY KEY
  )
`);
```

### ❌ DON'T: Use ORMs with Schema Definitions

```typescript
// ❌ WRONG - Drizzle/Prisma schemas duplicate the database
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  // This is redundant with chittyschema!
});
```

## Table Ownership

### ChittyOS-Core Ownership Map

| Table(s) | Owner Service | Purpose |
|----------|---------------|---------|
| `identities`, `credentials` | **chittyid** | ChittyID generation and credential issuance |
| `api_tokens`, `oauth_clients`, `oauth_authorization_codes`, `registrations` | **chittyauth** | Authentication and OAuth flows |
| `verifications` | **chittyverify** | Evidence verification |
| `trust_networks`, `trust_scores` | **chittytrust** | 6D trust scoring |
| `chronicle_events`, `semantic_documents` | **chittychronicle** | Event logging and semantic search |
| `reception_calls`, `reception_messages`, `reception_sessions` | **chittyreception** | Inbound communication routing |
| `audit_logs` | **shared** | System-wide audit trail |

### ChittyLedger Ownership Map

| Table(s) | Owner Service | Purpose |
|----------|---------------|---------|
| `evidence`, `chain_of_custody`, `atomic_facts`, `contradictions` | **chittyledger** | Legal evidence management |
| `cases`, `case_parties` | **chittyledger** | Case management |
| `users`, `audit_log` | **chittyledger** | User management and audit |
| `financial_transactions`, `invoices`, `subscriptions` | **chittyfinance** | Billing and payments |
| `event_ledger`, `api_usage_ledger` | **chittychronicle** | System-wide event tracking |
| `blockchain_records` | **chittychain** | Blockchain minting and proofs |

**Ownership Responsibility:**
- Owner service proposes schema changes for their tables
- Changes must be reviewed by chittyschema maintainers
- Breaking changes require coordination with dependent services

## Migration Conventions

### Naming

```
{sequence}_{verb}_{description}.sql

Examples:
001_initial_schema.sql
002_add_verification_metadata.sql
003_create_event_ledger.sql
004_alter_evidence_add_trust_score.sql
```

### Structure

```sql
-- ============================================================================
-- Migration: {Description}
-- Database: {chittyos-core | chittyledger}
-- Author: {Your Name}
-- Date: {YYYY-MM-DD}
-- ============================================================================

-- UP: Apply changes
ALTER TABLE evidence ADD COLUMN trust_score DECIMAL(5,2);

-- DOWN: Rollback (if possible)
ALTER TABLE evidence DROP COLUMN trust_score;

-- NOTES:
-- - This change is backwards compatible
-- - Existing rows will have NULL trust_score
-- - Services should handle NULL gracefully
```

### Safety Checklist

Before applying migration:
- [ ] Migration is reversible (has DOWN section)
- [ ] Doesn't break existing data
- [ ] Tested on database branch (Neon preview)
- [ ] Services can handle new schema version
- [ ] Breaking changes coordinated with service teams
- [ ] Indexes created for new foreign keys
- [ ] COMMENT added for new columns/tables

## Breaking Changes

### Definition
A breaking change is any schema modification that causes existing code to fail:
- Removing a column
- Renaming a column
- Changing a column's type
- Making a nullable column non-nullable
- Removing a table

### Process for Breaking Changes

1. **Announce** in #chittyos-schema Slack channel
2. **Deprecate** old column/table (add COMMENT)
3. **Add** new column/table alongside old one
4. **Migrate** data from old to new
5. **Update** services to use new schema
6. **Wait** for all services to deploy
7. **Remove** deprecated column/table

### Example: Renaming Column

```sql
-- Phase 1: Add new column
ALTER TABLE evidence ADD COLUMN artifact_id TEXT;
UPDATE evidence SET artifact_id = evidence_id;
COMMENT ON COLUMN evidence.evidence_id IS 'DEPRECATED: Use artifact_id instead. Will be removed in v2.0';

-- Phase 2: (After all services updated)
ALTER TABLE evidence DROP COLUMN evidence_id;
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Schema Validation

on:
  pull_request:
    paths:
      - 'migrations/**'
      - 'scripts/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create Neon Branch
        uses: neondatabase/create-branch-action@v4
        with:
          project_id: ${{ vars.NEON_PROJECT_ID }}
          api_key: ${{ secrets.NEON_API_KEY }}
          branch_name: preview/pr-${{ github.event.number }}

      - name: Apply Migrations
        env:
          NEON_DATABASE_URL: ${{ steps.create_branch.outputs.db_url }}
        run: npm run migration:apply

      - name: Regenerate Types
        run: |
          npm run introspect
          npm run generate:types

      - name: Check for Type Changes
        run: |
          if [[ $(git diff --stat src/types/) ]]; then
            echo "✅ Types regenerated successfully"
            git diff src/types/
          else
            echo "⚠️ No type changes detected"
          fi
```

### CodeRabbit Review

Configure `.coderabbitai.yaml`:

```yaml
reviews:
  high_level_summary: true
  poem: false
  request_changes_workflow: true

  path_filters:
    - "migrations/**"
    - "scripts/**"
    - "src/types/**"

  path_instructions:
    - path: "migrations/**/*.sql"
      instructions: |
        Review for:
        - SQL syntax correctness
        - Reversibility (has DOWN section)
        - Data safety (no data loss)
        - Index creation for new columns
        - Breaking change coordination
```

## Version Management

### Semantic Versioning

chittyschema follows [semver](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes (removed columns/tables)
- **MINOR** (1.0.0 → 1.1.0): New tables/columns (backwards compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, documentation

### Service Compatibility

```json
{
  "dependencies": {
    "@chittyos/schema": "^1.2.0"  // ✅ Allow minor updates
  }
}
```

**Update Strategy:**
- Services automatically get minor/patch updates
- Major updates require code changes
- Coordinate major version bumps across services

## Schema Documentation

### Auto-Generated Docs

```bash
npm run generate:docs
```

Creates:
- `docs/chittyos-core.md` - All tables in operational DB
- `docs/chittyledger.md` - All tables in ledger DB
- `docs/relationships.md` - Foreign key relationships
- `docs/indexes.md` - Index performance guide

### Table Comments

```sql
COMMENT ON TABLE evidence IS 'ChittyLedger: Court-admissible evidence repository with chain of custody tracking';

COMMENT ON COLUMN evidence.trust_score IS 'AI-calculated trust score (0-100) based on source tier and verification history';
```

Comments are extracted and included in generated TypeScript types.

## Emergency Procedures

### Rollback Failed Migration

```bash
# Immediately rollback
npm run migration:rollback

# Check database state
psql $NEON_DATABASE_URL -c "\d table_name"

# Re-introspect to sync types
npm run introspect
npm run generate:types

# Publish hotfix
npm version patch
npm publish
```

### Schema Drift Detection

If services report type errors but schema looks correct:

```bash
# Force fresh introspection
rm -rf src/generated src/types
npm run introspect
npm run generate:types

# Compare with production
psql $NEON_DATABASE_URL -c "\d+ table_name"
```

## FAQ

**Q: Can I add a column directly in the database for testing?**
A: No. Always use migrations. Use Neon preview branches for testing.

**Q: My service needs a new table. Where do I add it?**
A: Create a migration in chittyschema first. Never create tables from services.

**Q: Can I use Drizzle/Prisma alongside chittyschema?**
A: No. ORMs create duplicate schema definitions. Use raw SQL with chittyschema types.

**Q: How do I add indexes for performance?**
A: Create a migration in chittyschema. Indexes are part of the schema.

**Q: Can I have service-specific types that extend chittyschema types?**
A: Yes, but only for non-database types. Use TypeScript type composition:
```typescript
import { Identity } from '@chittyos/schema';
type IdentityWithProfile = Identity & { profile: ProfileData };
```

**Q: What if two services need the same table?**
A: Perfect! Both import from `@chittyos/schema`. This is the point of central authority.

## Contact & Support

- **Schema Questions**: #chittyos-schema Slack channel
- **Bug Reports**: https://github.com/chittyfoundation/chittyschema/issues
- **Migration Help**: Ping @schema-team in Slack
- **Emergency**: Direct message @chittyos-oncall

---

**Remember**: chittyschema is not a bottleneck - it's a **force multiplier**. By centralizing schema management, we eliminate type drift, reduce bugs, and make cross-service refactoring possible.
