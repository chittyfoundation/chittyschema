-- ChittyFinance: Canonical entity codes + alias resolution
-- Managed by chittyschema - DO NOT edit in service repos
-- Created: 2026-09-17
-- Source of Truth: chittyschema/connectivity/migrations/chittyfinance/
--
-- PURPOSE: One canonical short code per Mercury credential grain, and one place
-- to resolve every legacy name the ecosystem still emits.
--
-- WHY THIS EXISTS
--
-- Credential identity for Mercury was carried by three competing string schemes,
-- none of which agreed with the others:
--
--   1. chittycommand KV `mercury:orgs`   — aribia-llc-city-studio, chicago-furnished-condos, ...
--   2. chittyfinance `tenants.slug`      — aribia-city-studio,     aribia-mgmt, ...
--   3. deployed worker secret bindings   — MERCURY_TOKEN_ARIBIA, _CHICAGO_FURNISHED, _IT_CAN_BE
--
-- Only 3 of 7 KV org slugs matched a tenant slug by string equality. Two were the
-- same entity spelled differently; one addressed an entity by a retired DBA; one had
-- no tenant row at all. Joins across those schemes silently produced the empty set,
-- and an empty set reads as success — see chittyagent-finance PR #673, where four of
-- seven businesses never synced and /health reported ok.
--
-- GRAIN (the load-bearing decision)
--
-- A code names a CREDENTIAL, not a legal entity: one Mercury org, one API token, one
-- code. Two distinct Mercury orgs can belong to the same legal entity — FC and CHITTY
-- are both ARIBIA LLC - MGMT (verified against the live Mercury organization record,
-- EIN 99-1959419, whose DBAs are CHICAGO FURNISHED CONDOS and FURNISHED-CONDOS.COM).
-- Collapsing them to one code per entity would collide two live tokens onto one name.
-- tenant_id carries the entity relationship; code carries the credential identity.
--
-- tenant_id is NULLABLE on purpose. A Mercury org can exist with no tenants row
-- (chitty-services had none at authoring time). Forcing NOT NULL here would mean
-- inventing a tenant to satisfy a constraint, and an invented tenant is a place for
-- money to be misattributed to.
--
-- SECRET NAMING (consumers, not enforced here)
--
--   MERCURY_ISSUED_<CODE>_READ_TOKEN
--   MERCURY_ISSUED_<CODE>_WRITE_TOKEN
--
-- per the <ISSUER>_ISSUED_<SERVICE>_TOKEN convention in
-- chittyconnect/docs/governance/MANAGED_CONTEXT.md:276.
--
-- This migration does NOT rename any secret, binding, or KV key. It establishes the
-- authority those renames will be driven from. Renaming a live credential is
-- ChittyConnect's job and requires an operator decision — tenant_id is written once
-- at provisioning and no update path rewrites it, so a wrong rename misattributes
-- money permanently.

-- =============================================================================
-- ENTITY_CODES - Canonical short code per credential grain
-- =============================================================================

CREATE TABLE IF NOT EXISTS entity_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT,                                  -- NOT NULL + UNIQUE + CHECK added in 003, after backfill
    tenant_id UUID REFERENCES tenants(id),      -- NULL = Mercury org with no tenant row yet
    label TEXT NOT NULL,
    mercury_org_id TEXT,                        -- Mercury organizationId, once observed
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS entity_codes_tenant_idx ON entity_codes(tenant_id);
CREATE INDEX IF NOT EXISTS entity_codes_code_idx ON entity_codes(code);

COMMENT ON TABLE entity_codes IS 'ChittyFinance: canonical short code per Mercury credential grain (one org, one token, one code). Single authority for secret names, worker binding names, and KV org slugs. Owned by chittyfinance.';
COMMENT ON COLUMN entity_codes.code IS 'Canonical 2-6 char uppercase code. Constraints deferred to migration 003 so backfill cannot fail closed mid-flight.';
COMMENT ON COLUMN entity_codes.tenant_id IS 'FK to tenants when a tenant row exists. NULL is a valid, tracked state: a Mercury org may have no tenant counterpart. Two codes MAY share a tenant_id (FC and CHITTY are both ARIBIA LLC - MGMT).';
COMMENT ON COLUMN entity_codes.mercury_org_id IS 'Mercury organizationId. Nullable: only observable once a working token for that org exists.';

-- =============================================================================
-- ENTITY_CODE_ALIASES - Resolve every legacy name to a canonical code
-- =============================================================================
--
-- Scoped to alias RESOLUTION, not general DBA history: the question this answers is
-- "some system still emits this string — which code is it?" The FC case is why it
-- exists. The live KV key `chicago-furnished-condos` is named for a DBA that is no
-- longer the default, and code reading that key must keep working while it migrates.

CREATE TABLE IF NOT EXISTS entity_code_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_code_id UUID NOT NULL REFERENCES entity_codes(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    source TEXT NOT NULL,                       -- 'mercury_dba' | 'mercury_org_slug' | 'tenant_slug' | 'kv_org_slug' | 'secret_binding'
    is_default BOOLEAN NOT NULL DEFAULT false,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,          -- NULL = still emitted by some live system
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS entity_code_aliases_alias_idx ON entity_code_aliases(alias);
CREATE INDEX IF NOT EXISTS entity_code_aliases_code_idx ON entity_code_aliases(entity_code_id);

-- At most one current default alias per (code, source).
CREATE UNIQUE INDEX IF NOT EXISTS entity_code_aliases_default_idx
    ON entity_code_aliases(entity_code_id, source)
    WHERE is_default AND valid_to IS NULL;

-- An alias must resolve to exactly one code while it is live, or resolution is
-- ambiguous and the caller silently picks one.
CREATE UNIQUE INDEX IF NOT EXISTS entity_code_aliases_live_alias_idx
    ON entity_code_aliases(alias)
    WHERE valid_to IS NULL;

COMMENT ON TABLE entity_code_aliases IS 'ChittyFinance: maps external and legacy names (Mercury DBAs, Mercury org slugs, retired tenant slugs, KV keys, deployed binding names) to a canonical entity_codes row. Not DBA history — scoped to names the ecosystem still emits.';
COMMENT ON COLUMN entity_code_aliases.valid_to IS 'NULL = some live system still emits this string. Set only once no caller reads it.';
COMMENT ON INDEX entity_code_aliases_live_alias_idx IS 'A live alias resolves to exactly one code. Without this, a duplicated alias resolves ambiguously and misattributes silently.';
