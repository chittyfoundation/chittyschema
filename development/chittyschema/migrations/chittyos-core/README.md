# ChittyOS-Core Database Migrations

## Running Migrations

### Prerequisites

1. **Database Access**: You need `CHITTYOS_CORE_DB_URL` or `NEON_DATABASE_URL` environment variable set
2. **psql CLI**: PostgreSQL client installed (`brew install postgresql` on macOS)
3. **Permissions**: Database user must have ALTER TABLE privileges

### Method 1: Using psql (Recommended)

```bash
# Set environment variable
export NEON_DATABASE_URL="postgresql://user:pass@host.neon.tech/chittyos-core?sslmode=require"

# Run migration
psql $NEON_DATABASE_URL -f migrations/chittyos-core/001_upgrade_trust_scores_to_6d.sql

# Verify
psql $NEON_DATABASE_URL -c "\d trust_scores"
psql $NEON_DATABASE_URL -c "\d trust_events"
```

### Method 2: Using Node.js Script

```bash
# Install dependencies
npm install @neondatabase/serverless

# Create and run migration script
node << 'EOF'
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon(process.env.NEON_DATABASE_URL);
const migration = fs.readFileSync('migrations/chittyos-core/001_upgrade_trust_scores_to_6d.sql', 'utf8');

(async () => {
  try {
    await sql(migration);
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
})();
EOF
```

### Method 3: Via Neon Console

1. Go to https://console.neon.tech
2. Select `chittyos-core` database
3. Open SQL Editor
4. Copy/paste contents of `001_upgrade_trust_scores_to_6d.sql`
5. Execute

## After Migration

1. **Regenerate Types**:
   ```bash
   cd /path/to/chittyschema
   npm run introspect
   npm run generate:types
   ```

2. **Verify New Schema**:
   ```bash
   psql $NEON_DATABASE_URL -c "
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'trust_scores'
   ORDER BY ordinal_position;
   "
   ```

3. **Check trust_events Table**:
   ```bash
   psql $NEON_DATABASE_URL -c "\d trust_events"
   ```

4. **Publish Updated Schema**:
   ```bash
   npm version minor
   npm run build
   npm publish
   ```

## Rollback (If Needed)

If the migration fails or needs to be reversed:

```sql
-- Drop new columns
ALTER TABLE trust_scores
  DROP COLUMN IF EXISTS source_dimension,
  DROP COLUMN IF EXISTS temporal_dimension,
  DROP COLUMN IF EXISTS channel_dimension,
  DROP COLUMN IF EXISTS outcome_dimension,
  DROP COLUMN IF EXISTS network_dimension,
  DROP COLUMN IF EXISTS justice_dimension,
  DROP COLUMN IF EXISTS people_score,
  DROP COLUMN IF EXISTS legal_score,
  DROP COLUMN IF EXISTS state_score,
  DROP COLUMN IF EXISTS chitty_score,
  DROP COLUMN IF EXISTS composite_score,
  DROP COLUMN IF EXISTS trust_level,
  DROP COLUMN IF EXISTS confidence,
  DROP COLUMN IF EXISTS ai_enhanced,
  DROP COLUMN IF EXISTS insights;

-- Drop trust_events table
DROP TABLE IF EXISTS trust_events;

-- Restore from legacy columns (if they exist)
UPDATE trust_scores
SET
  base_score = legacy_base_score,
  history_score = legacy_history_score,
  network_score = legacy_network_score,
  risk_penalty = legacy_risk_penalty,
  final_score = legacy_final_score
WHERE legacy_base_score IS NOT NULL;
```

## Migration Status

- [x] Migration file created: `001_upgrade_trust_scores_to_6d.sql`
- [ ] Migration executed on database
- [ ] Types regenerated from database
- [ ] ChittyScore Flask app updated
- [ ] Tests passing with new schema
- [ ] Legacy columns removed (after confirmation)

## Questions?

Contact the ChittySchema maintainer or database admin before running migrations on production.
