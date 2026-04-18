# chittyledger Schema Documentation

**Description:** Legal evidence and transaction ledger for court-admissible records
**Generated:** 11/9/2025, 5:29:45 PM
**Database:** neondb
**Version:** 1.0.0

## Table of Contents

- **chittychain**
  - [blockchain_records](#blockchain-records)
- **chittyledger**
  - [api_usage_ledger](#api-usage-ledger)
  - [atomic_facts](#atomic-facts)
  - [audit_log](#audit-log)
  - [cases](#cases)
  - [chain_of_custody](#chain-of-custody)
  - [contradictions](#contradictions)
  - [event_ledger](#event-ledger)
  - [evidence](#evidence)
  - [financial_transactions](#financial-transactions)
  - [invoices](#invoices)
  - [subscriptions](#subscriptions)
  - [users](#users)
- **unknown**
  - [authorities](#authorities)
  - [case_parties](#case-parties)
  - [entity_relationships](#entity-relationships)
  - [event_store](#event-store)
  - [events](#events)
  - [gdpr_data_subjects](#gdpr-data-subjects)
  - [people](#people)
  - [places](#places)
  - [schema_versions](#schema-versions)
  - [things](#things)
  - [verification_tasks](#verification-tasks)

## PostgreSQL Extensions

- `btree_gin`
- `pgcrypto`
- `plpgsql`
- `uuid-ossp`

## Enums

### blockchain_network

**Values:**
- `ETHEREUM_MAINNET`
- `ETHEREUM_SEPOLIA`
- `POLYGON`
- `BASE`
- `LOCAL_TESTNET`

### case_type

**Values:**
- `DIVORCE`
- `CUSTODY`
- `CIVIL`
- `CRIMINAL`
- `PROBATE`

### classification_level

**Values:**
- `FACT`
- `SUPPORTED_CLAIM`
- `ASSERTION`
- `ALLEGATION`
- `CONTRADICTION`

### event_severity

**Values:**
- `DEBUG`
- `INFO`
- `WARNING`
- `ERROR`
- `CRITICAL`

### event_type

**Values:**
- `USER_ACTION`
- `SYSTEM_EVENT`
- `API_CALL`
- `SERVICE_INTERACTION`
- `ERROR`
- `SECURITY`
- `AUDIT`
- `INTEGRATION`

### evidence_tier

**Values:**
- `SELF_AUTHENTICATING`
- `GOVERNMENT`
- `FINANCIAL_INSTITUTION`
- `INDEPENDENT_THIRD_PARTY`
- `BUSINESS_RECORDS`
- `FIRST_PARTY_ADVERSE`
- `FIRST_PARTY_FRIENDLY`
- `UNCORROBORATED_PERSON`

### evidence_type

**Values:**
- `Document`
- `Image`
- `Communication`
- `"Financial Record"`
- `"Legal Filing"`
- `"Physical Evidence"`

### fact_type

**Values:**
- `DATE`
- `AMOUNT`
- `ADMISSION`
- `IDENTITY`
- `LOCATION`
- `RELATIONSHIP`
- `ACTION`
- `STATUS`

### subscription_status

**Values:**
- `ACTIVE`
- `PAUSED`
- `CANCELLED`
- `EXPIRED`
- `TRIAL`

### transaction_status

**Values:**
- `PENDING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`
- `DISPUTED`
- `REFUNDED`

### transaction_type

**Values:**
- `PAYMENT`
- `REFUND`
- `INVOICE`
- `SUBSCRIPTION`
- `CREDIT`
- `DEBIT`
- `FEE`
- `ADJUSTMENT`

### user_type

**Values:**
- `PARTY_PETITIONER`
- `PARTY_RESPONDENT`
- `ATTORNEY_PETITIONER`
- `ATTORNEY_RESPONDENT`
- `COURT_OFFICER`
- `EXPERT_WITNESS`

## Chittychain Tables

### blockchain_records

> ChittyLedger: Blockchain transaction records and cryptographic proofs

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.BlockchainRecords = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `record_id` | text | No | - | - |
| `blockchain_network` | blockchain_network | No | - | - |
| `transaction_hash` | text | No | - | - |
| `block_number` | bigint | Yes | - | - |
| `block_timestamp` | timestamp with time zone | Yes | - | - |
| `contract_address` | text | Yes | - | - |
| `from_address` | text | No | - | - |
| `to_address` | text | Yes | - | - |
| `gas_used` | bigint | Yes | - | - |
| `gas_price` | bigint | Yes | - | - |
| `entity_type` | text | No | - | - |
| `entity_id` | uuid | No | - | - |
| `metadata_uri` | text | Yes | - | - |
| `metadata_hash` | text | Yes | - | - |
| `proof_data` | jsonb | Yes | - | - |
| `minted_by` | uuid | Yes | FK → users.id | - |
| `created_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `minted_by` → `users.id` (ON DELETE SET NULL)

**Indexes:**

- `blockchain_records_pkey` on `{id}` (btree) (UNIQUE)
- `blockchain_records_record_id_key` on `{record_id}` (btree) (UNIQUE)
- `blockchain_records_transaction_hash_key` on `{transaction_hash}` (btree) (UNIQUE)
- `idx_blockchain_records_blockchain_network` on `{blockchain_network}` (btree)
- `idx_blockchain_records_entity_type_id` on `{entity_type,entity_id}` (btree)
- `idx_blockchain_records_minted_by` on `{minted_by}` (btree)
- `idx_blockchain_records_transaction_hash` on `{transaction_hash}` (btree)


## Chittyledger Tables

### api_usage_ledger

> ChittyLedger: API usage tracking for rate limiting and analytics

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.ApiUsageLedger = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `request_id` | text | No | - | - |
| `user_id` | uuid | Yes | FK → users.id | - |
| `api_key_hash` | text | Yes | - | - |
| `endpoint` | text | No | - | - |
| `method` | text | No | - | - |
| `status_code` | integer | Yes | - | - |
| `response_time_ms` | integer | Yes | - | - |
| `request_size_bytes` | integer | Yes | - | - |
| `response_size_bytes` | integer | Yes | - | - |
| `ip_address` | inet | Yes | - | - |
| `user_agent` | text | Yes | - | - |
| `referer` | text | Yes | - | - |
| `error_message` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `timestamp` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `user_id` → `users.id` (ON DELETE SET NULL)

**Indexes:**

- `api_usage_ledger_pkey` on `{id}` (btree) (UNIQUE)
- `api_usage_ledger_request_id_key` on `{request_id}` (btree) (UNIQUE)
- `idx_api_usage_ledger_api_key_hash` on `{api_key_hash}` (btree)
- `idx_api_usage_ledger_endpoint` on `{endpoint}` (btree)
- `idx_api_usage_ledger_timestamp` on `{timestamp}` (btree)
- `idx_api_usage_ledger_user_id` on `{user_id}` (btree)


### atomic_facts

> ChittyLedger: AI-extracted atomic facts from evidence documents

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.AtomicFacts = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `evidence_id` | uuid | Yes | FK → evidence.id | - |
| `case_id` | uuid | No | FK → cases.id | - |
| `asserted_by` | uuid | Yes | FK → people.id | - |
| `fact_text` | text | No | - | - |
| `fact_type` | text | No | - | - |
| `related_person_id` | uuid | Yes | FK → people.id | - |
| `related_place_id` | uuid | Yes | FK → places.id | - |
| `related_thing_id` | uuid | Yes | FK → things.id | - |
| `related_event_id` | uuid | Yes | FK → events.id | - |
| `related_authority_id` | uuid | Yes | FK → authorities.id | - |
| `location_in_document` | text | Yes | - | - |
| `page_number` | integer | Yes | - | - |
| `line_number` | integer | Yes | - | - |
| `timestamp_in_media` | interval | Yes | - | - |
| `classification_level` | text | No | - | - |
| `certainty_level` | text | Yes | - | - |
| `weight` | numeric | Yes | - | - |
| `credibility_factors` | ARRAY | Yes | - | - |
| `bias_indicators` | ARRAY | Yes | - | - |
| `supports_fact_ids` | ARRAY | Yes | - | - |
| `contradicts_fact_ids` | ARRAY | Yes | - | - |
| `temporal_sequence` | integer | Yes | - | - |
| `logical_dependency_ids` | ARRAY | Yes | - | - |
| `verified` | boolean | Yes | - | - |
| `verified_by` | uuid | Yes | FK → people.id | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `verification_method` | text | Yes | - | - |
| `discoverable` | boolean | Yes | - | - |
| `privileged` | boolean | Yes | - | - |
| `privilege_type` | text | Yes | - | - |
| `extracted_by_ai` | boolean | Yes | - | - |
| `ai_confidence_score` | numeric | Yes | - | - |
| `ai_model_version` | text | Yes | - | - |
| `human_reviewed` | boolean | Yes | - | - |
| `tags` | ARRAY | Yes | - | - |
| `legal_elements` | ARRAY | Yes | - | - |
| `fact_date` | date | Yes | - | - |
| `fact_time` | time without time zone | Yes | - | - |
| `duration` | interval | Yes | - | - |
| `valid_from` | timestamp with time zone | Yes | - | - |
| `valid_to` | timestamp with time zone | Yes | - | - |
| `version_number` | integer | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `asserted_by` → `people.id` (ON DELETE NO ACTION)
- `case_id` → `cases.id` (ON DELETE NO ACTION)
- `evidence_id` → `evidence.id` (ON DELETE CASCADE)
- `related_authority_id` → `authorities.id` (ON DELETE NO ACTION)
- `related_event_id` → `events.id` (ON DELETE NO ACTION)
- `related_person_id` → `people.id` (ON DELETE NO ACTION)
- `related_place_id` → `places.id` (ON DELETE NO ACTION)
- `related_thing_id` → `things.id` (ON DELETE NO ACTION)
- `verified_by` → `people.id` (ON DELETE NO ACTION)

**Indexes:**

- `atomic_facts_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `atomic_facts_pkey` on `{id}` (btree) (UNIQUE)
- `idx_atomic_facts_evidence_id` on `{evidence_id}` (btree)
- `idx_atomic_facts_fact_type` on `{fact_type}` (btree)
- `idx_facts_case` on `{case_id}` (btree)
- `idx_facts_chitty_id` on `{chitty_id}` (btree)
- `idx_facts_entities` on `{related_person_id,related_place_id,related_thing_id,related_event_id,related_authority_id}` (btree)
- `idx_facts_evidence` on `{evidence_id}` (btree)
- `idx_facts_temporal` on `{valid_from,valid_to}` (btree)
- `idx_facts_type_classification` on `{fact_type,classification_level}` (btree)
- `idx_facts_verification` on `{verified,verification_method}` (btree)
- `idx_facts_weight` on `{weight}` (btree)


### audit_log

> ChittyLedger: System-wide immutable audit trail

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.AuditLog = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `event_type` | text | No | - | - |
| `entity_type` | text | No | - | - |
| `entity_id` | uuid | Yes | - | - |
| `user_id` | uuid | Yes | FK → users.id | - |
| `action` | text | No | - | - |
| `old_value` | jsonb | Yes | - | - |
| `new_value` | jsonb | Yes | - | - |
| `ip_address` | inet | Yes | - | - |
| `user_agent` | text | Yes | - | - |
| `timestamp` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `user_id` → `users.id` (ON DELETE NO ACTION)

**Indexes:**

- `audit_log_pkey` on `{id}` (btree) (UNIQUE)
- `idx_audit_log_entity_id` on `{entity_id}` (btree)
- `idx_audit_log_entity_type` on `{entity_type}` (btree)
- `idx_audit_log_timestamp` on `{timestamp}` (btree)
- `idx_audit_log_user_id` on `{user_id}` (btree)


### cases

> ChittyLedger: Legal cases and court proceedings

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Cases = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `docket_number` | text | No | - | - |
| `title` | text | No | - | - |
| `case_type` | text | No | - | - |
| `sub_type` | text | Yes | - | - |
| `jurisdiction_id` | uuid | Yes | FK → places.id | - |
| `venue_id` | uuid | Yes | FK → places.id | - |
| `judge_name` | text | Yes | - | - |
| `courtroom` | text | Yes | - | - |
| `lead_counsel_id` | uuid | Yes | FK → people.id | - |
| `opposing_counsel_id` | uuid | Yes | FK → people.id | - |
| `filing_date` | date | Yes | - | - |
| `answer_due_date` | date | Yes | - | - |
| `discovery_deadline` | date | Yes | - | - |
| `motion_deadline` | date | Yes | - | - |
| `trial_date` | date | Yes | - | - |
| `status_conference_date` | date | Yes | - | - |
| `estimated_value` | numeric | Yes | - | - |
| `actual_settlement` | numeric | Yes | - | - |
| `attorney_fees` | numeric | Yes | - | - |
| `court_costs` | numeric | Yes | - | - |
| `status` | text | Yes | - | - |
| `resolution_type` | text | Yes | - | - |
| `resolution_date` | date | Yes | - | - |
| `is_confidential` | boolean | Yes | - | - |
| `confidentiality_level` | text | Yes | - | - |
| `sealed_portions` | jsonb | Yes | - | - |
| `parent_case_id` | uuid | Yes | FK → cases.id | - |
| `related_case_ids` | ARRAY | Yes | - | - |
| `governing_law_ids` | ARRAY | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `jurisdiction_id` → `places.id` (ON DELETE NO ACTION)
- `lead_counsel_id` → `people.id` (ON DELETE NO ACTION)
- `opposing_counsel_id` → `people.id` (ON DELETE NO ACTION)
- `parent_case_id` → `cases.id` (ON DELETE NO ACTION)
- `venue_id` → `places.id` (ON DELETE NO ACTION)

**Indexes:**

- `cases_case_chitty_id_key` on `{case_chitty_id,case_chitty_id}` (btree) (UNIQUE)
- `cases_case_number_key` on `{case_number}` (btree) (UNIQUE)
- `cases_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `cases_docket_number_key` on `{docket_number}` (btree) (UNIQUE)
- `cases_pkey` on `{id,id,id}` (btree) (UNIQUE)
- `idx_cases_attorney` on `{attorney_chitty_id}` (btree)
- `idx_cases_case_type` on `{case_type}` (btree)
- `idx_cases_chitty_id` on `{chitty_id}` (btree)
- `idx_cases_client` on `{client_chitty_id}` (btree)
- `idx_cases_counsel` on `{lead_counsel_id,opposing_counsel_id}` (btree)
- `idx_cases_dates` on `{filing_date,trial_date}` (btree)
- `idx_cases_docket` on `{docket_number}` (btree)
- `idx_cases_jurisdiction` on `{jurisdiction_id,venue_id}` (btree)
- `idx_cases_status` on `{status,status}` (btree)
- `idx_cases_type` on `{case_type,sub_type}` (btree)
- `idx_general_cases_attorney` on `{attorney_chitty_id}` (btree)
- `idx_general_cases_status` on `{status}` (btree)


### chain_of_custody

> ChittyLedger: Immutable audit trail for evidence handling

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.ChainOfCustody = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `evidence_id` | uuid | No | FK → items.id | - |
| `action` | text | No | - | - |
| `performed_by` | uuid | No | FK → users.id | - |
| `ip_address` | inet | Yes | - | - |
| `user_agent` | text | Yes | - | - |
| `notes` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `timestamp` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `evidence_id` → `items.id` (ON DELETE CASCADE)
- `evidence_id` → `items.id` (ON DELETE CASCADE)
- `evidence_id` → `evidence.id` (ON DELETE CASCADE)
- `evidence_id` → `evidence.id` (ON DELETE CASCADE)
- `performed_by` → `users.id` (ON DELETE RESTRICT)

**Indexes:**

- `chain_of_custody_pkey` on `{id,id}` (btree) (UNIQUE)
- `idx_chain_evidence` on `{evidence_id}` (btree)
- `idx_chain_of_custody_evidence_id` on `{evidence_id}` (btree)
- `idx_chain_of_custody_performed_by` on `{performed_by}` (btree)
- `idx_chain_of_custody_timestamp` on `{timestamp}` (btree)
- `idx_chain_timestamp` on `{timestamp}` (btree)


### contradictions

> ChittyLedger: Detected contradictions between atomic facts

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Contradictions = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `fact_a_id` | uuid | No | FK → atomic_facts.id | - |
| `fact_b_id` | uuid | No | FK → atomic_facts.id | - |
| `contradiction_type` | text | No | - | - |
| `severity` | text | No | - | - |
| `explanation` | text | Yes | - | - |
| `detected_by` | text | Yes | - | - |
| `detected_at` | timestamp with time zone | Yes | - | - |
| `resolved` | boolean | Yes | - | - |
| `resolution_notes` | text | Yes | - | - |

**Foreign Keys:**

- `fact_a_id` → `atomic_facts.id` (ON DELETE CASCADE)
- `fact_b_id` → `atomic_facts.id` (ON DELETE CASCADE)

**Indexes:**

- `contradictions_pkey` on `{id}` (btree) (UNIQUE)
- `idx_contradictions_fact_a_id` on `{fact_a_id}` (btree)
- `idx_contradictions_fact_b_id` on `{fact_b_id}` (btree)
- `idx_contradictions_resolved` on `{resolved}` (btree)
- `idx_contradictions_severity` on `{severity}` (btree)


### event_ledger

> ChittyLedger: Immutable event log for all ChittyOS services

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.EventLedger = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `event_id` | text | No | - | - |
| `event_type` | event_type | No | - | - |
| `event_severity` | event_severity | No | - | - |
| `service_name` | text | No | - | - |
| `user_id` | uuid | Yes | FK → users.id | - |
| `case_id` | uuid | Yes | FK → cases.id | - |
| `action` | text | No | - | - |
| `entity_type` | text | Yes | - | - |
| `entity_id` | uuid | Yes | - | - |
| `ip_address` | inet | Yes | - | - |
| `user_agent` | text | Yes | - | - |
| `request_id` | text | Yes | - | - |
| `session_id` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `timestamp` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `case_id` → `cases.id` (ON DELETE SET NULL)
- `user_id` → `users.id` (ON DELETE SET NULL)

**Indexes:**

- `event_ledger_event_id_key` on `{event_id}` (btree) (UNIQUE)
- `event_ledger_pkey` on `{id}` (btree) (UNIQUE)
- `idx_event_ledger_entity_type_id` on `{entity_type,entity_id}` (btree)
- `idx_event_ledger_event_id` on `{event_id}` (btree)
- `idx_event_ledger_event_type` on `{event_type}` (btree)
- `idx_event_ledger_request_id` on `{request_id}` (btree)
- `idx_event_ledger_service_name` on `{service_name}` (btree)
- `idx_event_ledger_timestamp` on `{timestamp}` (btree)
- `idx_event_ledger_user_id` on `{user_id}` (btree)


### evidence

> ChittyLedger: Court-admissible evidence repository

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Evidence = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `case_id` | uuid | No | FK → cases.id | - |
| `thing_id` | uuid | No | FK → things.id | - |
| `evidence_number` | text | Yes | - | - |
| `evidence_type` | text | Yes | - | - |
| `evidence_tier` | text | No | - | - |
| `weight` | numeric | Yes | - | - |
| `authentication_method` | text | Yes | - | - |
| `authenticated_by` | uuid | Yes | FK → people.id | - |
| `authentication_date` | date | Yes | - | - |
| `chain_of_custody_verified` | boolean | Yes | - | - |
| `custody_hash` | text | Yes | - | - |
| `minting_status` | text | Yes | - | - |
| `block_number` | text | Yes | - | - |
| `transaction_hash` | text | Yes | - | - |
| `offered_date` | date | Yes | - | - |
| `admitted_date` | date | Yes | - | - |
| `admissibility_ruling` | text | Yes | - | - |
| `exclusion_reason` | text | Yes | - | - |
| `foundation_witnesses` | ARRAY | Yes | - | - |
| `foundation_authorities` | ARRAY | Yes | - | - |
| `objections_raised` | ARRAY | Yes | - | - |
| `objection_responses` | ARRAY | Yes | - | - |
| `submitted_by` | uuid | Yes | FK → people.id | - |
| `submission_date` | date | Yes | - | - |
| `discovery_date` | date | Yes | - | - |
| `production_request` | text | Yes | - | - |
| `content_summary` | text | Yes | - | - |
| `key_facts_extracted` | ARRAY | Yes | - | - |
| `status` | text | Yes | - | - |
| `valid_from` | timestamp with time zone | Yes | - | - |
| `valid_to` | timestamp with time zone | Yes | - | - |
| `version_number` | integer | Yes | - | - |
| `notes` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `authenticated_by` → `people.id` (ON DELETE NO ACTION)
- `case_id` → `cases.id` (ON DELETE CASCADE)
- `submitted_by` → `people.id` (ON DELETE NO ACTION)
- `thing_id` → `things.id` (ON DELETE NO ACTION)

**Indexes:**

- `evidence_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `evidence_pkey` on `{id}` (btree) (UNIQUE)
- `idx_evidence_case` on `{case_id}` (btree)
- `idx_evidence_case_id` on `{case_id}` (btree)
- `idx_evidence_chitty_id` on `{chitty_id}` (btree)
- `idx_evidence_dates` on `{admitted_date,submission_date}` (btree)
- `idx_evidence_evidence_tier` on `{evidence_tier}` (btree)
- `idx_evidence_status` on `{admissibility_ruling,status}` (btree)
- `idx_evidence_temporal` on `{valid_from,valid_to}` (btree)
- `idx_evidence_thing` on `{thing_id}` (btree)
- `idx_evidence_tier_weight` on `{evidence_tier,weight}` (btree)


### financial_transactions

> ChittyLedger: Immutable financial transaction ledger

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.FinancialTransactions = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `transaction_id` | text | No | - | - |
| `user_id` | uuid | Yes | FK → users.id | - |
| `case_id` | uuid | Yes | FK → cases.id | - |
| `transaction_type` | transaction_type | No | - | - |
| `amount` | numeric | No | - | - |
| `currency` | text | No | - | - |
| `status` | transaction_status | No | - | - |
| `payment_method` | text | Yes | - | - |
| `payment_provider_id` | text | Yes | - | - |
| `payment_provider_response` | jsonb | Yes | - | - |
| `description` | text | Yes | - | - |
| `invoice_url` | text | Yes | - | - |
| `receipt_url` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `processed_at` | timestamp with time zone | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `case_id` → `cases.id` (ON DELETE SET NULL)
- `user_id` → `users.id` (ON DELETE RESTRICT)

**Indexes:**

- `financial_transactions_pkey` on `{id}` (btree) (UNIQUE)
- `financial_transactions_transaction_id_key` on `{transaction_id}` (btree) (UNIQUE)
- `idx_financial_transactions_case_id` on `{case_id}` (btree)
- `idx_financial_transactions_created_at` on `{created_at}` (btree)
- `idx_financial_transactions_status` on `{status}` (btree)
- `idx_financial_transactions_transaction_id` on `{transaction_id}` (btree)
- `idx_financial_transactions_user_id` on `{user_id}` (btree)


### invoices

> ChittyLedger: Invoice records for billing

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Invoices = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `invoice_number` | text | No | - | - |
| `user_id` | uuid | No | FK → users.id | - |
| `case_id` | uuid | Yes | FK → cases.id | - |
| `amount` | numeric | No | - | - |
| `currency` | text | No | - | - |
| `status` | text | Yes | - | - |
| `due_date` | date | Yes | - | - |
| `paid_date` | date | Yes | - | - |
| `line_items` | jsonb | No | - | - |
| `notes` | text | Yes | - | - |
| `payment_link` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `case_id` → `cases.id` (ON DELETE SET NULL)
- `user_id` → `users.id` (ON DELETE RESTRICT)

**Indexes:**

- `idx_invoices_due_date` on `{due_date}` (btree)
- `idx_invoices_invoice_number` on `{invoice_number}` (btree)
- `idx_invoices_status` on `{status}` (btree)
- `idx_invoices_user_id` on `{user_id}` (btree)
- `invoices_invoice_number_key` on `{invoice_number}` (btree) (UNIQUE)
- `invoices_pkey` on `{id}` (btree) (UNIQUE)


### subscriptions

> ChittyLedger: Subscription lifecycle tracking

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Subscriptions = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `subscription_id` | text | No | - | - |
| `user_id` | uuid | No | FK → users.id | - |
| `plan_name` | text | No | - | - |
| `plan_price` | numeric | No | - | - |
| `billing_cycle` | text | No | - | - |
| `status` | subscription_status | No | - | - |
| `stripe_subscription_id` | text | Yes | - | - |
| `current_period_start` | date | No | - | - |
| `current_period_end` | date | No | - | - |
| `cancel_at_period_end` | boolean | Yes | - | - |
| `cancelled_at` | timestamp with time zone | Yes | - | - |
| `trial_start` | date | Yes | - | - |
| `trial_end` | date | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `user_id` → `users.id` (ON DELETE RESTRICT)

**Indexes:**

- `idx_subscriptions_status` on `{status}` (btree)
- `idx_subscriptions_subscription_id` on `{subscription_id}` (btree)
- `idx_subscriptions_user_id` on `{user_id}` (btree)
- `subscriptions_pkey` on `{id}` (btree) (UNIQUE)
- `subscriptions_subscription_id_key` on `{subscription_id}` (btree) (UNIQUE)


### users

> ChittyLedger: Legal case participants and system users

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Users = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `email` | text | No | - | - |
| `password_hash` | text | Yes | - | - |
| `two_fa_secret` | text | Yes | - | - |
| `two_fa_enabled` | boolean | Yes | - | - |
| `role` | text | No | - | - |
| `permissions` | ARRAY | Yes | - | - |
| `bar_number` | text | Yes | - | - |
| `license_state` | text | Yes | - | - |
| `license_expiration` | date | Yes | - | - |
| `last_login` | timestamp with time zone | Yes | - | - |
| `login_count` | integer | Yes | - | - |
| `failed_login_attempts` | integer | Yes | - | - |
| `account_locked` | boolean | Yes | - | - |
| `account_locked_until` | timestamp with time zone | Yes | - | - |
| `linked_person_id` | uuid | Yes | FK → people.id | - |
| `trust_score` | numeric | Yes | - | - |
| `verified` | boolean | Yes | - | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `verified_by` | uuid | Yes | - | - |
| `current_session_id` | text | Yes | - | - |
| `session_data` | jsonb | Yes | - | - |
| `preferences` | jsonb | Yes | - | - |
| `status` | text | Yes | - | - |
| `gdpr_deleted` | boolean | Yes | - | - |
| `gdpr_deleted_at` | timestamp with time zone | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `linked_person_id` → `people.id` (ON DELETE NO ACTION)

**Indexes:**

- `idx_users_email` on `{email}` (btree)
- `idx_users_linked_person` on `{linked_person_id}` (btree)
- `idx_users_role` on `{role}` (btree)
- `idx_users_status` on `{status}` (btree)
- `idx_users_verification` on `{verified,verified_at}` (btree)
- `users_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `users_email_key` on `{email}` (btree) (UNIQUE)
- `users_pkey` on `{id}` (btree) (UNIQUE)


## Unknown Tables

### authorities

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Authorities = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `title` | text | No | - | - |
| `citation` | text | Yes | - | - |
| `authority_type` | text | No | - | - |
| `sub_type` | text | Yes | - | - |
| `issuing_authority` | text | No | - | - |
| `jurisdiction_id` | uuid | Yes | FK → places.id | - |
| `court_level` | text | Yes | - | - |
| `effective_date` | date | Yes | - | - |
| `expiration_date` | date | Yes | - | - |
| `decision_date` | date | Yes | - | - |
| `publication_date` | date | Yes | - | - |
| `parent_authority_id` | uuid | Yes | FK → authorities.id | - |
| `hierarchy_level` | integer | Yes | - | - |
| `precedential_value` | text | Yes | - | - |
| `full_text` | text | Yes | - | - |
| `summary` | text | Yes | - | - |
| `key_holdings` | ARRAY | Yes | - | - |
| `cites_authorities` | ARRAY | Yes | - | - |
| `cited_by_authorities` | ARRAY | Yes | - | - |
| `amended_by_authorities` | ARRAY | Yes | - | - |
| `superseded_by_authority` | uuid | Yes | FK → authorities.id | - |
| `status` | text | Yes | - | - |
| `url` | text | Yes | - | - |
| `access_level` | text | Yes | - | - |
| `verification_status` | text | Yes | - | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `verified_by` | uuid | Yes | - | - |
| `valid_from` | timestamp with time zone | Yes | - | - |
| `valid_to` | timestamp with time zone | Yes | - | - |
| `version_number` | integer | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `jurisdiction_id` → `places.id` (ON DELETE NO ACTION)
- `parent_authority_id` → `authorities.id` (ON DELETE NO ACTION)
- `superseded_by_authority` → `authorities.id` (ON DELETE NO ACTION)

**Indexes:**

- `authorities_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `authorities_pkey` on `{id}` (btree) (UNIQUE)
- `idx_authorities_chitty_id` on `{chitty_id}` (btree)
- `idx_authorities_citation` on `{citation}` (btree)
- `idx_authorities_dates` on `{effective_date,expiration_date}` (btree)
- `idx_authorities_hierarchy` on `{parent_authority_id,hierarchy_level}` (btree)
- `idx_authorities_jurisdiction` on `{jurisdiction_id}` (btree)
- `idx_authorities_temporal` on `{valid_from,valid_to}` (btree)
- `idx_authorities_type` on `{authority_type,sub_type}` (btree)


### case_parties

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.CaseParties = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `case_id` | uuid | No | FK → cases.id | - |
| `person_id` | uuid | No | FK → people.id | - |
| `role` | text | No | - | - |
| `party_number` | integer | Yes | - | - |
| `status` | text | Yes | - | - |
| `service_address_id` | uuid | Yes | FK → places.id | - |
| `service_method` | text | Yes | - | - |
| `served_date` | date | Yes | - | - |
| `served_by` | uuid | Yes | FK → people.id | - |
| `counsel_id` | uuid | Yes | FK → people.id | - |
| `pro_se` | boolean | Yes | - | - |
| `added_date` | date | Yes | - | - |
| `removed_date` | date | Yes | - | - |
| `notes` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `case_id` → `cases.id` (ON DELETE CASCADE)
- `counsel_id` → `people.id` (ON DELETE NO ACTION)
- `person_id` → `people.id` (ON DELETE NO ACTION)
- `served_by` → `people.id` (ON DELETE NO ACTION)
- `service_address_id` → `places.id` (ON DELETE NO ACTION)

**Indexes:**

- `case_parties_case_id_person_id_role_key` on `{case_id,person_id,role}` (btree) (UNIQUE)
- `case_parties_pkey` on `{id}` (btree) (UNIQUE)
- `idx_case_parties_case` on `{case_id}` (btree)
- `idx_case_parties_case_id` on `{case_id}` (btree)
- `idx_case_parties_counsel` on `{counsel_id}` (btree)
- `idx_case_parties_person` on `{person_id}` (btree)
- `idx_case_parties_role` on `{role}` (btree)


### entity_relationships

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.EntityRelationships = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `source_entity_type` | text | No | - | - |
| `source_entity_id` | uuid | No | - | - |
| `target_entity_type` | text | No | - | - |
| `target_entity_id` | uuid | No | - | - |
| `relationship_type` | text | No | - | - |
| `relationship_subtype` | text | Yes | - | - |
| `description` | text | Yes | - | - |
| `strength_score` | numeric | Yes | - | - |
| `confidence_score` | numeric | Yes | - | - |
| `supporting_evidence_ids` | ARRAY | Yes | - | - |
| `supporting_fact_ids` | ARRAY | Yes | - | - |
| `contradicting_evidence_ids` | ARRAY | Yes | - | - |
| `discovered_by` | text | Yes | - | - |
| `discovery_method` | text | Yes | - | - |
| `ai_model_version` | text | Yes | - | - |
| `legal_relevance` | text | Yes | - | - |
| `potential_conflicts` | boolean | Yes | - | - |
| `relationship_start_date` | date | Yes | - | - |
| `relationship_end_date` | date | Yes | - | - |
| `valid_from` | timestamp with time zone | Yes | - | - |
| `valid_to` | timestamp with time zone | Yes | - | - |
| `status` | text | Yes | - | - |
| `verified` | boolean | Yes | - | - |
| `verified_by` | uuid | Yes | FK → people.id | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `verified_by` → `people.id` (ON DELETE NO ACTION)

**Indexes:**

- `entity_relationships_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `entity_relationships_pkey` on `{id}` (btree) (UNIQUE)
- `idx_relationships_graph` on `{source_entity_id,target_entity_id,relationship_type}` (btree)
- `idx_relationships_source` on `{source_entity_type,source_entity_id}` (btree)
- `idx_relationships_strength` on `{strength_score,confidence_score}` (btree)
- `idx_relationships_target` on `{target_entity_type,target_entity_id}` (btree)
- `idx_relationships_type` on `{relationship_type,relationship_subtype}` (btree)


### event_store

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.EventStore = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `aggregate_id` | uuid | No | - | - |
| `aggregate_type` | text | No | - | - |
| `event_type` | text | No | - | - |
| `event_data` | jsonb | No | - | - |
| `event_version` | integer | No | - | - |
| `correlation_id` | uuid | Yes | - | - |
| `causation_id` | uuid | Yes | - | - |
| `user_id` | uuid | Yes | - | - |
| `ip_address` | inet | Yes | - | - |
| `user_agent` | text | Yes | - | - |
| `timestamp` | timestamp with time zone | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `event_hash` | text | No | - | - |
| `previous_hash` | text | Yes | - | - |

**Indexes:**

- `event_store_aggregate_id_event_version_key` on `{aggregate_id,event_version}` (btree) (UNIQUE)
- `event_store_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `event_store_pkey` on `{id}` (btree) (UNIQUE)
- `idx_event_store_aggregate` on `{aggregate_id,event_version}` (btree)
- `idx_event_store_correlation` on `{correlation_id}` (btree)
- `idx_event_store_type_time` on `{aggregate_type,event_type,timestamp}` (btree)


### events

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Events = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `name` | text | No | - | - |
| `description` | text | Yes | - | - |
| `event_type` | text | No | - | - |
| `sub_type` | text | Yes | - | - |
| `start_time` | timestamp with time zone | No | - | - |
| `end_time` | timestamp with time zone | Yes | - | - |
| `timezone` | text | Yes | - | - |
| `duration_minutes` | integer | Yes | - | - |
| `primary_person_id` | uuid | Yes | FK → people.id | - |
| `secondary_person_id` | uuid | Yes | FK → people.id | - |
| `witness_ids` | ARRAY | Yes | - | - |
| `location_id` | uuid | Yes | FK → places.id | - |
| `related_thing_ids` | ARRAY | Yes | - | - |
| `parent_event_id` | uuid | Yes | FK → events.id | - |
| `sequence_number` | integer | Yes | - | - |
| `amount` | numeric | Yes | - | - |
| `currency` | text | Yes | - | - |
| `from_account_id` | uuid | Yes | - | - |
| `to_account_id` | uuid | Yes | - | - |
| `legal_significance` | text | Yes | - | - |
| `statutory_deadline` | timestamp with time zone | Yes | - | - |
| `status` | text | Yes | - | - |
| `outcome` | text | Yes | - | - |
| `outcome_details` | jsonb | Yes | - | - |
| `evidence_ids` | ARRAY | Yes | - | - |
| `document_ids` | ARRAY | Yes | - | - |
| `is_confidential` | boolean | Yes | - | - |
| `confidentiality_level` | text | Yes | - | - |
| `verification_status` | text | Yes | - | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `verified_by` | uuid | Yes | - | - |
| `valid_from` | timestamp with time zone | Yes | - | - |
| `valid_to` | timestamp with time zone | Yes | - | - |
| `version_number` | integer | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `location_id` → `places.id` (ON DELETE NO ACTION)
- `parent_event_id` → `events.id` (ON DELETE NO ACTION)
- `primary_person_id` → `people.id` (ON DELETE NO ACTION)
- `secondary_person_id` → `people.id` (ON DELETE NO ACTION)

**Indexes:**

- `events_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `events_pkey` on `{id}` (btree) (UNIQUE)
- `idx_events_chitty_id` on `{chitty_id}` (btree)
- `idx_events_location` on `{location_id}` (btree)
- `idx_events_parent` on `{parent_event_id}` (btree)
- `idx_events_participants` on `{primary_person_id,secondary_person_id}` (btree)
- `idx_events_temporal` on `{valid_from,valid_to}` (btree)
- `idx_events_time` on `{start_time,end_time}` (btree)
- `idx_events_type` on `{event_type,sub_type}` (btree)


### gdpr_data_subjects

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.GdprDataSubjects = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `person_id` | uuid | Yes | FK → people.id | - |
| `external_identifier` | text | Yes | - | - |
| `lawful_basis` | text | No | - | - |
| `lawful_basis_details` | text | Yes | - | - |
| `consent_status` | text | Yes | - | - |
| `consent_date` | timestamp with time zone | Yes | - | - |
| `consent_method` | text | Yes | - | - |
| `consent_evidence` | jsonb | Yes | - | - |
| `right_to_access_requested` | boolean | Yes | - | - |
| `right_to_rectification_requested` | boolean | Yes | - | - |
| `right_to_erasure_requested` | boolean | Yes | - | - |
| `right_to_portability_requested` | boolean | Yes | - | - |
| `right_to_object_requested` | boolean | Yes | - | - |
| `data_categories` | ARRAY | Yes | - | - |
| `processing_purposes` | ARRAY | Yes | - | - |
| `data_retention_period` | interval | Yes | - | - |
| `data_sources` | ARRAY | Yes | - | - |
| `third_party_recipients` | ARRAY | Yes | - | - |
| `international_transfers` | boolean | Yes | - | - |
| `transfer_safeguards` | text | Yes | - | - |
| `erasure_completed` | boolean | Yes | - | - |
| `erasure_completed_at` | timestamp with time zone | Yes | - | - |
| `rectification_completed` | boolean | Yes | - | - |
| `rectification_completed_at` | timestamp with time zone | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | FK → users.id | - |
| `updated_by` | uuid | Yes | FK → users.id | - |

**Foreign Keys:**

- `created_by` → `users.id` (ON DELETE NO ACTION)
- `person_id` → `people.id` (ON DELETE NO ACTION)
- `updated_by` → `users.id` (ON DELETE NO ACTION)

**Indexes:**

- `gdpr_data_subjects_pkey` on `{id}` (btree) (UNIQUE)
- `idx_gdpr_subjects_person` on `{person_id}` (btree)
- `idx_gdpr_subjects_rights` on `{right_to_erasure_requested,erasure_completed}` (btree)


### people

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.People = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `first_name` | text | Yes | - | - |
| `middle_name` | text | Yes | - | - |
| `last_name` | text | Yes | - | - |
| `legal_name` | text | No | - | - |
| `aliases` | ARRAY | Yes | - | - |
| `entity_type` | text | No | - | - |
| `sub_type` | text | Yes | - | - |
| `ssn` | text | Yes | - | - |
| `ein` | text | Yes | - | - |
| `foreign_id` | text | Yes | - | - |
| `date_of_birth` | date | Yes | - | - |
| `date_of_incorporation` | date | Yes | - | - |
| `date_of_dissolution` | date | Yes | - | - |
| `place_of_birth_id` | uuid | Yes | - | - |
| `incorporation_place_id` | uuid | Yes | - | - |
| `primary_address_id` | uuid | Yes | - | - |
| `parent_entity_id` | uuid | Yes | FK → people.id | - |
| `status` | text | Yes | - | - |
| `verification_status` | text | Yes | - | - |
| `verification_method` | text | Yes | - | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `verified_by` | uuid | Yes | - | - |
| `gdpr_lawful_basis` | text | Yes | - | - |
| `gdpr_consent_status` | text | Yes | - | - |
| `gdpr_deleted` | boolean | Yes | - | - |
| `gdpr_deleted_at` | timestamp with time zone | Yes | - | - |
| `retention_period` | interval | Yes | - | - |
| `valid_from` | timestamp with time zone | Yes | - | - |
| `valid_to` | timestamp with time zone | Yes | - | - |
| `version_number` | integer | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `parent_entity_id` → `people.id` (ON DELETE NO ACTION)

**Indexes:**

- `idx_people_chitty_id` on `{chitty_id}` (btree)
- `idx_people_entity_type` on `{entity_type}` (btree)
- `idx_people_legal_name` on `{legal_name}` (btree)
- `idx_people_parent` on `{parent_entity_id}` (btree)
- `idx_people_temporal` on `{valid_from,valid_to}` (btree)
- `idx_people_verification` on `{verification_status,verified_at}` (btree)
- `people_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `people_pkey` on `{id}` (btree) (UNIQUE)


### places

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Places = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `name` | text | No | - | - |
| `place_type` | text | No | - | - |
| `sub_type` | text | Yes | - | - |
| `street_address` | text | Yes | - | - |
| `unit_number` | text | Yes | - | - |
| `city` | text | Yes | - | - |
| `state_province` | text | Yes | - | - |
| `postal_code` | text | Yes | - | - |
| `country` | text | Yes | - | - |
| `coordinates` | point | Yes | - | - |
| `elevation` | numeric | Yes | - | - |
| `timezone` | text | Yes | - | - |
| `parent_place_id` | uuid | Yes | FK → places.id | - |
| `jurisdiction_level` | text | Yes | - | - |
| `jurisdiction_code` | text | Yes | - | - |
| `court_type` | text | Yes | - | - |
| `status` | text | Yes | - | - |
| `verification_status` | text | Yes | - | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `verified_by` | uuid | Yes | - | - |
| `valid_from` | timestamp with time zone | Yes | - | - |
| `valid_to` | timestamp with time zone | Yes | - | - |
| `version_number` | integer | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `parent_place_id` → `places.id` (ON DELETE NO ACTION)

**Indexes:**

- `idx_places_chitty_id` on `{chitty_id}` (btree)
- `idx_places_jurisdiction` on `{jurisdiction_level,jurisdiction_code}` (btree)
- `idx_places_parent` on `{parent_place_id}` (btree)
- `idx_places_temporal` on `{valid_from,valid_to}` (btree)
- `idx_places_type` on `{place_type,sub_type}` (btree)
- `places_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `places_pkey` on `{id}` (btree) (UNIQUE)


### schema_versions

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.SchemaVersions = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `version` | text | No | PK | - |
| `applied_at` | timestamp with time zone | Yes | - | - |
| `migration_script` | text | Yes | - | - |
| `rollback_script` | text | Yes | - | - |
| `description` | text | Yes | - | - |

**Indexes:**

- `schema_versions_pkey` on `{version}` (btree) (UNIQUE)


### things

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.Things = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `name` | text | No | - | - |
| `description` | text | Yes | - | - |
| `thing_type` | text | No | - | - |
| `sub_type` | text | Yes | - | - |
| `serial_number` | text | Yes | - | - |
| `model_number` | text | Yes | - | - |
| `manufacturer` | text | Yes | - | - |
| `year_manufactured` | integer | Yes | - | - |
| `physical_condition` | text | Yes | - | - |
| `current_owner_id` | uuid | Yes | FK → people.id | - |
| `ownership_type` | text | Yes | - | - |
| `ownership_percentage` | numeric | Yes | - | - |
| `current_value` | numeric | Yes | - | - |
| `currency` | text | Yes | - | - |
| `valuation_date` | date | Yes | - | - |
| `valuation_method` | text | Yes | - | - |
| `acquisition_date` | date | Yes | - | - |
| `acquisition_cost` | numeric | Yes | - | - |
| `current_location_id` | uuid | Yes | FK → places.id | - |
| `file_hash` | text | Yes | - | - |
| `file_size` | bigint | Yes | - | - |
| `mime_type` | text | Yes | - | - |
| `media_url` | text | Yes | - | - |
| `account_number` | text | Yes | - | - |
| `routing_number` | text | Yes | - | - |
| `institution_name` | text | Yes | - | - |
| `institution_id` | text | Yes | - | - |
| `chain_of_custody_required` | boolean | Yes | - | - |
| `is_confidential` | boolean | Yes | - | - |
| `confidentiality_level` | text | Yes | - | - |
| `status` | text | Yes | - | - |
| `verification_status` | text | Yes | - | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `verified_by` | uuid | Yes | - | - |
| `valid_from` | timestamp with time zone | Yes | - | - |
| `valid_to` | timestamp with time zone | Yes | - | - |
| `version_number` | integer | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `current_location_id` → `places.id` (ON DELETE NO ACTION)
- `current_owner_id` → `people.id` (ON DELETE NO ACTION)

**Indexes:**

- `idx_things_chitty_id` on `{chitty_id}` (btree)
- `idx_things_confidential` on `{is_confidential,confidentiality_level}` (btree)
- `idx_things_hash` on `{file_hash}` (btree)
- `idx_things_location` on `{current_location_id}` (btree)
- `idx_things_owner` on `{current_owner_id}` (btree)
- `idx_things_temporal` on `{valid_from,valid_to}` (btree)
- `idx_things_type` on `{thing_type,sub_type}` (btree)
- `things_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `things_pkey` on `{id}` (btree) (UNIQUE)


### verification_tasks

**TypeScript Import:**
```typescript
import { chittyledger } from '@chittyos/schema';
const myRecord: chittyledger.VerificationTasks = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `task_type` | text | No | - | - |
| `task_subtype` | text | Yes | - | - |
| `description` | text | Yes | - | - |
| `subject_type` | text | No | - | - |
| `subject_id` | uuid | No | - | - |
| `assigned_to` | uuid | Yes | FK → users.id | - |
| `assigned_by` | uuid | Yes | FK → users.id | - |
| `priority` | text | Yes | - | - |
| `status` | text | Yes | - | - |
| `workflow_stage` | text | Yes | - | - |
| `due_date` | timestamp with time zone | Yes | - | - |
| `started_at` | timestamp with time zone | Yes | - | - |
| `completed_at` | timestamp with time zone | Yes | - | - |
| `estimated_hours` | numeric | Yes | - | - |
| `actual_hours` | numeric | Yes | - | - |
| `verification_method` | text | Yes | - | - |
| `required_authorities` | ARRAY | Yes | - | - |
| `required_evidence` | ARRAY | Yes | - | - |
| `verification_criteria` | jsonb | Yes | - | - |
| `result` | text | Yes | - | - |
| `result_confidence` | numeric | Yes | - | - |
| `result_details` | jsonb | Yes | - | - |
| `findings` | text | Yes | - | - |
| `recommendations` | text | Yes | - | - |
| `reviewed_by` | uuid | Yes | FK → users.id | - |
| `reviewed_at` | timestamp with time zone | Yes | - | - |
| `approved_by` | uuid | Yes | FK → users.id | - |
| `approved_at` | timestamp with time zone | Yes | - | - |
| `follow_up_required` | boolean | Yes | - | - |
| `follow_up_tasks` | ARRAY | Yes | - | - |
| `escalation_reason` | text | Yes | - | - |
| `notes` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |
| `created_by` | uuid | Yes | - | - |
| `updated_by` | uuid | Yes | - | - |

**Foreign Keys:**

- `approved_by` → `users.id` (ON DELETE NO ACTION)
- `assigned_by` → `users.id` (ON DELETE NO ACTION)
- `assigned_to` → `users.id` (ON DELETE NO ACTION)
- `reviewed_by` → `users.id` (ON DELETE NO ACTION)

**Indexes:**

- `idx_verification_tasks_assigned` on `{assigned_to,status}` (btree)
- `idx_verification_tasks_priority` on `{priority,due_date}` (btree)
- `idx_verification_tasks_status` on `{status,workflow_stage}` (btree)
- `idx_verification_tasks_subject` on `{subject_type,subject_id}` (btree)
- `idx_verification_tasks_type` on `{task_type,task_subtype}` (btree)
- `verification_tasks_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `verification_tasks_pkey` on `{id}` (btree) (UNIQUE)


---

*This documentation is automatically generated from the live database schema.*
*Do not edit manually - run `npm run generate:docs` to regenerate.*