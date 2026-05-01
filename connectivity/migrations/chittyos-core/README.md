# ChittyOS-Core Database Migrations

Migration manifest for the chittyos-core Neon database (project `restless-grass-40598426`).

## Active migrations

| File | Applied to prod | Notes |
|---|---|---|
| `002_fractal_scopes.sql` | ✅ | Adds `scopes` / `scope_artifacts` / `scope_events` / `scope_parties` tables for the fractal scopes primitive |
| `003_service_registrations_private_endpoint.sql` | ✅ (PR #34) | Adds `private_endpoint` JSONB column to `service_registrations` for Tailscale Services discovery |
| `004_trust_scores_ty_vy_ry.sql` | ✅ (2026-05-01) | Adds TY/VY/RY columns to `trust_scores` per White Paper v2.1. Additive — old pre-6D columns (`base_score`, etc.) coexist until consumers migrate |

## Archived

`_archive/001_upgrade_trust_scores_to_6d.sql` — authored 2025-11-08 but never applied. The 6D scoring model was superseded by TY/VY/RY before adoption. See `_archive/README.md` for context.

## Running a new migration

### Method 1: Neon MCP (recommended for Claude / agent flows)

Each migration must validate against a fresh disposable Neon branch off the production parent before applying to production, per `chittycanon://gov/governance#no-mocks-no-fakes`. Pattern:

```
1. mcp_create_branch  → off production parent
2. run migration on the disposable branch via run_sql / run_sql_transaction
3. verify shape with describe_table_schema
4. mcp_delete_branch  → tear down
5. apply same SQL to production default branch
6. verify shape on production
```

### Method 2: psql

```bash
export CHITTYOS_CORE_DB_URL="postgresql://user:pass@host.neon.tech/chittyos-core?sslmode=require"

# Always run against a Neon branch first; only after green run on default:
psql $CHITTYOS_CORE_DB_URL -f connectivity/migrations/chittyos-core/<NNN>_<name>.sql
```

### Method 3: Node.js script

```bash
node << 'EOF'
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon(process.env.CHITTYOS_CORE_DB_URL);
const migration = fs.readFileSync(
  'connectivity/migrations/chittyos-core/<NNN>_<name>.sql',
  'utf8',
);

(async () => {
  try {
    await sql(migration);
    console.log('Migration complete');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();
EOF
```

## After applying a migration

1. Regenerate types and validators:
   ```bash
   npm run introspect       # against the manifested CHITTYOS_CORE_DB_URL
   npm run generate:types
   npm run generate:validators
   ```

2. Verify schema parity:
   ```bash
   psql $CHITTYOS_CORE_DB_URL -c "
     SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = '<table>'
     ORDER BY ordinal_position;
   "
   ```

3. Update the table above with the applied date.

## Doctrine

- Every migration is validated against real Neon (disposable branch) before applying to production. No mock data, no skipped validation.
- Migrations are additive by default. Column drops happen in a follow-up migration once all consumers have cut over.
- The `connectivity/migrations/<db>/` directory is the manifest. `_archive/` is for files kept as historical record but not to be run.
