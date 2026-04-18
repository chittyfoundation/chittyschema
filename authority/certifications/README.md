# ChittyOS Schema Certification

**Schema compliance is now a requirement for ChittyOS service certification.**

All services must demonstrate proper use of the central schema authority (`@chittyos/schema`) before they can be certified and deployed to production.

---

## Certification Requirements

### ✅ MUST Pass (Critical)

1. **Schema Dependency**
   - Service MUST have `@chittyos/schema` in dependencies
   - Run: `npm install @chittyos/schema`

2. **No Rogue Schemas**
   - Service MUST NOT contain SQL schema files
   - No `schema.sql`, `init-database.sql`, `create_tables.sql`, etc.
   - All migrations belong in chittyschema repository

3. **No Local Type Definitions**
   - Service MUST NOT define database types locally
   - Import all types from `@chittyos/schema`
   - Example: `import { Identity, ApiToken } from '@chittyos/schema'`

### ✅ MUST Pass (Error-Level)

4. **No ORM Dependencies**
   - Service MUST NOT use ORM schema definitions
   - No Drizzle, Prisma, TypeORM, or Sequelize
   - Use raw SQL with chittyschema types instead

5. **No ORM Configs**
   - Service MUST NOT have ORM configuration files
   - No `drizzle.config.ts`, `prisma/schema.prisma`, `ormconfig.json`
   - Remove all ORM scaffolding

### ⚠️ SHOULD Pass (Warnings)

6. **Schema Imports**
   - Service SHOULD import types from `@chittyos/schema`
   - Verifies active usage of central schema

7. **No Local Migrations**
   - Service SHOULD NOT have migration directories
   - Migrations managed in chittyschema only

---

## Running Validation

### From ChittySchema Repository

```bash
cd /Users/nb/Projects/development/chittyschema

# Validate a service
npm run validate:service ../chittyauth

# Validate multiple services
npm run validate:service ../chittyauth
npm run validate:service ../chittyverify
npm run validate:service ../chittyledger
```

### From Service Repository

```bash
cd /Users/nb/Projects/development/chittyauth

# Run validation
npx @chittyos/schema validate

# Or with explicit path
npx @chittyos/schema validate .
```

### In CI/CD Pipeline

```yaml
# .github/workflows/certification.yml
name: Schema Certification

on: [push, pull_request]

jobs:
  schema-compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Validate Schema Compliance
        run: npx @chittyos/schema validate

      - name: Upload Compliance Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: compliance-report
          path: compliance-report.json
```

---

## Compliance Report Format

```json
{
  "serviceName": "chittyauth",
  "compliant": true,
  "score": 100,
  "violations": [],
  "warnings": [],
  "passed": [
    {
      "rule": "SCHEMA_DEPENDENCY",
      "description": "✅ Uses @chittyos/schema package"
    },
    {
      "rule": "NO_ORM_DEPENDENCIES",
      "description": "✅ No ORM dependencies detected"
    },
    {
      "rule": "NO_ROGUE_SCHEMAS",
      "description": "✅ No rogue SQL schema files"
    }
  ]
}
```

### Scoring System

- **100**: Perfect compliance
- **90-99**: Minor warnings only
- **80-89**: Compliant with some warnings
- **60-79**: Non-compliant, errors present
- **< 60**: Critical violations

**Minimum for Certification**: 80/100 with zero critical violations

---

## Example: Non-Compliant Service

```bash
$ npm run validate:service ../old-service

🔍 Validating schema compliance for: old-service
════════════════════════════════════════════════════════════

❌ Violations:
   1. [CRITICAL] NO_ROGUE_SCHEMAS
      Found 3 SQL schema files in service repo
      File: src/database/schema.sql
      💡 Move all migrations to chittyschema repository

   2. [ERROR] NO_ORM_DEPENDENCIES
      Banned ORM dependencies found: drizzle-orm
      File: package.json
      💡 Remove ORM dependencies. Use @chittyos/schema types

   3. [CRITICAL] NO_LOCAL_TYPE_DEFINITIONS
      Found local database type definitions in 5 location(s)
      File: src/types/database.ts
      💡 Remove local type definitions. Import from @chittyos/schema

════════════════════════════════════════════════════════════

⛔ Service is NOT compliant. Fix violations before certification.
Score: 25/100
```

