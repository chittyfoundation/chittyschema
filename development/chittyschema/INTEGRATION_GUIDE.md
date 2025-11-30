# ChittySchema Integration Guide

How to integrate schema certification into your service and workflows.

---

## For Services: Adding Certification

### 1. Install ChittySchema

```bash
npm install @chittyos/schema
```

### 2. Remove Existing Schema Code

```bash
# Remove local type definitions
rm -rf src/types/database.ts
rm -rf src/models/

# Remove ORM configurations
rm drizzle.config.ts
rm -rf drizzle/
rm -rf prisma/

# Remove SQL schema files
rm schema.sql
rm init-database.sql
rm -rf migrations/
```

### 3. Import Types from ChittySchema

```typescript
// Before: Local types ❌
interface ApiToken {
  id: string;
  token: string;
}

// After: Import from chittyschema ✅
import { ApiToken, ApiTokenInsert, ApiTokenUpdate } from '@chittyos/schema';
```

### 4. Add Certification Check to CI/CD

Create `.github/workflows/certification.yml`:

```yaml
name: Schema Certification

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  schema-compliance:
    uses: chittyfoundation/chittyschema/.github/workflows/schema-certification.yml@main
    with:
      service-path: '.'
```

### 5. Run Local Validation

```bash
# Install CLI globally
npm install -g @chittyos/schema

# Run validation
chittyschema validate .

# Or with npx
npx @chittyos/schema validate
```

### 6. Fix Violations

Follow the suggestions in the compliance report to fix any violations.

---

## For ChittyRegister: Service Registration

### Integration Hook

```typescript
// In chittyregister/src/routes/services.ts

import { validateForRegistration } from '@chittyos/schema/integrations/chittyregister-hook';

router.post('/api/services/register', async (req, res) => {
  const { serviceName, repoUrl, version } = req.body;

  // Run schema certification
  const certification = await validateForRegistration({
    serviceName,
    repoUrl,
    version,
    branch: 'main',
  });

  // Block registration if not certified
  if (!certification.certified) {
    return res.status(400).json({
      error: 'Schema certification required',
      score: certification.score,
      violations: certification.violations,
      message: 'Service must pass schema compliance before registration',
    });
  }

  // Store certification status
  await db.insert('services', {
    name: serviceName,
    repo_url: repoUrl,
    version,
    schema_certified: true,
    schema_score: certification.score,
    schema_violations: certification.violations,
    certified_at: certification.certifiedAt,
    cert_valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  res.json({
    success: true,
    service: { name: serviceName, version },
    certification,
  });
});
```

### Database Schema for ChittyRegister

```sql
-- Add to chittyregister tables

ALTER TABLE services ADD COLUMN schema_certified BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN schema_score INTEGER CHECK (schema_score >= 0 AND schema_score <= 100);
ALTER TABLE services ADD COLUMN schema_violations TEXT[];
ALTER TABLE services ADD COLUMN certified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN cert_valid_until TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_services_schema_certified ON services(schema_certified);
CREATE INDEX idx_services_schema_score ON services(schema_score DESC);
```

---

## For CI/CD: GitHub Actions

### Reusable Workflow

Services can call the central certification workflow:

```yaml
# In your service: .github/workflows/ci.yml

name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Tests
        run: npm test

  schema-certification:
    uses: chittyfoundation/chittyschema/.github/workflows/schema-certification.yml@main
    with:
      service-path: '.'

  deploy:
    needs: [test, schema-certification]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production..."
          # Deployment steps
```

### Blocking Non-Compliant Deployments

```yaml
# In deployment workflow

- name: Check Schema Certification
  run: |
    npx @chittyos/schema validate
    if [ $? -ne 0 ]; then
      echo "❌ Deployment blocked: Service is not schema-compliant"
      exit 1
    fi
```

---

## For Monitoring: Compliance Dashboard

### API Endpoint

```typescript
// In chittyregister

router.get('/api/services/compliance', async (req, res) => {
  const services = await db.query(`
    SELECT
      name,
      schema_certified,
      schema_score,
      schema_violations,
      certified_at,
      cert_valid_until
    FROM services
    ORDER BY schema_score DESC
  `);

  const stats = {
    total: services.length,
    certified: services.filter(s => s.schema_certified).length,
    averageScore: Math.round(
      services.reduce((sum, s) => sum + (s.schema_score || 0), 0) / services.length
    ),
    expiringSoon: services.filter(s =>
      s.cert_valid_until &&
      new Date(s.cert_valid_until) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length,
  };

  res.json({
    services,
    stats,
  });
});
```

