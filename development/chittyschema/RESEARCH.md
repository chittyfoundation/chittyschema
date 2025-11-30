# ChittyLedger Database Research

**Date**: 2025-11-06
**Database**: ChittyLedger (Neon PostgreSQL)
**Connection**: `chittyledger_psql_string`

---

## Database Architecture Overview

ChittyLedger uses **PostgreSQL schemas** (namespaces) to organize different domains within a single database. This provides:
- Logical separation of concerns
- Fine-grained access control per schema
- Ability to create case-specific schemas
- Clean data organization

---

## Discovered Schemas

### 1. **`public`** Schema - Foundational 5 Entity Types + Event Sourcing

**The 5 Fundamental Entities** (from your design):

#### People (PEO)
**Table**: `public.people` (37 columns)

**Features**:
- ChittyID tracking
- Entity types: INDIVIDUAL, LLC, CORP, TRUST, PARTNERSHIP, GOVERNMENT, NGO
- Hierarchical relationships (parent_entity_id)
- Temporal versioning (valid_from, valid_to, version_number)
- GDPR compliance built-in
- Verification workflow

**Key Fields**:
```typescript
chitty_id, legal_name, entity_type, sub_type
ssn, ein, foreign_id
date_of_birth, date_of_incorporation
place_of_birth_id, incorporation_place_id
parent_entity_id (hierarchical)
status, verification_status
gdpr_lawful_basis, gdpr_consent_status
valid_from, valid_to, version_number
```

#### Places (PLACE)
**Table**: `public.places`
- Locations, jurisdictions, venues
- Geographic data
- Court venues

#### Things (PROP)
**Table**: `public.things`
- Assets, property, documents
- Financial accounts
- Physical and digital evidence

#### Events (EVNT)
**Table**: `public.events` (41 columns)

**Event Types**:
- TRANSACTION, INCIDENT, HEARING, FILING
- MEETING, DISCOVERY, MOTION, SETTLEMENT
- VIOLATION, ACQUISITION, TRANSFER

**Features**:
- Start/end times with timezone
- Participants (primary_person_id, secondary_person_id, witness_ids)
- Location tracking
- Financial data (amount, currency, accounts)
- Legal significance tracking
- Confidentiality levels
- Temporal versioning

#### Authorities (AUTH)
**Table**: `public.authorities`
- Laws, regulations, case law
- Court orders, administrative orders
- Legal precedents

**Event Sourcing Infrastructure**:
- `event_store` - Complete audit trail with cryptographic integrity
- `schema_versions` - Migration tracking

**Legal Case Management**:
- `cases` - Litigation matters
- `case_parties` - Many-to-many case-person relationships
- `evidence` - Evidence items (from public schema)
- `atomic_facts` - Fact extraction

**Relationships & Analysis**:
- `entity_relationships` - Graph-style relationships

**System Users**:
- `users` - System access (NOT legal entities, separate from people)

**Compliance**:
- `gdpr_data_subjects` - GDPR compliance tracking
- `verification_tasks` - Workflow management

---

### 2. **`evidence`** Schema - Evidence Management

**Tables**: 3

#### `evidence.items`
**Columns**: 27

**Purpose**: Core evidence tracking with legal analysis

**Key Features**:
- ChittyID for each evidence item
- Case linkage (references `legal.cases`)
- Evidence tier/weight system
- **Admissibility analysis**:
  - Likely Admissible
  - Questionable
  - Likely Excludable
- **Hearsay status**:
  - Non-hearsay
  - Exception
  - Objection
- **Party impact**: Respondent, Plaintiff, Both, Unknown
- **Purpose**: Substantive, Impeachment, 404(b)/Character, Foundation/Authentication
- **Strength tags**: Pro, Con, Neutral
- **Scoring**: support_score (0-100), confidence_score (0-100)
- **Legal protections**: privileged, work_product flags
- **Row-level security**: Attorney/paralegal access policies

**Chain of Custody Integration**:
- Foreign key to `evidence.chain_of_custody`
- Trigger: `trigger_update_weight` auto-calculates weight from scores

#### `evidence.chain_of_custody`
**Purpose**: Custody tracking for evidence integrity

#### `evidence.witnesses`
**Purpose**: Witness tracking per case

---

### 3. **`legal`** Schema - Legal Case Management

