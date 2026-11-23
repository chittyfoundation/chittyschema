# ChittyOS-Core Database Migrations

Migration manifest for the chittyos-core Neon database (project `restless-grass-40598426`).

## Active migrations

| File | Applied to prod | Notes |
|---|---|---|
| `002_fractal_scopes.sql` | ✅ | Adds `scopes` / `scope_artifacts` / `scope_events` / `scope_parties` tables for the fractal scopes primitive |
| `003_service_registrations_private_endpoint.sql` | ✅ (PR #34) | Adds `private_endpoint` JSONB column to `service_registrations` for Tailscale Services discovery |
| `004_trust_scores_ty_vy_ry.sql` | ✅ (2026-05-01) | Adds TY/VY/RY columns to `trust_scores` per White Paper v2.1. Additive — old pre-6D columns (`base_score`, etc.) coexist until consumers migrate |
| `006_scope_legal_write_block.sql` | ❌ (not applied) | Write-blocks legal rows on `scopes`, `scope_parties`, `scope_events`, `scope_artifacts` (matter write gate, `chittycanon://specs/matter-scope`). Apply after 005 (PR #92). See "Legal write block (006)" below |

## Legal write block (006)

- **What it blocks.** `scopes` accepts a row only if `scope_type` is on an allowlist of known non-legal types (`project`, `live_stream_session`) and its `metadata` carries no `space=legalink` and no `privilege` of `privileged`/`pii`. The three child tables reject rows whose parent scope is missing or would fail that check. `scope_parties` and `scope_artifacts` also reject their own legalink/privileged/PII metadata. `scope_events.details` is not classification-checked.
- **Allowlist.** It fails closed: a new or mistyped type is rejected until a migration adds it after classification. `connectivity/api/lib/scope-projector.ts` `SCOPE_TYPES` names many types outside the allowlist. A service that starts projecting one is rejected, and because the projector is fire-and-forget, that rejection is silent unless the caller surfaces it.
- **What it does not stop.** The triggers are `ENABLE ALWAYS` and block accidental writes by every role, including the table owner and BYPASSRLS roles. A determined client connected as the owner (`neondb_owner`, which chittyos-core services use via Hyperdrive today) can disable or drop them. The real control is moving services off owner/superuser/BYPASSRLS roles (chittyfoundation/chittyauth#81).
- **Disabling.** The triggers are disabled only inside a test transaction on a disposable branch, for example to insert 005's `test_fixture` scopes. They are re-enabled with `ENABLE ALWAYS` and asserted at `tgenabled='A'`. That is never permission to disable them anywhere else.
- **Removal gate.** The future migration that drops 005's and 006's triggers may be applied only after a check proves no service connects to chittyos-core as owner, superuser or a BYPASSRLS role. That check script is a follow-up PR.

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