### Dashboard UI

```typescript
// Frontend component

interface ComplianceStats {
  total: number;
  certified: number;
  averageScore: number;
  expiringSoon: number;
}

function ComplianceDashboard() {
  const { data } = useFetch<{ services: Service[], stats: ComplianceStats }>('/api/services/compliance');

  return (
    <div>
      <h1>Schema Compliance Dashboard</h1>

      <div className="stats">
        <Stat label="Total Services" value={data.stats.total} />
        <Stat label="Certified" value={data.stats.certified} color="green" />
        <Stat label="Average Score" value={`${data.stats.averageScore}/100`} />
        <Stat label="Expiring Soon" value={data.stats.expiringSoon} color="orange" />
      </div>

      <ServiceList services={data.services} />
    </div>
  );
}
```

---

## For Pre-Commit: Git Hooks

### Husky + Lint-Staged

```bash
npm install -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:
```bash
#!/bin/sh
npx lint-staged
npx @chittyos/schema validate
```

`package.json`:
```json
{
  "lint-staged": {
    "package.json": [
      "npx @chittyos/schema validate"
    ],
    "src/**/*.ts": [
      "eslint --fix",
      "npx @chittyos/schema validate"
    ]
  }
}
```

---

## For Notifications: Slack Integration

### Send Compliance Alerts

```typescript
// In chittyregister

async function notifyComplianceIssue(service: string, report: CertificationResult) {
  const webhook = process.env.SLACK_WEBHOOK_URL;

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `⚠️ Schema Compliance Issue: ${service}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Service:* ${service}\n*Score:* ${report.score}/100\n*Status:* ❌ Not Compliant`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Violations:*\n${report.violations.map(v => `• ${v}`).join('\n')}`,
          },
        },
      ],
    }),
  });
}
```

---

## For Documentation: Badge in README

Add to your service README:

```markdown
# ChittyAuth

[![Schema Compliant](https://img.shields.io/badge/schema-compliant-brightgreen)](https://schema.chitty.cc)
[![Schema Score](https://img.shields.io/badge/schema_score-100%2F100-brightgreen)](https://schema.chitty.cc)

Authentication and OAuth 2.0 provider for ChittyOS.
```

Dynamic badge endpoint:

```typescript
// In chittyregister

router.get('/api/services/:name/badge', async (req, res) => {
  const service = await db.query('SELECT schema_certified, schema_score FROM services WHERE name = $1', [req.params.name]);

  const badgeData = service.schema_certified
    ? { label: 'schema', message: `${service.schema_score}/100`, color: 'brightgreen' }
    : { label: 'schema', message: 'non-compliant', color: 'red' };

  // Use shields.io badge format
  res.redirect(`https://img.shields.io/badge/${badgeData.label}-${badgeData.message}-${badgeData.color}`);
});
```

---

## Testing Integration

### Test Service Repository

Create a test service to verify integration:

```bash
mkdir /tmp/test-service
cd /tmp/test-service

# Initialize service
npm init -y
npm install @chittyos/schema

# Create compliant code
cat > src/index.ts << 'EOF'
import { ApiToken, Identity } from '@chittyos/schema';

async function getToken(id: string): Promise<ApiToken> {
  // Implementation
}
EOF

# Run validation
npx @chittyos/schema validate

# Should output: ✅ Service is schema-compliant
```

---

## Rollout Plan

### Phase 1: Pilot (Week 1-2)
- [ ] Deploy chittyschema certification to staging
- [ ] Integrate with chittyregister staging
- [ ] Test with 2-3 pilot services (chittyauth, chittyid)
- [ ] Refine validation rules based on feedback

### Phase 2: Gradual Rollout (Week 3-4)
- [ ] Roll out to all core services
- [ ] Enable GitHub Action checks
- [ ] Monitor compliance scores
- [ ] Provide migration support to teams

### Phase 3: Enforcement (Week 5+)
- [ ] Make certification mandatory for production deployments
- [ ] Block non-compliant services in chittyregister
- [ ] Set up automated re-certification (every 90 days)
- [ ] Dashboard for monitoring ecosystem compliance

---

## Support Resources

- **Integration Help**: #chittyos-schema Slack
- **Certification Issues**: Open issue on chittyschema repo
- **Emergency Bypass**: Contact @architecture-team (requires approval)

---

**Schema certification ensures the entire ChittyOS ecosystem maintains type safety and schema consistency.**
