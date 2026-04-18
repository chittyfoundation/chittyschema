# chittyos-core Schema Documentation

**Description:** Primary operational database for ChittyOS ecosystem
**Generated:** 11/9/2025, 5:29:41 PM
**Database:** neondb
**Version:** 1.0.0

## Table of Contents

- **chittyauth**
  - [api_tokens](#api-tokens)
  - [oauth_authorization_codes](#oauth-authorization-codes)
  - [oauth_clients](#oauth-clients)
  - [registrations](#registrations)
- **chittychronicle**
  - [chronicle_events](#chronicle-events)
- **chittydiscovery**
  - [discovered_services](#discovered-services)
  - [discovery_cache_metadata](#discovery-cache-metadata)
  - [service_health_history](#service-health-history)
- **chittyid**
  - [credentials](#credentials)
  - [identities](#identities)
- **chittyreception**
  - [reception_calls](#reception-calls)
  - [reception_messages](#reception-messages)
  - [reception_sessions](#reception-sessions)
- **chittyscore**
  - [trust_networks](#trust-networks)
  - [trust_scores](#trust-scores)
- **chittyverify**
  - [verifications](#verifications)
- **shared**
  - [audit_logs](#audit-logs)
- **unknown**
  - [identity_phones](#identity-phones)
  - [import_audit_log](#import-audit-log)
  - [quarantine_queue](#quarantine-queue)
  - [semantic_documents](#semantic-documents)
  - [service_bindings](#service-bindings)
  - [service_certifications](#service-certifications)
  - [service_registration_events](#service-registration-events)
  - [service_registrations](#service-registrations)
  - [service_validations](#service-validations)
  - [spatial_ref_sys](#spatial-ref-sys)

## PostgreSQL Extensions

- `pgcrypto`
- `plpgsql`
- `postgis`
- `uuid-ossp`
- `vector`

## Chittyauth Tables

### api_tokens

> ChittyAuth: API authentication tokens for service access

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ApiTokens = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | Yes | FK → identities.id | - |
| `token_hash` | text | No | - | - |
| `name` | text | No | - | - |
| `scopes` | ARRAY | Yes | - | - |
| `status` | text | Yes | - | - |
| `last_used_at` | timestamp with time zone | Yes | - | - |
| `expires_at` | timestamp with time zone | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `type` | text | Yes | - | Token type: bearer (JWT) or certificate (mTLS) |
| `certificate_pem` | text | Yes | - | PEM-encoded X.509 certificate for mTLS authentication |
| `certificate_serial` | text | Yes | - | Certificate serial number for revocation checking |
| `certificate_fingerprint` | text | Yes | - | SHA-256 fingerprint of the certificate |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE CASCADE)

**Indexes:**

- `api_tokens_pkey` on `{id}` (btree) (UNIQUE)
- `api_tokens_token_hash_key` on `{token_hash}` (btree) (UNIQUE)
- `idx_api_tokens_certificate_fingerprint` on `{certificate_fingerprint}` (btree)
- `idx_api_tokens_certificate_serial` on `{certificate_serial}` (btree)
- `idx_api_tokens_identity_id` on `{identity_id}` (btree)
- `idx_api_tokens_status` on `{status}` (btree)
- `idx_api_tokens_token_hash` on `{token_hash}` (btree)
- `idx_api_tokens_type` on `{type}` (btree)


### oauth_authorization_codes

> ChittyAuth: Temporary OAuth authorization codes for OAuth flow

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.OauthAuthorizationCodes = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `code` | text | No | - | - |
| `client_id` | text | No | FK → oauth_clients.client_id | - |
| `redirect_uri` | text | No | - | - |
| `scope` | text | No | - | - |
| `identity_did` | text | Yes | - | - |
| `code_challenge` | text | Yes | - | - |
| `expires_at` | timestamp with time zone | No | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `client_id` → `oauth_clients.client_id` (ON DELETE CASCADE)

**Indexes:**

- `idx_oauth_authorization_codes_code` on `{code}` (btree)
- `idx_oauth_authorization_codes_expires_at` on `{expires_at}` (btree)
- `oauth_authorization_codes_code_key` on `{code}` (btree) (UNIQUE)
- `oauth_authorization_codes_pkey` on `{id}` (btree) (UNIQUE)


### oauth_clients

> ChittyAuth: OAuth 2.0 registered client applications

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.OauthClients = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `client_id` | text | No | - | - |
| `client_secret_hash` | text | No | - | - |
| `name` | text | No | - | - |
| `redirect_uris` | jsonb | No | - | - |
| `allowed_scopes` | jsonb | No | - | - |
| `status` | text | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |

**Indexes:**

- `idx_oauth_clients_client_id` on `{client_id}` (btree)
- `idx_oauth_clients_status` on `{status}` (btree)
- `oauth_clients_client_id_key` on `{client_id}` (btree) (UNIQUE)
- `oauth_clients_pkey` on `{id}` (btree) (UNIQUE)


### registrations

> ChittyAuth: User registration records linking ChittyIDs to emails

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.Registrations = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `chitty_id` | text | No | - | - |
| `email` | text | No | - | - |
| `name` | text | No | - | - |
| `registered_at` | integer | No | - | - |
| `verified_at` | integer | Yes | - | - |
| `verification_method` | text | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |

**Indexes:**

- `idx_registrations_chitty_id` on `{chitty_id}` (btree)
- `idx_registrations_email` on `{email}` (btree)
- `idx_registrations_registered_at` on `{registered_at}` (btree)
- `registrations_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `registrations_email_key` on `{email}` (btree) (UNIQUE)
- `registrations_pkey` on `{id}` (btree) (UNIQUE)


## Chittychronicle Tables

### chronicle_events

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ChronicleEvents = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `timestamp` | timestamp with time zone | Yes | - | - |
| `service` | character varying | No | - | - |
| `action` | character varying | No | - | - |
| `user_id` | character varying | Yes | - | - |
| `user_email` | character varying | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `related_events` | ARRAY | Yes | - | - |
| `triggered_by` | character varying | Yes | - | - |
| `integrations` | ARRAY | Yes | - | - |
| `status` | character varying | Yes | - | - |
| `error_message` | text | Yes | - | - |
| `search_vector` | tsvector | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Indexes:**

- `chronicle_events_pkey` on `{id}` (btree) (UNIQUE)
- `idx_chronicle_search` on `{search_vector}` (gin)
- `idx_chronicle_service` on `{timestamp,service}` (btree)
- `idx_chronicle_timestamp` on `{timestamp}` (btree)


## Chittydiscovery Tables

### discovered_services

> ChittyDiscovery: Service discovery records with real-time presence tracking

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.DiscoveredServices = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `service_name` | character varying | No | - | - |
| `service_type` | character varying | No | - | - |
| `chitty_id` | character varying | No | - | Unique ChittyID for the service in DID format (did:chitty:...) |
| `endpoint` | character varying | No | - | - |
| `version` | character varying | Yes | - | - |
| `health_check_url` | character varying | Yes | - | - |
| `metadata` | jsonb | Yes | - | Service metadata including capabilities, region, tags, etc. |
| `last_seen_at` | timestamp with time zone | No | - | Last time the service was seen or announced itself |
| `first_discovered_at` | timestamp with time zone | No | - | - |
| `discovery_method` | character varying | No | - | How the service was discovered: mdns (local), workers (Durable Objects), registry (ChittyRegistry), cache (KV) |
| `status` | character varying | No | - | Current service status: active, inactive, unknown, error |
| `created_at` | timestamp with time zone | No | - | - |
| `updated_at` | timestamp with time zone | No | - | - |

**Indexes:**

- `discovered_services_chitty_id_key` on `{chitty_id}` (btree) (UNIQUE)
- `discovered_services_pkey` on `{id}` (btree) (UNIQUE)
- `idx_discovered_services_chitty_id` on `{chitty_id}` (btree)
- `idx_discovered_services_composite_query` on `{service_type,last_seen_at,status}` (btree)
- `idx_discovered_services_discovery_method` on `{discovery_method}` (btree)
- `idx_discovered_services_last_seen` on `{last_seen_at}` (btree)
- `idx_discovered_services_name` on `{service_name}` (btree)
- `idx_discovered_services_status` on `{status}` (btree)
- `idx_discovered_services_type` on `{service_type}` (btree)


### discovery_cache_metadata

> ChittyDiscovery: Metadata for KV cache synchronization state

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.DiscoveryCacheMetadata = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `cache_key` | character varying | No | - | - |
| `last_synced_at` | timestamp with time zone | No | - | - |
| `sync_source` | character varying | Yes | - | - |
| `record_count` | integer | Yes | - | - |
| `created_at` | timestamp with time zone | No | - | - |
| `updated_at` | timestamp with time zone | No | - | - |

**Indexes:**

- `discovery_cache_metadata_cache_key_key` on `{cache_key}` (btree) (UNIQUE)
- `discovery_cache_metadata_pkey` on `{id}` (btree) (UNIQUE)
- `idx_discovery_cache_key` on `{cache_key}` (btree)
- `idx_discovery_cache_synced` on `{last_synced_at}` (btree)


### service_health_history

> ChittyDiscovery: Historical health check results for discovered services

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ServiceHealthHistory = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `service_id` | uuid | No | FK → discovered_services.id | - |
| `checked_at` | timestamp with time zone | No | - | - |
| `healthy` | boolean | No | - | - |
| `latency_ms` | integer | Yes | - | - |
| `error_message` | text | Yes | - | - |
| `created_at` | timestamp with time zone | No | - | - |

**Foreign Keys:**

- `service_id` → `discovered_services.id` (ON DELETE CASCADE)

**Indexes:**

- `idx_service_health_checked_at` on `{checked_at}` (btree)
- `idx_service_health_service_id` on `{service_id}` (btree)
- `idx_service_health_status` on `{service_id,checked_at}` (btree)
- `service_health_history_pkey` on `{id}` (btree) (UNIQUE)


## Chittyid Tables

### credentials

> ChittyID: Digital credentials issued to identities

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.Credentials = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | No | FK → identities.id | - |
| `type` | text | No | - | - |
| `issuer_did` | text | No | - | - |
| `credential_data` | jsonb | No | - | - |
| `qr_code` | text | Yes | - | - |
| `nfc_data` | text | Yes | - | - |
| `status` | text | Yes | - | - |
| `issued_at` | timestamp with time zone | Yes | - | - |
| `expires_at` | timestamp with time zone | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE CASCADE)

**Indexes:**

- `credentials_pkey` on `{id}` (btree) (UNIQUE)
- `idx_credentials_expires_at` on `{expires_at}` (btree)
- `idx_credentials_identity_id` on `{identity_id}` (btree)
- `idx_credentials_issuer_did` on `{issuer_did}` (btree)
- `idx_credentials_status` on `{status}` (btree)
- `idx_credentials_type` on `{type}` (btree)


### identities

> ChittyID: Core identity records with DID and biometric data

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.Identities = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `did` | text | No | - | - |
| `biometric_hash` | text | No | - | - |
| `public_key` | text | No | - | - |
| `metadata` | jsonb | Yes | - | - |
| `status` | text | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Indexes:**

- `identities_did_key` on `{did}` (btree) (UNIQUE)
- `identities_pkey` on `{id}` (btree) (UNIQUE)
- `idx_identities_created_at` on `{created_at}` (btree)
- `idx_identities_did` on `{did}` (btree)
- `idx_identities_status` on `{status}` (btree)


## Chittyreception Tables

### reception_calls

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ReceptionCalls = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | No | FK → identities.id | - |
| `call_id` | character varying | No | - | - |
| `direction` | character varying | No | - | - |
| `from_number` | character varying | No | - | - |
| `to_number` | character varying | No | - | - |
| `status` | character varying | No | - | - |
| `duration_seconds` | integer | Yes | - | - |
| `recording_url` | text | Yes | - | - |
| `transcription` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `started_at` | timestamp with time zone | Yes | - | - |
| `answered_at` | timestamp with time zone | Yes | - | - |
| `ended_at` | timestamp with time zone | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE CASCADE)

**Indexes:**

- `idx_reception_calls_call_id` on `{call_id}` (btree)
- `idx_reception_calls_from_number` on `{from_number}` (btree)
- `idx_reception_calls_identity_id` on `{identity_id}` (btree)
- `idx_reception_calls_started_at` on `{started_at}` (btree)
- `idx_reception_calls_status` on `{status}` (btree)
- `idx_reception_calls_to_number` on `{to_number}` (btree)
- `reception_calls_call_id_key` on `{call_id}` (btree) (UNIQUE)
- `reception_calls_pkey` on `{id}` (btree) (UNIQUE)


### reception_messages

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ReceptionMessages = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | No | FK → identities.id | - |
| `message_id` | character varying | No | - | - |
| `direction` | character varying | No | - | - |
| `from_number` | character varying | No | - | - |
| `to_number` | character varying | No | - | - |
| `body` | text | No | - | - |
| `status` | character varying | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE CASCADE)

**Indexes:**

- `idx_reception_messages_created_at` on `{created_at}` (btree)
- `idx_reception_messages_from_number` on `{from_number}` (btree)
- `idx_reception_messages_identity_id` on `{identity_id}` (btree)
- `idx_reception_messages_message_id` on `{message_id}` (btree)
- `idx_reception_messages_to_number` on `{to_number}` (btree)
- `reception_messages_message_id_key` on `{message_id}` (btree) (UNIQUE)
- `reception_messages_pkey` on `{id}` (btree) (UNIQUE)


### reception_sessions

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ReceptionSessions = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | No | FK → identities.id | - |
| `phone_number` | character varying | No | - | - |
| `status` | character varying | Yes | - | - |
| `context` | jsonb | Yes | - | - |
| `ai_summary` | text | Yes | - | - |
| `last_interaction_at` | timestamp with time zone | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE CASCADE)

**Indexes:**

- `idx_reception_sessions_identity_id` on `{identity_id}` (btree)
- `idx_reception_sessions_last_interaction` on `{last_interaction_at}` (btree)
- `idx_reception_sessions_phone_number` on `{phone_number}` (btree)
- `idx_reception_sessions_status` on `{status}` (btree)
- `reception_sessions_pkey` on `{id}` (btree) (UNIQUE)


## Chittyscore Tables

### trust_networks

> ChittyTrust: Graph of trust relationships between identities

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.TrustNetworks = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_a` | uuid | No | FK → identities.id | - |
| `identity_b` | uuid | No | FK → identities.id | - |
| `trust_score` | integer | No | - | - |
| `relationship` | text | No | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_a` → `identities.id` (ON DELETE CASCADE)
- `identity_b` → `identities.id` (ON DELETE CASCADE)

**Indexes:**

- `idx_trust_networks_identity_a` on `{identity_a}` (btree)
- `idx_trust_networks_identity_b` on `{identity_b}` (btree)
- `idx_trust_networks_trust_score` on `{trust_score}` (btree)
- `trust_networks_pkey` on `{id}` (btree) (UNIQUE)
- `unique_trust_relationship` on `{identity_a,identity_b}` (btree) (UNIQUE)


### trust_scores

> ChittyTrust: Historical trust score calculations

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.TrustScores = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | No | FK → identities.id | - |
| `base_score` | integer | No | - | - |
| `history_score` | integer | No | - | - |
| `network_score` | integer | No | - | - |
| `risk_penalty` | integer | No | - | - |
| `final_score` | integer | No | - | - |
| `calculation_details` | jsonb | Yes | - | - |
| `calculated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE CASCADE)

**Indexes:**

- `idx_trust_scores_calculated_at` on `{calculated_at}` (btree)
- `idx_trust_scores_final_score` on `{final_score}` (btree)
- `idx_trust_scores_identity_id` on `{identity_id}` (btree)
- `trust_scores_pkey` on `{id}` (btree) (UNIQUE)


## Chittyverify Tables

### verifications

> ChittyVerify: Historical record of all verification attempts

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.Verifications = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | No | FK → identities.id | - |
| `credential_id` | uuid | Yes | FK → credentials.id | - |
| `methods` | ARRAY | No | - | - |
| `result` | boolean | No | - | - |
| `trust_score` | integer | No | - | - |
| `confidence` | numeric | Yes | - | - |
| `risk_factors` | jsonb | Yes | - | - |
| `location` | geography | Yes | - | - |
| `ip_address` | inet | Yes | - | - |
| `user_agent` | text | Yes | - | - |
| `verified_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE CASCADE)
- `credential_id` → `credentials.id` (ON DELETE SET NULL)

**Indexes:**

- `idx_verifications_credential_id` on `{credential_id}` (btree)
- `idx_verifications_identity_id` on `{identity_id}` (btree)
- `idx_verifications_location` on `{location}` (gist)
- `idx_verifications_result` on `{result}` (btree)
- `idx_verifications_verified_at` on `{verified_at}` (btree)
- `verifications_pkey` on `{id}` (btree) (UNIQUE)


## Shared Tables

### audit_logs

> Shared: Audit trail for all ChittyOS operations

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.AuditLogs = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | Yes | FK → identities.id | - |
| `action` | text | No | - | - |
| `resource_type` | text | No | - | - |
| `resource_id` | uuid | Yes | - | - |
| `details` | jsonb | Yes | - | - |
| `ip_address` | inet | Yes | - | - |
| `user_agent` | text | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE SET NULL)

**Indexes:**

- `audit_logs_pkey` on `{id}` (btree) (UNIQUE)
- `idx_audit_logs_action` on `{action}` (btree)
- `idx_audit_logs_created_at` on `{created_at}` (btree)
- `idx_audit_logs_identity_id` on `{identity_id}` (btree)
- `idx_audit_logs_resource_type` on `{resource_type}` (btree)


## Unknown Tables

### identity_phones

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.IdentityPhones = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `identity_id` | uuid | No | FK → identities.id | - |
| `phone_number` | character varying | No | - | - |
| `verified` | boolean | Yes | - | - |
| `verified_at` | timestamp with time zone | Yes | - | - |
| `primary_phone` | boolean | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Foreign Keys:**

- `identity_id` → `identities.id` (ON DELETE CASCADE)

**Indexes:**

- `identity_phones_identity_id_phone_number_key` on `{identity_id,phone_number}` (btree) (UNIQUE)
- `identity_phones_pkey` on `{id}` (btree) (UNIQUE)
- `idx_identity_phones_identity_id` on `{identity_id}` (btree)
- `idx_identity_phones_phone_number` on `{phone_number}` (btree)
- `idx_identity_phones_verified` on `{verified}` (btree)


### import_audit_log

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ImportAuditLog = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `file_id` | character varying | No | - | - |
| `filename` | character varying | Yes | - | - |
| `stage` | character varying | No | - | - |
| `status` | character varying | No | - | - |
| `details` | jsonb | Yes | - | - |
| `error_message` | text | Yes | - | - |
| `imported_to` | ARRAY | Yes | - | - |
| `chronicle_event_id` | uuid | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |

**Indexes:**

- `idx_audit_file` on `{file_id,created_at}` (btree)
- `import_audit_log_pkey` on `{id}` (btree) (UNIQUE)


### quarantine_queue

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.QuarantineQueue = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `source` | character varying | No | - | - |
| `source_file_id` | character varying | No | - | - |
| `source_path` | text | Yes | - | - |
| `filename` | character varying | No | - | - |
| `filesize` | bigint | Yes | - | - |
| `mime_type` | character varying | Yes | - | - |
| `content` | text | Yes | - | - |
| `quality_result` | jsonb | No | - | - |
| `confidence` | numeric | Yes | - | - |
| `issues` | jsonb | Yes | - | - |
| `status` | character varying | Yes | - | - |
| `reviewed_by` | character varying | Yes | - | - |
| `reviewed_at` | timestamp with time zone | Yes | - | - |
| `reviewer_notes` | text | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Indexes:**

- `idx_quarantine_status` on `{status,created_at}` (btree)
- `quarantine_queue_pkey` on `{id}` (btree) (UNIQUE)


### semantic_documents

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.SemanticDocuments = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `id` | uuid | No | PK | - |
| `doc_source` | character varying | No | - | - |
| `external_id` | character varying | Yes | - | - |
| `title` | text | Yes | - | - |
| `body` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `embedding` | vector | Yes | - | - |
| `search_vector` | tsvector | Yes | - | - |
| `created_at` | timestamp with time zone | Yes | - | - |
| `updated_at` | timestamp with time zone | Yes | - | - |

**Indexes:**

- `idx_semantic_search` on `{search_vector}` (gin)
- `semantic_documents_doc_source_external_id_key` on `{doc_source,external_id}` (btree) (UNIQUE)
- `semantic_documents_pkey` on `{id}` (btree) (UNIQUE)


### service_bindings

> ChittyRegister - Bindings to Chronicle, Registry, and Discovery services for ecosystem integration.

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ServiceBindings = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `chitty_id` | character varying | No | PK | - |
| `registration_chitty_id` | character varying | No | FK → service_registrations.chitty_id | - |
| `binding_type` | character varying | No | - | Ecosystem service type: "chronicle" (audit), "registry" (directory), "discovery" (service mesh). |
| `binding_chitty_id` | character varying | Yes | - | - |
| `url` | text | Yes | - | - |
| `status` | character varying | No | - | - |
| `bound_at` | timestamp with time zone | Yes | - | - |
| `error_message` | text | Yes | - | - |
| `retry_count` | integer | Yes | - | - |
| `last_retry_at` | timestamp with time zone | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | No | - | - |
| `updated_at` | timestamp with time zone | No | - | - |

**Foreign Keys:**

- `registration_chitty_id` → `service_registrations.chitty_id` (ON DELETE CASCADE)

**Indexes:**

- `idx_binding_retry` on `{status,retry_count,last_retry_at}` (btree)
- `idx_bindings_registration` on `{registration_chitty_id}` (btree)
- `idx_bindings_type_status` on `{binding_type,status}` (btree)
- `service_bindings_pkey` on `{chitty_id}` (btree) (UNIQUE)
- `unique_service_binding` on `{registration_chitty_id,binding_type}` (btree) (UNIQUE)


### service_certifications

> ChittyRegister - Compliance certificates issued to registered services via ChittyCert.

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ServiceCertifications = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `chitty_id` | character varying | No | PK | - |
| `registration_chitty_id` | character varying | No | FK → service_registrations.chitty_id | - |
| `certificate_id` | character varying | No | - | - |
| `chitty_cert_id` | character varying | Yes | - | - |
| `issued_at` | timestamp with time zone | No | - | - |
| `expires_at` | timestamp with time zone | No | - | - |
| `issuer` | character varying | No | - | - |
| `certificate_type` | character varying | No | - | - |
| `signature` | text | No | - | Cryptographic signature from ChittyCert (delegated CA from ChittyTrust root). |
| `status` | character varying | No | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | No | - | - |

**Foreign Keys:**

- `registration_chitty_id` → `service_registrations.chitty_id` (ON DELETE CASCADE)

**Indexes:**

- `idx_cert_status_expires` on `{expires_at,status}` (btree)
- `idx_certifications_expires_at` on `{expires_at}` (btree)
- `idx_certifications_registration` on `{registration_chitty_id}` (btree)
- `idx_certifications_status` on `{status}` (btree)
- `service_certifications_certificate_id_key` on `{certificate_id}` (btree) (UNIQUE)
- `service_certifications_pkey` on `{chitty_id}` (btree) (UNIQUE)


### service_registration_events

> ChittyRegister - State transition events for service registration lifecycle tracking.

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ServiceRegistrationEvents = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `chitty_id` | character varying | No | PK | - |
| `registration_chitty_id` | character varying | No | FK → service_registrations.chitty_id | - |
| `event_type` | character varying | No | - | Lifecycle event: submitted, validated, certified, published, bound_*, revoked, suspended, reactivated, deleted. |
| `previous_status` | character varying | Yes | - | - |
| `new_status` | character varying | No | - | - |
| `actor_chitty_id` | character varying | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | No | - | - |

**Foreign Keys:**

- `registration_chitty_id` → `service_registrations.chitty_id` (ON DELETE CASCADE)

**Indexes:**

- `idx_events_actor` on `{actor_chitty_id}` (btree)
- `idx_events_created` on `{created_at}` (btree)
- `idx_events_registration` on `{registration_chitty_id}` (btree)
- `idx_events_type` on `{event_type}` (btree)
- `service_registration_events_pkey` on `{chitty_id}` (btree) (UNIQUE)


### service_registrations

> ChittyRegister - Service registrations in ChittyOS ecosystem. Owned by ChittyRegister service.

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ServiceRegistrations = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `chitty_id` | character varying | No | PK, FK → identities.did | ChittyID in format VV-G-LLL-SSSS-T-YM-C-X. Generated by ChittyID service for entity type SERVICE. |
| `service_name` | character varying | No | - | - |
| `description` | text | No | - | - |
| `version` | character varying | No | - | - |
| `endpoints` | jsonb | No | - | Array of endpoint paths. Schema: ["/health", "/api/v1/status", ...]. Must include /health and /api/v1/status. |
| `schema` | jsonb | No | - | Service schema definition. Schema: {"version": "1.0", "entities": ["PERSON", "TOOL"], "compliance": {...}}. |
| `security` | jsonb | No | - | Security configuration. Schema: {"authentication": "jwt|oauth2|apikey", "encryption": "tls|https", "scope": [...]}. |
| `status` | character varying | No | - | - |
| `registered_at` | timestamp with time zone | No | - | - |
| `revoked_at` | timestamp with time zone | Yes | - | - |
| `revocation_reason` | text | Yes | - | - |
| `deleted_at` | timestamp with time zone | Yes | - | - |
| `deletion_reason` | text | Yes | - | - |
| `metadata` | jsonb | Yes | - | - |
| `created_at` | timestamp with time zone | No | - | - |
| `updated_at` | timestamp with time zone | No | - | - |

**Foreign Keys:**

- `chitty_id` → `identities.did` (ON DELETE RESTRICT)

**Indexes:**

- `idx_active_services` on `{service_name}` (btree)
- `idx_service_endpoints_gin` on `{endpoints}` (gin)
- `idx_service_metadata_gin` on `{metadata}` (gin)
- `idx_service_registrations_registered_at` on `{registered_at}` (btree)
- `idx_service_registrations_service_name` on `{service_name}` (btree)
- `idx_service_registrations_status` on `{status}` (btree)
- `idx_service_schema_gin` on `{schema}` (gin)
- `idx_service_security_gin` on `{security}` (gin)
- `service_registrations_pkey` on `{chitty_id}` (btree) (UNIQUE)
- `service_registrations_service_name_key` on `{service_name}` (btree) (UNIQUE)


### service_validations

> ChittyRegister - Validation history for service registration compliance checks.

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.ServiceValidations = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `chitty_id` | character varying | No | PK | - |
| `registration_chitty_id` | character varying | Yes | FK → service_registrations.chitty_id | - |
| `service_name` | character varying | No | - | - |
| `validation_result` | jsonb | No | - | Full validation output. Schema: {"errors": [...], "warnings": [...], "requirements_met": [...], "requirements_failed": [...]}. |
| `passed` | boolean | No | - | - |
| `requirements_version` | character varying | No | - | - |
| `validated_at` | timestamp with time zone | No | - | - |

**Foreign Keys:**

- `registration_chitty_id` → `service_registrations.chitty_id` (ON DELETE SET NULL)

**Indexes:**

- `idx_validations_passed` on `{passed}` (btree)
- `idx_validations_registration` on `{registration_chitty_id}` (btree)
- `idx_validations_service_name` on `{service_name}` (btree)
- `idx_validations_validated_at` on `{validated_at}` (btree)
- `service_validations_pkey` on `{chitty_id}` (btree) (UNIQUE)


### spatial_ref_sys

**TypeScript Import:**
```typescript
import { chittyos_core } from '@chittyos/schema';
const myRecord: chittyos_core.SpatialRefSys = { ... };
```

**Columns:**

| Column | Type | Nullable | Constraints | Description |
|--------|------|----------|-------------|-------------|
| `srid` | integer | No | PK | - |
| `auth_name` | character varying | Yes | - | - |
| `auth_srid` | integer | Yes | - | - |
| `srtext` | character varying | Yes | - | - |
| `proj4text` | character varying | Yes | - | - |

**Indexes:**

- `spatial_ref_sys_pkey` on `{srid}` (btree) (UNIQUE)


## Views

### active_credentials_with_trust

```sql
 SELECT c.id,
    c.identity_id,
    c.type,
    c.issuer_did,
    c.credential_data,
    c.qr_code,
    c.nfc_data,
    c.status,
    c.issued_at,
    c.expires_at,
    c.created_at,
    i.did,
    get_current_trust_score(i.id) AS current_trust_score,
    i.status AS identity_status
   FROM (credentials c
     JOIN identities i ON ((c.identity_id = i.id)))
  WHERE ((c.status = 'active'::text) AND (i.status = 'active'::text) AND ((c.expires_at IS NULL) OR (c.expires_at > now())));
```

### active_tokens_with_identity

```sql
 SELECT t.id,
    t.identity_id,
    t.name,
    t.scopes,
    t.type,
    t.status,
    t.certificate_serial,
    t.expires_at,
    t.last_used_at,
    t.created_at,
    i.did,
    i.status AS identity_status
   FROM (api_tokens t
     LEFT JOIN identities i ON ((t.identity_id = i.id)))
  WHERE ((t.status = 'active'::text) AND ((t.expires_at IS NULL) OR (t.expires_at > now())));
```

### geography_columns

```sql
 SELECT current_database() AS f_table_catalog,
    n.nspname AS f_table_schema,
    c.relname AS f_table_name,
    a.attname AS f_geography_column,
    postgis_typmod_dims(a.atttypmod) AS coord_dimension,
    postgis_typmod_srid(a.atttypmod) AS srid,
    postgis_typmod_type(a.atttypmod) AS type
   FROM pg_class c,
    pg_attribute a,
    pg_type t,
    pg_namespace n
  WHERE ((t.typname = 'geography'::name) AND (a.attisdropped = false) AND (a.atttypid = t.oid) AND (a.attrelid = c.oid) AND (c.relnamespace = n.oid) AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND (NOT pg_is_other_temp_schema(c.relnamespace)) AND has_table_privilege(c.oid, 'SELECT'::text));
```

### geometry_columns

```sql
 SELECT (current_database())::character varying(256) AS f_table_catalog,
    n.nspname AS f_table_schema,
    c.relname AS f_table_name,
    a.attname AS f_geometry_column,
    COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension,
    COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid,
    (replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text))::character varying(30) AS type
   FROM ((((((pg_class c
     JOIN pg_attribute a ON (((a.attrelid = c.oid) AND (NOT a.attisdropped))))
     JOIN pg_namespace n ON ((c.relnamespace = n.oid)))
     JOIN pg_type t ON ((a.atttypid = t.oid)))
     LEFT JOIN ( SELECT s.connamespace,
            s.conrelid,
            s.conkey,
            replace(split_part(s.consrc, ''''::text, 2), ')'::text, ''::text) AS type
           FROM ( SELECT pg_constraint.connamespace,
                    pg_constraint.conrelid,
                    pg_constraint.conkey,
                    pg_get_constraintdef(pg_constraint.oid) AS consrc
                   FROM pg_constraint) s
          WHERE (s.consrc ~~* '%geometrytype(% = %'::text)) st ON (((st.connamespace = n.oid) AND (st.conrelid = c.oid) AND (a.attnum = ANY (st.conkey)))))
     LEFT JOIN ( SELECT s.connamespace,
            s.conrelid,
            s.conkey,
            (replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text))::integer AS ndims
           FROM ( SELECT pg_constraint.connamespace,
                    pg_constraint.conrelid,
                    pg_constraint.conkey,
                    pg_get_constraintdef(pg_constraint.oid) AS consrc
                   FROM pg_constraint) s
          WHERE (s.consrc ~~* '%ndims(% = %'::text)) sn ON (((sn.connamespace = n.oid) AND (sn.conrelid = c.oid) AND (a.attnum = ANY (sn.conkey)))))
     LEFT JOIN ( SELECT s.connamespace,
            s.conrelid,
            s.conkey,
            (replace(replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text), '('::text, ''::text))::integer AS srid
           FROM ( SELECT pg_constraint.connamespace,
                    pg_constraint.conrelid,
                    pg_constraint.conkey,
                    pg_get_constraintdef(pg_constraint.oid) AS consrc
                   FROM pg_constraint) s
          WHERE (s.consrc ~~* '%srid(% = %'::text)) sr ON (((sr.connamespace = n.oid) AND (sr.conrelid = c.oid) AND (a.attnum = ANY (sr.conkey)))))
  WHERE ((c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND (NOT (c.relname = 'raster_columns'::name)) AND (t.typname = 'geometry'::name) AND (NOT pg_is_other_temp_schema(c.relnamespace)) AND has_table_privilege(c.oid, 'SELECT'::text));
```

### reception_call_history

```sql
 SELECT c.id,
    c.call_id,
    c.direction,
    c.from_number,
    c.to_number,
    c.status,
    c.duration_seconds,
    c.started_at,
    c.ended_at,
    i.did AS identity_did,
    i.metadata AS identity_metadata
   FROM (reception_calls c
     JOIN identities i ON ((c.identity_id = i.id)))
  ORDER BY c.started_at DESC;
```

### reception_message_history

```sql
 SELECT m.id,
    m.message_id,
    m.direction,
    m.from_number,
    m.to_number,
    m.body,
    m.status,
    m.created_at,
    i.did AS identity_did,
    i.metadata AS identity_metadata
   FROM (reception_messages m
     JOIN identities i ON ((m.identity_id = i.id)))
  ORDER BY m.created_at DESC;
```

### verification_stats

```sql
 SELECT identity_id,
    count(*) AS total_verifications,
    count(*) FILTER (WHERE (result = true)) AS successful_verifications,
    count(*) FILTER (WHERE (result = false)) AS failed_verifications,
    round(avg(trust_score)) AS avg_trust_score,
    max(verified_at) AS last_verification_at
   FROM verifications
  GROUP BY identity_id;
```

---

*This documentation is automatically generated from the live database schema.*
*Do not edit manually - run `npm run generate:docs` to regenerate.*