**Tables**: 7

#### `legal.cases` (16 columns)
**Purpose**: Core case tracking

**Key Fields**:
```typescript
case_chitty_id, case_number, title
status (active, closed, archived)
court, judge
filed_date, close_date
attorney_chitty_id, paralegal_chitty_id, client_chitty_id
opposing_party
metadata (JSONB for flexibility)
```

**Row-level security**:
- Attorney/paralegal access policies
- Admin override policy

#### `legal.claims`
**Purpose**: Legal claims within cases

#### `legal.claim_elements`
**Purpose**: Elements of each claim (e.g., elements of negligence)

#### `legal.parties`
**Purpose**: Case parties (plaintiffs, defendants, etc.)

#### `legal.filings`
**Purpose**: Court filings tracking

#### `legal.deadlines`
**Purpose**: Deadline management

#### `legal.evidence_elements`
**Purpose**: Link evidence to claim elements

---

### 4. **`case_general`** Schema - General Case Repository

**Tables**: 2
- `cases` - General cases
- `documents` - Case documents

**Purpose**: Catch-all for cases not requiring specialized schemas

---

### 5. **`case_arias_v_bianchi`** Schema - **Case-Specific Isolation**

**Tables**: 2
- `documents` - Case-specific documents
- `timeline` - Case-specific timeline

**Purpose**: Per-case schema isolation for:
- Data isolation (security)
- Performance (smaller tables)
- Custom structures per case
- Easy archival/export

**Pattern**: Each major case can have its own schema (`case_{name}`)

---

## Missing Domains (Your Question)

Based on your question about Finance, Events, Corporate Governance:

### ❌ **Finance** Schema
**Status**: NOT FOUND in current database

**Expected tables** (if implemented):
- Financial transactions
- Bank accounts
- Payment tracking
- Budget/billing
- Trust accounting

**Current workaround**:
- `events` table supports financial data (amount, currency, accounts)
- May be in a separate database or planned for future

### ❌ **Corporate Governance** Schema
**Status**: NOT FOUND as dedicated schema

**Partial coverage**:
- `people` table supports entity types (LLC, CORP, TRUST, PARTNERSHIP)
- `entity_relationships` for corporate structures
- `events` table could track board meetings, resolutions

**Missing specialized features**:
- Board composition
- Shareholder tracking
- Meeting minutes
- Resolutions/votes
- Compliance filings

### ❌ **Other Niches**
**Status**: Not yet implemented

**Potential future schemas**:
- `finance` - Financial management
- `hr` - Human resources
- `contracts` - Contract lifecycle management
- `compliance` - Regulatory compliance
- `property` - Real estate management
- `intellectual_property` - IP management

---

## Schema Design Patterns

### Pattern 1: Foundational Entities (public schema)
- The 5 fundamental types: People, Places, Things, Events, Authorities
- Event sourcing for complete audit trail
- Temporal versioning for point-in-time queries
- GDPR compliance built-in

### Pattern 2: Domain-Specific Schemas (evidence, legal)
- Organized by business domain
- Cross-schema foreign keys (e.g., `evidence.items` → `legal.cases`)
- Row-level security per domain
- Specialized columns per domain

### Pattern 3: Per-Case Schemas (case_arias_v_bianchi)
- Schema-per-case for large/complex litigation
- Data isolation and security
- Performance optimization
- Easy archival/export

### Pattern 4: General Repository (case_general)
- Catch-all for standard cases
- Shared structure
- Simpler cases that don't need isolation

---

## Relationships & Integration Points

### Cross-Schema Foreign Keys

```
evidence.items.case_id → legal.cases.id
evidence.chain_of_custody.evidence_id → evidence.items.id
legal.evidence_elements.evidence_id → evidence.items.id
legal.parties.case_id → legal.cases.id
legal.claims.case_id → legal.cases.id
```

### ChittyID Integration

Every major entity has:
- `chitty_id` column (unique identifier across ecosystem)
- References to other entities via ChittyID
- Example: `legal.cases.attorney_chitty_id` references a person's ChittyID

### Temporal Versioning

Foundational entities use:
```sql
valid_from TIMESTAMPTZ DEFAULT NOW()
valid_to TIMESTAMPTZ DEFAULT 'infinity'
version_number INTEGER DEFAULT 1
```

