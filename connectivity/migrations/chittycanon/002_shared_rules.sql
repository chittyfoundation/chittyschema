-- 002_shared_rules.sql
-- ChittyCanon: Shared rules, registries, and configuration
--
-- Everything that ALL entities must follow lives here.
-- Entity-scoped state lives in ChittyLedger (event_ledger).
--
-- Two stores, two concerns:
--   ChittyCanon (this) = shared rules (policies, registries, thresholds, ontology)
--   ChittyLedger       = per-entity state (events, sessions, decisions, memory)
--
-- Workers read via Hyperdrive + workers/shared/chittycanon-client.ts
-- Daemon reads via direct Neon connection
-- KV is cache only (5min TTL)
--
-- @canon chittycanon://gov/governance

CREATE SCHEMA IF NOT EXISTS canon;

-- ── Policies (hook rules, gateway policies) ──────────────────────────────────
-- Replaces: KV hook-registry, local hookify .md files, gateway:policies KV

CREATE TABLE canon.policies (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    enabled     BOOLEAN DEFAULT true,
    event       TEXT NOT NULL,           -- tool_call, stop, prompt, session_start
    action      TEXT NOT NULL,           -- block, suggest, log
    pattern     TEXT NOT NULL,           -- regex pattern
    body        TEXT DEFAULT '',         -- message on block/suggest
    version     INTEGER DEFAULT 1,
    scope       TEXT DEFAULT 'global',   -- global, project, entity
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canon.policies IS
    'Shared policy rules. Gateway enforces server-side. Daemon syncs to local hookify files as offline fallback.';

-- ── Skill Registry ───────────────────────────────────────────────────────────
-- Replaces: KV skill:index

CREATE TABLE canon.skills (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    triggers    TEXT[] DEFAULT '{}',
    execution   TEXT NOT NULL DEFAULT 'mcp',  -- mcp, local, agent
    endpoint    TEXT,
    plugin      TEXT,
    domain      TEXT,
    enabled     BOOLEAN DEFAULT true,
    synced_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canon.skills IS
    'Skill registry. Orchestrator slim-MCP reads from here. Daemon syncs to local config.';

-- ── Agent Registry ───────────────────────────────────────────────────────────
-- Replaces: KV agent:index

CREATE TABLE canon.agents (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    domain       TEXT,
    capabilities TEXT[] DEFAULT '{}',
    status       TEXT DEFAULT 'active',
    endpoint     TEXT,
    synced_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canon.agents IS
    'Agent registry. Orchestrator reads from here for routing and discovery.';

-- ── Channel Registry ─────────────────────────────────────────────────────────
-- Replaces: KV channel:registry

CREATE TABLE canon.channels (
    id               TEXT PRIMARY KEY,
    platform         TEXT NOT NULL,
    node_id          TEXT,
    entity_type      CHAR(1) CHECK (entity_type IN ('P','L','T','E','A')),
    model            TEXT,
    sync_method      TEXT DEFAULT 'gateway',
    contact_endpoint TEXT,
    capabilities     TEXT[] DEFAULT '{}',
    registered_at    TIMESTAMPTZ DEFAULT NOW(),
    last_seen        TIMESTAMPTZ DEFAULT NOW(),
    metadata         JSONB DEFAULT '{}'
);

COMMENT ON TABLE canon.channels IS
    'Registered channels/nodes/models. Universal join protocol.';

-- ── Configuration (key-value for thresholds, settings) ───────────────────────
-- Replaces: hardcoded constants in daemon, Python dicts in scripts

CREATE TABLE canon.config (
    namespace   TEXT NOT NULL,           -- lifecycle, alchemy, routing, etc.
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    description TEXT DEFAULT '',
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (namespace, key)
);

-- Seed lifecycle thresholds
INSERT INTO canon.config (namespace, key, value, description) VALUES
    ('lifecycle', 'fission_domain_threshold', '3', 'Domains before fission signal'),
    ('lifecycle', 'trust_split_threshold', '2', 'Trust level delta for incompatibility'),
    ('lifecycle', 'dormant_days_threshold', '30', 'Days before suspension signal'),
    ('lifecycle', 'stale_days_threshold', '90', 'Days before stale transition'),
    ('lifecycle', 'retired_days_threshold', '180', 'Days before retirement recommendation')
ON CONFLICT (namespace, key) DO NOTHING;

-- ── Alchemy Archetypes ───────────────────────────────────────────────────────
-- Replaces: ALCHEMY_ARCHETYPES dict in daemon script

CREATE TABLE canon.archetypes (
    id                   TEXT PRIMARY KEY,
    label                TEXT NOT NULL,
    fission_bias         TEXT NOT NULL CHECK (fission_bias IN ('encourage', 'neutral', 'resist')),
    dormancy_tolerance   INTEGER NOT NULL,
    combination_affinity TEXT NOT NULL CHECK (combination_affinity IN ('high', 'medium', 'low')),
    description          TEXT DEFAULT ''
);

-- Seed archetypes
INSERT INTO canon.archetypes (id, label, fission_bias, dormancy_tolerance, combination_affinity, description) VALUES
    ('alchemist', 'Innovation', 'encourage', 60, 'high', 'Forks freely, long dormancy tolerance, eager to cross-pollinate'),
    ('sentinel', 'Monitoring', 'resist', 14, 'low', 'Consolidates, short dormancy tolerance, independent watchers'),
    ('sage', 'Deep Analysis', 'neutral', 90, 'medium', 'Fissions only when domains truly diverge, selective combination'),
    ('diplomat', 'Integration', 'resist', 30, 'high', 'Bridges domains, natural combiners')
ON CONFLICT (id) DO NOTHING;

-- ── Identity Classes (TY-VY-RY perception/influence model) ───────────────────
-- NOT read/write permissions — describes what the entity can PERCEIVE and INFLUENCE
-- at each plane of existence.
-- @canon chittycanon://gov/governance#identity-classes

CREATE TABLE canon.identity_classes (
    id              TEXT PRIMARY KEY,
    min_trust_level INTEGER NOT NULL DEFAULT 0,    -- minimum trust level to qualify
    ty_perceive     BOOLEAN NOT NULL DEFAULT true,  -- can see identity/ChittyDNA
    vy_perceive     BOOLEAN NOT NULL DEFAULT false, -- can observe behavior/sessions
    vy_influence    BOOLEAN NOT NULL DEFAULT false, -- can record behavior/contribute to ledger
    ry_perceive     BOOLEAN NOT NULL DEFAULT false, -- can see trust/authority grants
    ry_influence    BOOLEAN NOT NULL DEFAULT false, -- can grant authority/modify trust
    description     TEXT DEFAULT ''
);

INSERT INTO canon.identity_classes (id, min_trust_level, ty_perceive, vy_perceive, vy_influence, ry_perceive, ry_influence, description) VALUES
    ('advocate',    0, true,  false, false, false, false, 'Can see who entities are. Cannot observe behavior or authority.'),
    ('context',     1, true,  true,  true,  false, false, 'Can see identity + observe and record behavior. Cannot see authority.'),
    ('coordinator', 3, true,  true,  true,  true,  false, 'Can perceive all three planes. Cannot grant authority.'),
    ('agent',       4, true,  true,  true,  true,  true,  'Full perception + influence. Can grant authority, modify trust.')
ON CONFLICT (id) DO NOTHING;

-- ── Baseline Provisioning (what every entity needs to exist in the system) ───
-- These are NON-NEGOTIABLE. Every entity gets these regardless of identity class.
-- @canon chittycanon://gov/governance#baseline

CREATE TABLE canon.baseline_services (
    id          TEXT PRIMARY KEY,
    service     TEXT NOT NULL,              -- service name
    access      TEXT NOT NULL,              -- what type of access
    reason      TEXT NOT NULL,              -- why it's baseline
    required    BOOLEAN DEFAULT true        -- hard requirement vs strong default
);

INSERT INTO canon.baseline_services (id, service, access, reason) VALUES
    ('ledger-write',   'ChittyLedger (Neon)',    'append',       'Every entity must be able to write to its own ledger'),
    ('ledger-read',    'ChittyLedger (Neon)',    'read-own',     'Every entity must be able to read its own history'),
    ('identity-resolve','ChittyID Resolution',   'read',         'Every entity must be able to resolve other entities'),
    ('ch1tty-connect', 'Ch1tty Middleware',      'invoke',       'Every entity must be able to reach Ch1tty for system connections'),
    ('canon-read',     'ChittyCanon',            'read',         'Every entity must be able to read shared rules'),
    ('session-bind',   'ContextConsciousness',   'bind',         'Every entity must be able to bind to sessions')
ON CONFLICT (id) DO NOTHING;

-- ── Service Access Tiers (role-based, per identity class) ────────────────────
-- What additional services each identity class gets beyond baseline.
-- ChittyConnect reads this to build provisioning recommendations.
-- @canon chittycanon://gov/governance#service-access

CREATE TABLE canon.service_access (
    id              TEXT PRIMARY KEY,
    identity_class  TEXT NOT NULL REFERENCES canon.identity_classes(id),
    service         TEXT NOT NULL,
    access          TEXT NOT NULL,          -- type of access granted
    reason          TEXT NOT NULL,
    requires_auth   TEXT,                    -- null, 'op', 'oauth', 'service-token'
    UNIQUE(identity_class, service)
);

-- Advocate: minimal — baseline only, plus read access to registry
INSERT INTO canon.service_access (id, identity_class, service, access, reason) VALUES
    ('advocate-registry', 'advocate', 'ChittyRegistry', 'read', 'Can browse available services')
ON CONFLICT (id) DO NOTHING;

-- Context: can observe + record, needs tool access
INSERT INTO canon.service_access (id, identity_class, service, access, reason, requires_auth) VALUES
    ('context-github',    'context', 'GitHub',              'read',        'Can read repos and issues', 'oauth'),
    ('context-notion',    'context', 'Notion',              'read',        'Can read workspace', 'oauth'),
    ('context-claude',    'context', 'Claude API',          'invoke',      'Can invoke for inference', null),
    ('context-gemini',    'context', 'Gemini API',          'invoke',      'Can invoke for inference', null),
    ('context-track',     'context', 'chittytrack',         'write',       'Can emit telemetry', null)
ON CONFLICT (id) DO NOTHING;

-- Coordinator: can see trust + deploy, needs write access
INSERT INTO canon.service_access (id, identity_class, service, access, reason, requires_auth) VALUES
    ('coord-github',      'coordinator', 'GitHub',          'push',        'Can commit and push', 'oauth'),
    ('coord-notion',      'coordinator', 'Notion',          'read/write',  'Can create and update pages', 'oauth'),
    ('coord-cloudflare',  'coordinator', 'Cloudflare Workers','deploy',    'Can deploy workers', 'service-token'),
    ('coord-neon',        'coordinator', 'Neon',            'read/write',  'Can query and write to project DBs', 'service-token'),
    ('coord-1password',   'coordinator', '1Password',       'read',        'Can read credentials', 'op'),
    ('coord-tasks',       'coordinator', 'chittyagent-tasks','create/claim','Can create and claim tasks', 'service-token')
ON CONFLICT (id) DO NOTHING;

-- Agent: full access, can grant authority
INSERT INTO canon.service_access (id, identity_class, service, access, reason, requires_auth) VALUES
    ('agent-1password',   'agent', '1Password',             'read/write',  'Can manage credentials', 'op'),
    ('agent-mercury',     'agent', 'Mercury Banking',       'read',        'Can read financial data', 'service-token'),
    ('agent-stripe',      'agent', 'Stripe',                'read',        'Can read payment data', 'service-token'),
    ('agent-register',    'agent', 'ChittyRegister',        'write',       'Can register new services', 'service-token'),
    ('agent-canon-write', 'agent', 'ChittyCanon',           'write',       'Can update shared rules', 'service-token'),
    ('agent-provision',   'agent', 'ChittyConnect Provisioning','grant',   'Can provision access for other entities', 'service-token')
ON CONFLICT (id) DO NOTHING;

-- ── Trust Taxonomy (domain trust types — core + niche) ────────────────────────
-- The 4 core trust domains are ALWAYS computed. Niche subdivisions emerge when
-- there's enough ledger evidence to subdivide (threshold: 20+ events in domain).
-- @canon chittycanon://gov/governance#trust-taxonomy

CREATE TABLE canon.trust_domains (
    id          TEXT PRIMARY KEY,              -- e.g., 'legal', 'legal.litigation'
    parent_id   TEXT REFERENCES canon.trust_domains(id),  -- null for core, parent for niche
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    core        BOOLEAN DEFAULT false,         -- true for the 4 core domains
    niche_threshold INTEGER DEFAULT 20,        -- events needed to subdivide into this niche
    -- Mapping: how to detect this domain from ledger events
    action_patterns TEXT[] DEFAULT '{}',        -- regex patterns on event action field
    project_patterns TEXT[] DEFAULT '{}',       -- regex patterns on project field
    metadata_keys TEXT[] DEFAULT '{}'           -- JSONB keys to check in event metadata
);

-- 4 Core domains (always computed)
INSERT INTO canon.trust_domains (id, name, description, core, action_patterns) VALUES
    ('people',  'People',     'Interpersonal trust — family, professional, community', true,
     ARRAY['mentor', 'team', 'collaborate', 'communicate', 'support']),
    ('legal',   'Legal',      'Legal system alignment — litigation, contracts, compliance', true,
     ARRAY['legal', 'evidence', 'dispute', 'court', 'filing', 'contract', 'lease', 'compliance']),
    ('state',   'State',      'Institutional trust — government, financial, corporate', true,
     ARRAY['government', 'tax', 'permit', 'banking', 'finance', 'mercury', 'stripe', 'corporate']),
    ('chitty',  'Chitty',     'ChittyOS system trust — infrastructure, architecture, engineering', true,
     ARRAY['deploy', 'worker', 'schema', 'test', 'build', 'architect', 'lint'])
ON CONFLICT (id) DO NOTHING;

-- People niches
INSERT INTO canon.trust_domains (id, parent_id, name, description, action_patterns) VALUES
    ('people.family',       'people', 'Family',       'Kids, pets, household matters',
     ARRAY['family', 'child', 'pet', 'household', 'home']),
    ('people.professional', 'people', 'Professional', 'Colleagues, clients, work relationships',
     ARRAY['team', 'client', 'review', 'collaborate', 'pr']),
    ('people.community',    'people', 'Community',    'Neighbors, public, community matters',
     ARRAY['community', 'public', 'neighbor', 'hoa'])
ON CONFLICT (id) DO NOTHING;

-- Legal niches
INSERT INTO canon.trust_domains (id, parent_id, name, description, action_patterns) VALUES
    ('legal.litigation',  'legal', 'Litigation',  'Courtroom, evidence, case management',
     ARRAY['court', 'docket', 'hearing', 'evidence', 'exhibit', 'motion']),
    ('legal.contracts',   'legal', 'Contracts',   'Agreements, leases, negotiations',
     ARRAY['contract', 'lease', 'agreement', 'template', 'sign']),
    ('legal.compliance',  'legal', 'Compliance',  'Regulatory, tax, audit',
     ARRAY['compliance', 'audit', 'tax', 'regulation', 'filing']),
    ('legal.property',    'legal', 'Property',    'Real estate, titles, transactions',
     ARRAY['property', 'title', 'deed', 'closing', 'escrow', 'real.estate'])
ON CONFLICT (id) DO NOTHING;

-- State niches
INSERT INTO canon.trust_domains (id, parent_id, name, description, action_patterns) VALUES
    ('state.government',  'state', 'Government',  'Filings, permits, government interaction',
     ARRAY['government', 'permit', 'filing', 'agency']),
    ('state.financial',   'state', 'Financial',   'Banking, investment, money management',
     ARRAY['banking', 'mercury', 'stripe', 'payment', 'invoice', 'transaction']),
    ('state.corporate',   'state', 'Corporate',   'Governance, reporting, corporate structure',
     ARRAY['corporate', 'board', 'governance', 'entity', 'llc', 'inc'])
ON CONFLICT (id) DO NOTHING;

-- Chitty niches
INSERT INTO canon.trust_domains (id, parent_id, name, description, action_patterns) VALUES
    ('chitty.infrastructure', 'chitty', 'Infrastructure', 'Deploys, ops, workers, services',
     ARRAY['deploy', 'worker', 'wrangler', 'cloudflare', 'ops', 'service']),
    ('chitty.architecture',   'chitty', 'Architecture',   'Design, schemas, system design',
     ARRAY['architect', 'schema', 'design', 'migration', 'charter']),
    ('chitty.engineering',    'chitty', 'Engineering',    'Code, tests, builds, quality',
     ARRAY['test', 'build', 'lint', 'code', 'refactor', 'fix', 'implement']),
    ('chitty.coordination',   'chitty', 'Coordination',   'Routing, orchestration, lifecycle',
     ARRAY['route', 'orchestrat', 'provision', 'lifecycle', 'fission', 'merge'])
ON CONFLICT (id) DO NOTHING;

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_canon_trust_domains_parent ON canon.trust_domains(parent_id);
CREATE INDEX IF NOT EXISTS idx_canon_trust_domains_core ON canon.trust_domains(core) WHERE core = true;
CREATE INDEX IF NOT EXISTS idx_canon_policies_enabled ON canon.policies(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_canon_policies_event ON canon.policies(event);
CREATE INDEX IF NOT EXISTS idx_canon_skills_enabled ON canon.skills(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_canon_agents_status ON canon.agents(status);
CREATE INDEX IF NOT EXISTS idx_canon_channels_platform ON canon.channels(platform);
CREATE INDEX IF NOT EXISTS idx_canon_config_namespace ON canon.config(namespace);
