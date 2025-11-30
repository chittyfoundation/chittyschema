# ChittySchema Deployment Guide

## Version 0.1.1 - Initial Release

**Date**: 2025-01-06
**Status**: ✅ Ready for Production

---

## What's Being Deployed

### Package: `@chittyos/schema`

**Universal Data Framework** for the ChittyOS ecosystem with:

- ✅ **43 TypeScript types** (19 from ChittyOS-Core + 24 from ChittyLedger)
- ✅ **12 PostgreSQL ENUMs** (ChittyLedger evidence classification system)
- ✅ **Dual-database introspection** (ChittyOS-Core + ChittyLedger)
- ✅ **Schema certification system** (validates service compliance)
- ✅ **CLI tool** for validation and introspection
- ✅ **GitHub Actions workflow** for CI/CD integration

---

## Pre-Deployment Checklist

### Build Verification

- [x] All 43 tables introspected successfully
- [x] TypeScript types generated without errors
- [x] ENUMs properly formatted (12 enums with correct values)
- [x] Build completes successfully (`npm run build`)
- [x] Dist directory contains all files
- [x] CLI tool functional (`chittyschema --help`)
- [x] No TypeScript compilation errors

### Documentation

- [x] README.md complete
- [x] SCHEMA_GOVERNANCE.md (9,000+ words)
- [x] CERTIFICATION.md (certification requirements)
- [x] INTEGRATION_GUIDE.md (service integration)
- [x] IMPLEMENTATION_SUMMARY.md (what was built)

### Schema Deployment

- [x] ChittyOS-Core: 19 tables live
- [x] ChittyLedger: 24 tables deployed (universal ledger)
- [x] All migrations applied successfully
- [x] Database introspection verified

---

## Deployment Steps

### 1. NPM Publishing

```bash
# Verify you're logged into npm
npm whoami

# If not logged in
npm login

# Publish package
npm publish --access public

# Verify publication
npm info @chittyos/schema
```

### 2. Verify Published Package

```bash
# Create test directory
mkdir /tmp/test-chittyschema
cd /tmp/test-chittyschema

# Install published package
npm init -y
npm install @chittyos/schema

# Test imports
node -e "const schema = require('@chittyos/schema'); console.log(Object.keys(schema));"
```

### 3. Tag Git Release

```bash
cd /Users/nb/Projects/development/chittyschema

git add .
git commit -m "Release v0.1.1: Central schema authority with certification"
git tag -a v0.1.1 -m "Initial release: Universal data framework"
git push origin main --tags
```

### 4. Create GitHub Release

Navigate to: https://github.com/chittyfoundation/chittyschema/releases/new

**Tag**: v0.1.1
**Title**: ChittySchema v0.1.1 - Central Schema Authority

**Description**:
```markdown
# ChittySchema v0.1.1 - Initial Release

## 🎯 Central Schema Authority Established

chittyschema is now the single source of truth for all database schemas in the ChittyOS ecosystem.

### What's Included

✅ **43 TypeScript Types** across 2 databases
- ChittyOS-Core: 19 tables (identities, api_tokens, credentials, etc.)
- ChittyLedger: 24 tables (evidence, financial_transactions, event_ledger, etc.)

✅ **12 PostgreSQL ENUMs**
- Evidence classification system (EvidenceTier, CaseType, etc.)
- Transaction types, event types, blockchain networks

✅ **Schema Certification System**
- Validates service compliance before deployment
- CI/CD integration via GitHub Actions
- Minimum 80/100 score required

✅ **Dual-Database Introspection**
- Automatically generates types from live databases
- No manual type definitions allowed

✅ **CLI Tool**
```bash
npm install -g @chittyos/schema
chittyschema validate ../your-service
chittyschema introspect
```

### Installation

```bash
npm install @chittyos/schema
```

### Usage

```typescript
import { ApiToken, Identity, Evidence } from '@chittyos/schema';

// Type-safe database operations
const token: ApiToken = await db.query(/*...*/);

// Runtime validation
import { ApiTokenSchema } from '@chittyos/schema';
const result = ApiTokenSchema.safeParse(data);
```

### Documentation

- [README](./README.md) - Quick start guide
- [SCHEMA_GOVERNANCE](./SCHEMA_GOVERNANCE.md) - Complete authority model
- [CERTIFICATION](./CERTIFICATION.md) - Certification requirements
- [INTEGRATION_GUIDE](./INTEGRATION_GUIDE.md) - Service integration

### Breaking Changes from Manual Types

Services must now:
- Remove local database type definitions
- Remove ORM configurations (Drizzle, Prisma)
- Import all types from `@chittyos/schema`
- Pass schema certification (80/100 minimum)

### Next Steps

1. **Services**: `npm install @chittyos/schema` and remove local types
2. **CI/CD**: Add schema certification to workflows
3. **ChittyRegister**: Integrate certification into registration

---

**The database is the source of truth. Types are generated, never written.**
```

### 5. Update ChittyOS Ecosystem Documentation

