-- ChittyFinance: Seed the 7 canonical entity codes + their live aliases
-- Managed by chittyschema - DO NOT edit in service repos
-- Created: 2026-09-17
--
-- Every value below was read from a live system on 2026-09-17, not from a doc:
--   - tenants:        GET agent.chitty.cc/finance/entities (7 rows)
--   - Mercury orgs:   chittycommand KV `mercury:orgs` (7 entries, COMMAND_KV)
--   - Mercury org id: Mercury API getOrganization — EIN 99-1959419,
--                     legalBusinessName "ARIBIA LLC - MGMT",
--                     DBAs: "CHICAGO FURNISHED CONDOS" (dbaIsDefault false),
--                           "FURNISHED-CONDOS.COM"     (dbaIsDefault true)
--   - deployed bindings: chittyagent-finance settings — MERCURY_TOKEN_ARIBIA,
--                     MERCURY_TOKEN_CHICAGO_FURNISHED, MERCURY_TOKEN_IT_CAN_BE
--   - stored secrets: ChittySecrets default_secrets_store — the 7 long MERCURY_TOKEN_*
--                     names and their 7 MERCURY_WRITE_TOKEN_* counterparts
--
-- FC and CHITTY intentionally share tenant aribia-mgmt: two Mercury orgs, two tokens,
-- one legal entity. This mirrors ORG_LABEL_TO_TENANT_SLUG in chittyagent-finance,
-- which already routes both to aribia-mgmt.

-- ALL OR NOTHING. Without this wrapper psql autocommits each statement, so a
-- drifted tenant slug leaves half-seeded rows behind: the codes commit with
-- tenant_id NULL, the guard aborts before the aliases, and every later re-run
-- fails identically because the INSERT's NOT EXISTS clause now skips the very
-- rows that need repairing. Verified against a real PostgreSQL 16 instance.
BEGIN;

-- =============================================================================
-- CODES
-- =============================================================================
-- tenant_id resolved by slug rather than hardcoded UUID: the UUIDs are environment
-- specific, and a hardcoded one that misses silently seeds a NULL tenant.

INSERT INTO entity_codes (code, tenant_id, label, mercury_org_id)
SELECT v.code, t.id, v.label, v.mercury_org_id
FROM (VALUES
    ('ARB',    'aribia-llc',           'ARIBIA LLC',                                  NULL),
    ('CITY',   'aribia-city-studio',   'ARIBIA LLC - CITY STUDIO',                    NULL),
    ('APT',    'aribia-apt-arlene',    'ARIBIA LLC - APT ARLENE',                     NULL),
    ('FC',     'aribia-mgmt',          'ARIBIA LLC - MGMT (dba FURNISHED-CONDOS.COM)', 'e15f4a46-e328-11ee-9e22-5f2c16c0b48b'),
    ('CHITTY', 'aribia-mgmt',          'ARIBIA LLC - MGMT (Chitty Services)',         NULL),
    ('JAVL',   'jean-arlene-venturing','JEAN ARLENE VENTURING LLC',                   NULL),
    ('ICBL',   'it-can-be-llc',        'IT CAN BE LLC',                               NULL)
) AS v(code, tenant_slug, label, mercury_org_id)
LEFT JOIN tenants t ON t.slug = v.tenant_slug
WHERE NOT EXISTS (SELECT 1 FROM entity_codes ec WHERE ec.code = v.code);

-- Repair any row whose tenant_id is still NULL because the slug was drifted or the
-- tenant did not exist when this first ran. Without this the seed is not re-runnable:
-- the INSERT above skips codes that already exist, so a NULL tenant_id would never
-- heal on its own.
UPDATE entity_codes ec
SET tenant_id = t.id, updated_at = CURRENT_TIMESTAMP
FROM (VALUES
    ('ARB','aribia-llc'), ('CITY','aribia-city-studio'), ('APT','aribia-apt-arlene'),
    ('FC','aribia-mgmt'), ('CHITTY','aribia-mgmt'),
    ('JAVL','jean-arlene-venturing'), ('ICBL','it-can-be-llc')
) AS v(code, tenant_slug)
JOIN tenants t ON t.slug = v.tenant_slug
WHERE ec.code = v.code AND ec.tenant_id IS NULL;

-- Fail closed: every code above names a tenant that must already exist. A NULL here
-- means the tenant slug drifted, and silently seeding NULL would detach a credential
-- from its books.
DO $$
DECLARE orphan TEXT;
BEGIN
    SELECT string_agg(code, ', ') INTO orphan
    FROM entity_codes
    WHERE tenant_id IS NULL AND code IN ('ARB','CITY','APT','FC','CHITTY','JAVL','ICBL');

    IF orphan IS NOT NULL THEN
        RAISE EXCEPTION 'entity_codes seed: no tenants row matched for code(s): %. Verify tenants.slug before re-running.', orphan;
    END IF;
END $$;