Allows point-in-time queries for legal timeline reconstruction.

---

## Security & Access Control

### Row-Level Security (RLS) Policies

**`evidence.items`**:
```sql
POLICY "evidence_case_policy"
USING (
  EXISTS (
    SELECT 1 FROM legal.cases
    WHERE cases.id = items.case_id
    AND (
      cases.attorney_chitty_id = current_setting('app.current_user_chitty_id')
      OR cases.paralegal_chitty_id = current_setting('app.current_user_chitty_id')
    )
  )
)
```

**`legal.cases`**:
- `cases_admin_policy` - Admin access
- `cases_attorney_policy` - Attorney access
- Uses `current_setting('app.current_user_chitty_id')` for user context

---

## Data Integrity & Constraints

### Check Constraints

**Evidence Admissibility**:
```sql
CHECK (admissibility IN ('Likely Admissible', 'Questionable', 'Likely Excludable'))
```

**Hearsay Status**:
```sql
CHECK (hearsay_status IN ('Non-hearsay', 'Exception', 'Objection'))
```

**Scoring**:
```sql
CHECK (support_score >= 0 AND support_score <= 100)
CHECK (confidence_score >= 0 AND confidence_score <= 100)
```

### Triggers

**Auto-weight calculation** (`evidence.items`):
```sql
TRIGGER trigger_update_weight
BEFORE INSERT OR UPDATE OF support_score, confidence_score
FOR EACH ROW
EXECUTE FUNCTION legal.update_evidence_weight()
```

Automatically calculates evidence weight based on support and confidence scores.

---

## chittyschema Package Plan

### Proposed Structure

```
packages/chittyschema/src/types/
├── chittyos-core/          # Identity, auth (already done)
│   ├── identities.ts
│   ├── api-tokens.ts
│   ├── credentials.ts
│   └── audit-logs.ts
├── chittyledger/
│   ├── foundational/       # The 5 entity types (public schema)
│   │   ├── people.ts
│   │   ├── places.ts
│   │   ├── things.ts
│   │   ├── events.ts
│   │   ├── authorities.ts
│   │   ├── event-store.ts
│   │   └── index.ts
│   ├── evidence/           # evidence.* schema
│   │   ├── items.ts
│   │   ├── chain-of-custody.ts
│   │   ├── witnesses.ts
│   │   └── index.ts
│   ├── legal/              # legal.* schema
│   │   ├── cases.ts
│   │   ├── claims.ts
│   │   ├── claim-elements.ts
│   │   ├── parties.ts
│   │   ├── filings.ts
│   │   ├── deadlines.ts
│   │   ├── evidence-elements.ts
│   │   └── index.ts
│   ├── case-general/       # case_general.* schema
│   │   ├── cases.ts
│   │   ├── documents.ts
│   │   └── index.ts
│   └── index.ts
└── index.ts
```

### Type Export Strategy

```typescript
// Namespace exports
export * as ChittyOSCore from './chittyos-core';
export * as ChittyLedger from './chittyledger';

// Direct exports for convenience
export * from './chittyos-core';
export * from './chittyledger';

// Usage:
import { People, Events, LegalCase, EvidenceItem } from '@chittysuss/chittyschema';
// OR
import { ChittyLedger } from '@chittysuss/chittyschema';
const person: ChittyLedger.People = { ... };
```

---

## Recommendations

### 1. Implement Existing Schemas First
- Complete types for all discovered schemas
- Test against real data
- Document usage patterns

### 2. Design Missing Schemas (Finance, Governance)
- Follow established patterns
- Use schema separation
- Implement temporal versioning
- Add RLS policies

### 3. Per-Case Schema Strategy
- Document when to create case-specific schema
- Create template for case schemas
- Establish naming convention
- Provide migration scripts

### 4. Future Expansion
- `finance` schema for financial management
- `governance` schema for corporate governance
- `contracts` schema for contract lifecycle
- `compliance` schema for regulatory tracking

---

## Next Steps

1. ✅ Research complete
2. ⏳ Create comprehensive type definitions for all discovered schemas
3. ⏳ Add Zod validators for runtime validation
4. ⏳ Document usage patterns with examples
5. ⏳ Design Finance and Governance schemas
6. ⏳ Create migration templates for new case schemas