---

## Example: Compliant Service

```bash
$ npm run validate:service ../chittyauth

🔍 Validating schema compliance for: chittyauth
════════════════════════════════════════════════════════════

✅ Passed Checks:
   ✅ Uses @chittyos/schema package
   ✅ No ORM dependencies detected
   ✅ No rogue SQL schema files
   ✅ No ORM config files
   ✅ Using imported types from @chittyos/schema
   ✅ Found 12 import(s) from @chittyos/schema
   ✅ No local migration directories

════════════════════════════════════════════════════════════

🎉 Service is schema-compliant and ready for certification!
Score: 100/100
```

---

## Fixing Common Violations

### 1. Installing Schema Package

```bash
npm install @chittyos/schema
```

### 2. Removing Local Types

**Before** (❌):
```typescript
// src/types/database.ts
interface ApiToken {
  id: string;
  token: string;
  identity_id: string;
}
```

**After** (✅):
```typescript
// Remove src/types/database.ts entirely

// In your code files:
import { ApiToken, ApiTokenInsert } from '@chittyos/schema';
```

### 3. Removing ORM Dependencies

```bash
# Remove Drizzle
npm uninstall drizzle-orm drizzle-kit
rm drizzle.config.ts
rm -rf drizzle/

# Remove Prisma
npm uninstall prisma @prisma/client
rm -rf prisma/
```

### 4. Moving Migrations to ChittySchema

```bash
# In your service repo
git mv migrations/001_add_column.sql /path/to/chittyschema/migrations/chittyos-core/
git commit -m "Move migrations to chittyschema"

# In chittyschema repo
cd /path/to/chittyschema
git add migrations/chittyos-core/001_add_column.sql
npm run migration:apply
npm run generate
```

### 5. Converting to Raw SQL

**Before** (❌ Using Drizzle):
```typescript
import { pgTable, uuid, text } from 'drizzle-orm/pg-core';

export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey(),
  token: text('token').notNull(),
});

// Query
const tokens = await db.select().from(apiTokens).where(eq(apiTokens.id, tokenId));
```

**After** (✅ Using chittyschema + raw SQL):
```typescript
import { ApiToken, ApiTokenSchema } from '@chittyos/schema';
import { Client } from 'pg';

const client = new Client({ connectionString: env.NEON_DATABASE_URL });

// Query with type safety
const result = await client.query<ApiToken>(
  'SELECT * FROM api_tokens WHERE id = $1',
  [tokenId]
);
const token = result.rows[0];

// Runtime validation
const validated = ApiTokenSchema.parse(token);
```

---

## Integration with ChittyRegister

Schema certification is integrated with the **chittyregister** service for compliance tracking.

### Registration Workflow

```typescript
// In chittyregister
import { validateServiceCompliance } from '@chittyos/schema/validator';

async function registerService(serviceName: string, repoUrl: string) {
  // Clone and validate
  const report = await validateServiceCompliance(repoPath);

  if (!report.compliant) {
    throw new Error(`Service ${serviceName} failed schema certification: ${report.score}/100`);
  }

  // Proceed with registration
  await db.insert('services', {
    name: serviceName,
    schema_compliant: true,
    schema_score: report.score,
    certified_at: new Date(),
  });
}
```

### Certification Badge

Compliant services receive a badge:

```markdown
[![Schema Compliant](https://img.shields.io/badge/schema-compliant-brightgreen)](https://schema.chitty.cc)
```

---

## Pre-Deployment Checklist

Before deploying any ChittyOS service to production:

