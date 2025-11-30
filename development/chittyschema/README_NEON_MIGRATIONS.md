Neon Migration Guide (chittyschema authority)

Prereqs
- Neon connection string in env: `NEON_DATABASE_URL`
- psql installed (or use Neon SQL web console)

Apply migrations
- From `~/projects/development/chittyschema`:

1) Export URL
   export NEON_DATABASE_URL='postgres://user:pass@host/db?sslmode=require'

2) Apply initial evidence schema (creates cases, evidence, atomic_facts, etc.)
   psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/chittyledger/001_initial_evidence_schema.sql

3) Apply subsequent migrations in order (if any)
   # Example:
   # psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/chittyledger/002_add_indexes.sql

Verify
- List key tables:
  psql "$NEON_DATABASE_URL" -c "\dt+"

- Check atomic_facts shape:
  psql "$NEON_DATABASE_URL" -c "\d+ atomic_facts"

Rollback (manual)
- Use `BEGIN; ... ROLLBACK;` when testing locally.
- For production, create new migrations to alter schema forward-only.

Notes
- chittyschema is the single source of truth; add new columns via new migrations here and redeploy.
- Services like chittyintel must conform their inserts/queries to this schema.