-- =============================================================================
-- ALIASES
-- =============================================================================
-- One row per DISTINCT live string. Where a string is emitted by more than one system
-- (e.g. 'it-can-be-llc' is both the KV org slug and the tenant slug), it is recorded
-- once — entity_code_aliases_live_alias_idx enforces that a live alias resolves to
-- exactly one code.

INSERT INTO entity_code_aliases (entity_code_id, alias, source, is_default, valid_to)
SELECT ec.id, v.alias, v.source, v.is_default, v.valid_to
FROM (VALUES
    -- Mercury org slugs as chittycommand KV `mercury:orgs` spells them
    ('ARB',    'aribia-llc',                            'kv_org_slug',    true,  NULL::timestamptz),
    ('CITY',   'aribia-llc-city-studio',                'kv_org_slug',    true,  NULL),
    ('APT',    'aribia-llc-apt-arlene',                 'kv_org_slug',    true,  NULL),
    ('FC',     'chicago-furnished-condos',              'kv_org_slug',    true,  NULL),
    ('CHITTY', 'chitty-services',                       'kv_org_slug',    true,  NULL),
    ('JAVL',   'jean-arlene-venturing',                 'kv_org_slug',    true,  NULL),
    ('ICBL',   'it-can-be-llc',                         'kv_org_slug',    true,  NULL),

    -- tenants.slug, where it differs from the KV spelling
    ('CITY',   'aribia-city-studio',                    'tenant_slug',    true,  NULL),
    ('APT',    'aribia-apt-arlene',                     'tenant_slug',    true,  NULL),
    ('FC',     'aribia-mgmt',                           'tenant_slug',    true,  NULL),

    -- Mercury DBAs. CHICAGO FURNISHED CONDOS is retired as the default but still
    -- attached to the org, and still named in a live KV key, so it is not valid_to'd.
    ('FC',     'FURNISHED-CONDOS.COM',                  'mercury_dba',    true,  NULL),
    ('FC',     'CHICAGO FURNISHED CONDOS',              'mercury_dba',    false, NULL),

    -- Secret names currently in ChittySecrets (read tokens)
    ('ARB',    'MERCURY_TOKEN_ARIBIA_LLC',              'secret_binding', true,  NULL),
    ('CITY',   'MERCURY_TOKEN_ARIBIA_LLC_CITY_STUDIO',  'secret_binding', true,  NULL),
    ('APT',    'MERCURY_TOKEN_ARIBIA_LLC_APT_ARLENE',   'secret_binding', true,  NULL),
    ('FC',     'MERCURY_TOKEN_CHICAGO_FURNISHED_CONDOS','secret_binding', true,  NULL),
    ('CHITTY', 'MERCURY_TOKEN_CHITTY_SERVICES',         'secret_binding', true,  NULL),
    ('JAVL',   'MERCURY_TOKEN_JEAN_ARLENE_VENTURING',   'secret_binding', true,  NULL),
    ('ICBL',   'MERCURY_TOKEN_IT_CAN_BE_LLC',           'secret_binding', true,  NULL),

    -- Ad-hoc binding names deployed on chittyagent-finance. Not canonical, but live:
    -- two of the three were returning Mercury 401 at authoring time.
    ('ARB',    'MERCURY_TOKEN_ARIBIA',                  'deployed_binding', false, NULL),
    ('FC',     'MERCURY_TOKEN_CHICAGO_FURNISHED',       'deployed_binding', false, NULL),
    ('ICBL',   'MERCURY_TOKEN_IT_CAN_BE',               'deployed_binding', false, NULL)
) AS v(code, alias, source, is_default, valid_to)
JOIN entity_codes ec ON ec.code = v.code
WHERE NOT EXISTS (
    SELECT 1 FROM entity_code_aliases a WHERE a.alias = v.alias AND a.valid_to IS NULL
);

-- =============================================================================
-- CONSTRAINTS - applied only now that every row is seeded and verified
-- =============================================================================

ALTER TABLE entity_codes ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_codes_code_format') THEN
        ALTER TABLE entity_codes ADD CONSTRAINT entity_codes_code_format CHECK (code ~ '^[A-Z0-9]{2,6}$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_codes_code_unique') THEN
        ALTER TABLE entity_codes ADD CONSTRAINT entity_codes_code_unique UNIQUE (code);
    END IF;
END $$;

-- Cardinality assertion. An empty or short seed reads as success otherwise — the exact
-- failure this whole registry exists to prevent.
DO $$
DECLARE n_codes INT; n_aliases INT;
BEGIN
    SELECT count(*) INTO n_codes FROM entity_codes WHERE is_active;
    SELECT count(*) INTO n_aliases FROM entity_code_aliases WHERE valid_to IS NULL;

    IF n_codes < 7 THEN
        RAISE EXCEPTION 'entity_codes seed: expected >= 7 active codes, found %', n_codes;
    END IF;
    IF n_aliases < 22 THEN
        RAISE EXCEPTION 'entity_code_aliases seed: expected >= 22 live aliases, found %', n_aliases;
    END IF;
END $$;

COMMIT;