- [ ] Schema compliance score ≥ 80/100
- [ ] Zero critical violations
- [ ] Zero error-level violations
- [ ] `@chittyos/schema` installed and imported
- [ ] No local type definitions
- [ ] No ORM dependencies or configs
- [ ] No SQL schema files in service repo
- [ ] CI/CD validation passing
- [ ] Registered in chittyregister with certification

---

## Enforcement

### CI/CD Gates

All services MUST pass schema validation before:
- Merging to `main` branch
- Creating deployment tags
- Deploying to staging/production

### CodeRabbit Integration

`.coderabbitai.yaml` configuration:

```yaml
reviews:
  path_filters:
    - "package.json"
    - "src/**/*.ts"
    - "**/*.sql"

  path_instructions:
    - path: "package.json"
      instructions: |
        Verify:
        - @chittyos/schema is in dependencies
        - No ORM dependencies (drizzle-orm, prisma, typeorm, sequelize)

    - path: "src/**/*.ts"
      instructions: |
        Verify:
        - No local database type definitions
        - Imports from @chittyos/schema for database types

    - path: "**/*.sql"
      instructions: |
        REJECT: SQL schema files should not exist in service repos.
        All migrations must be in chittyschema repository.
```

### Automated Checks

```bash
# Pre-commit hook
#!/bin/bash
npx @chittyos/schema validate || {
  echo "❌ Schema compliance check failed"
  echo "Run: npx @chittyos/schema validate"
  exit 1
}
```

---

## Exemptions

### When Exemptions May Be Granted

1. **Legacy Services** (temporary, < 90 days)
   - Must have migration plan to chittyschema
   - Cannot deploy new features until compliant

2. **Experimental/Proof-of-Concept**
   - Must be marked clearly as non-production
   - Cannot access production databases

3. **External Integrations**
   - Third-party services not under ChittyOS control
   - Must document data flow and isolation

### Requesting Exemption

```bash
# Create exemption request
cat > .schema-exemption.yml << EOF
service: chitty-experimental
reason: "Proof-of-concept for new architecture pattern"
expires: "2025-02-01"
approved_by: "@architecture-team"
migration_plan: |
  1. Validate approach by 2025-01-15
  2. Migrate to chittyschema by 2025-01-31
  3. Remove exemption file
EOF

# Commit and get approval
git add .schema-exemption.yml
git commit -m "Request schema exemption"
# Open PR for architecture team review
```

---

## FAQ

**Q: My service doesn't use a database. Do I need certification?**
A: No. Certification only applies to services that interact with ChittyOS databases.

**Q: Can I use an ORM for non-ChittyOS databases?**
A: Yes, but you must still use `@chittyos/schema` for ChittyOS database types.

**Q: What if I need a custom type that extends a database type?**
A: Use TypeScript composition:
```typescript
import { Identity } from '@chittyos/schema';
type IdentityWithProfile = Identity & { profile: CustomProfile };
```

**Q: How do I add a new column to a table?**
A: Create a migration in chittyschema, not in your service repo. See [SCHEMA_GOVERNANCE.md](./SCHEMA_GOVERNANCE.md).

**Q: Why can't I use Drizzle/Prisma?**
A: ORMs create duplicate schema definitions, causing drift. chittyschema is the single source of truth.

**Q: What if validation fails in CI but passes locally?**
A: Ensure you're running the same version of `@chittyos/schema`. Update with `npm update @chittyos/schema`.

---

## Support

- **Certification Issues**: #chittyos-certification Slack
- **Schema Questions**: #chittyos-schema Slack
- **Exemption Requests**: architecture-team@chitty.cc
- **Emergency**: @chittyos-oncall

---

## Change Log

- **2025-01-06**: Schema certification requirement established
- **2025-01-06**: Validation script created
- **2025-01-06**: Integration with chittyregister planned

---

**Schema compliance is not optional. It's the foundation of ChittyOS reliability.**