Update `/Users/nb/Projects/development/CLAUDE.md`:

```markdown
### Schema & Data
- **chittyschema/** - Universal data framework and central schema authority. Generates TypeScript types from live databases. Deployed as `@chittyos/schema` npm package. All services must import types from here.
```

---

## Post-Deployment Verification

### Check NPM

```bash
# Verify package is published
npm info @chittyos/schema

# Should show version 0.1.1
npm view @chittyos/schema version
```

### Test Installation

```bash
# In a service directory
npm install @chittyos/schema@latest

# Verify types are available
npx tsc --noEmit  # Should compile without errors
```

### Verify GitHub Release

- [ ] Release tagged as v0.1.1
- [ ] Release notes published
- [ ] Documentation links work
- [ ] Assets attached (if any)

---

## Rollout Plan

### Phase 1: Pilot Services (Week 1)

**Target**: chittyauth, chittyid

```bash
cd ../chittyauth
npm install @chittyos/schema
# Remove local types
# Add certification workflow
npm run validate
```

**Success Criteria**:
- [ ] Service builds successfully
- [ ] Schema certification passes (80/100+)
- [ ] No runtime type errors
- [ ] CI/CD pipeline passes

### Phase 2: Core Services (Week 2-3)

**Target**: chittyverify, chittytrust, chittyconnect, chittyrouter

- [ ] Migrate all core services
- [ ] Remove all ORM configurations
- [ ] Enable certification in CI/CD
- [ ] Monitor for issues

### Phase 3: Remaining Services (Week 4+)

**Target**: chittychronicle, chittyreception, chittyledger, bane

- [ ] Complete ecosystem migration
- [ ] Enforce certification requirement
- [ ] Monitor compliance dashboard
- [ ] Block non-compliant deployments

---

## Monitoring

### NPM Download Stats

```bash
# Check download count
npm info @chittyos/schema

# Monitor weekly downloads
curl https://api.npmjs.org/downloads/point/last-week/@chittyos/schema
```

### Service Compliance

Monitor via chittyregister:
- Services certified: 0 → 12+
- Average compliance score
- Violations detected and resolved

---

## Support

### For Service Teams

1. **Installation Issues**: #chittyos-schema Slack
2. **Type Errors**: Check you're importing from `@chittyos/schema`
3. **Certification Failures**: Run `chittyschema validate` locally
4. **Migration Help**: Ping @schema-team

### For Schema Changes

1. **New Tables**: Create migration in chittyschema repo
2. **Column Changes**: Follow governance process
3. **Breaking Changes**: Coordinate with all services
4. **Emergency**: Contact @chittyos-oncall

---

## Rollback Plan

If critical issues are discovered:

### 1. Unpublish Package (if within 72 hours)

```bash
npm unpublish @chittyos/schema@0.1.1
```

### 2. Fix Issues

- Identify root cause
- Fix type generation or schema
- Test thoroughly

### 3. Republish

```bash
npm version patch  # 0.1.2
npm publish
```

### 4. Notify Services

Post in #chittyos-schema:
```
⚠️ Critical fix published: @chittyos/schema@0.1.2
Please update immediately: npm update @chittyos/schema
```

---

## Success Metrics

### Week 1
- [ ] Package published successfully
- [ ] 2+ services migrated
- [ ] Zero critical bugs reported

### Month 1
- [ ] All 12+ services migrated
- [ ] 90%+ compliance rate
- [ ] Certification integrated in chittyregister

### Quarter 1
- [ ] Zero rogue schemas in ecosystem
- [ ] Auto-certification on PR
- [ ] Schema drift detection automated

---

## Files Deployed

```
@chittyos/schema@0.1.1
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   ├── types/
│   │   ├── chittyos-core/ (19 tables)
│   │   └── chittyledger/ (24 tables + enums)
│   ├── integrations/
│   │   └── chittyregister-hook.js
│   └── cli.js
├── package.json
├── README.md
├── SCHEMA_GOVERNANCE.md
├── CERTIFICATION.md
└── INTEGRATION_GUIDE.md
```

**Size**: ~2.5 MB (includes all types and documentation)

---

## Changelog

### v0.1.1 (2025-01-06)

#### Added
- Initial release of chittyschema central authority
- Dual-database introspection (ChittyOS-Core + ChittyLedger)
- 43 TypeScript types generated from live databases
- 12 PostgreSQL ENUM types
- Schema certification system
- CLI tool for validation and introspection
- GitHub Actions reusable workflow
- ChittyRegister integration hook
- Comprehensive documentation (15,000+ words)

#### Changed
- N/A (initial release)

#### Deprecated
- Manual type definitions in service repos
- ORM schema configurations (Drizzle, Prisma)

#### Removed
- N/A (initial release)

#### Fixed
- N/A (initial release)

---

**Deployment Status**: ✅ Ready
**Risk Level**: Low (new package, no breaking changes to existing services)
**Required Actions**: Install in services, remove local types

**Deploy Command**: `npm publish --access public`
