-- 002_entity_ledger.sql
-- ChittyLedger: Entity-scoped ledger entries
--
-- Makes event_ledger the single source of truth for ALL entity state.
-- Replaces: local JSON files, KV entity registries, merge logs, daemon state.
--
-- Two stores, two concerns:
--   ChittyLedger (this) = per-entity state (events, sessions, decisions, memory, trust, lineage)
--   ChittyCanon         = shared rules (policies, thresholds, registries, schemas)
--
-- @canon chittycanon://gov/governance#core-types

-- ── Add entity lifecycle event types ─────────────────────────────────────────

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ENTITY_CREATED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ENTITY_FISSION';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ENTITY_FUSION';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ENTITY_SUSPENSION';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ENTITY_RETIREMENT';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ENTITY_REWARMING';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'SESSION_START';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'SESSION_END';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'SESSION_MERGE';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'TOOL_CALL';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ROUTING_DECISION';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'LIFECYCLE_SIGNAL';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'TRUST_OBSERVATION';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'ALCHEMIST_PROPOSAL';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'CHANNEL_REGISTERED';

-- ── Add ChittyID + scope columns to event_ledger ────────────────────────────

-- ChittyID of the entity this event belongs to (primary entity scope)
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS chitty_id TEXT;

-- Scope: who can see this event
--   private  = only the owning entity
--   shared   = specific group of entities (see group_id)
--   project  = all entities working on a project
--   global   = system-wide (ChittyCanon rules, system health)
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'private'
    CHECK (scope IN ('private', 'shared', 'project', 'global'));

-- Group ID for shared-scope events (coordination groups, solution teams)
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS group_id TEXT;

-- Project scope for project-scoped events
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS project TEXT;

-- Canonical entity type from ontology: P/L/T/E/A (not the old string descriptions)
-- Keep old entity_type column for backwards compatibility, add canonical version
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS canonical_entity_type CHAR(1)
    CHECK (canonical_entity_type IN ('P', 'L', 'T', 'E', 'A'));

-- Parent entity for lineage tracking (fission source, derivative parent)
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS parent_chitty_id TEXT;

-- Display name for entity resolution (set on ENTITY_CREATED events)
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Hash chain: each event references the previous event's hash for tamper detection
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS prev_hash TEXT;
ALTER TABLE event_ledger ADD COLUMN IF NOT EXISTS event_hash TEXT;

-- ── Indexes for entity resolution and scoped queries ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_event_ledger_chitty_id
    ON event_ledger(chitty_id);

CREATE INDEX IF NOT EXISTS idx_event_ledger_chitty_id_type
    ON event_ledger(chitty_id, event_type);

CREATE INDEX IF NOT EXISTS idx_event_ledger_chitty_id_time
    ON event_ledger(chitty_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_event_ledger_scope
    ON event_ledger(scope);

CREATE INDEX IF NOT EXISTS idx_event_ledger_group_id
    ON event_ledger(group_id) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_ledger_project
    ON event_ledger(project) WHERE project IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_ledger_parent
    ON event_ledger(parent_chitty_id) WHERE parent_chitty_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_ledger_canonical_type
    ON event_ledger(canonical_entity_type) WHERE canonical_entity_type IS NOT NULL;

-- ── Convenience view: latest state per entity ────────────────────────────────
-- "Who is this ChittyID?" — returns the most recent event per entity

CREATE OR REPLACE VIEW entity_current_state AS
SELECT DISTINCT ON (chitty_id)
    chitty_id,
    display_name,
    canonical_entity_type,
    event_type AS latest_event_type,
    action AS latest_action,
    metadata AS latest_metadata,
    timestamp AS last_seen,
    session_id AS latest_session_id
FROM event_ledger
WHERE chitty_id IS NOT NULL
ORDER BY chitty_id, timestamp DESC;

COMMENT ON VIEW entity_current_state IS
    'Entity resolution: latest state per ChittyID. Query this to resolve who an entity is.';

-- ── Convenience view: active entities ────────────────────────────────────────

CREATE OR REPLACE VIEW active_entities AS
SELECT
    e.chitty_id,
    e.display_name,
    e.canonical_entity_type,
    e.last_seen,
    e.latest_event_type,
    (SELECT count(*) FROM event_ledger el
     WHERE el.chitty_id = e.chitty_id AND el.event_type = 'SESSION_START') AS total_sessions,
    (SELECT count(*) FROM event_ledger el
     WHERE el.chitty_id = e.chitty_id AND el.event_type = 'TOOL_CALL') AS total_tool_calls
FROM entity_current_state e
WHERE e.latest_event_type NOT IN ('ENTITY_RETIREMENT', 'ENTITY_SUSPENSION')
ORDER BY e.last_seen DESC;

COMMENT ON VIEW active_entities IS
    'All non-retired, non-suspended entities with session/tool counts.';

-- ── Convenience view: shared state between entities ──────────────────────────

CREATE OR REPLACE VIEW shared_entity_state AS
SELECT
    group_id,
    project,
    scope,
    array_agg(DISTINCT chitty_id) AS participating_entities,
    count(*) AS event_count,
    max(timestamp) AS latest_activity
FROM event_ledger
WHERE scope IN ('shared', 'project') AND group_id IS NOT NULL
GROUP BY group_id, project, scope
ORDER BY latest_activity DESC;

COMMENT ON VIEW shared_entity_state IS
    'Coordination groups and project scopes with participating entities.';

-- ── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON COLUMN event_ledger.chitty_id IS
    'ChittyID of the entity this event belongs to. Format: VV-G-LLL-SSSS-T-YM-C-X';
COMMENT ON COLUMN event_ledger.scope IS
    'Visibility: private (entity only), shared (group), project (all in project), global (system)';
COMMENT ON COLUMN event_ledger.group_id IS
    'Coordination group ID for shared-scope events (solution teams, fission groups)';
COMMENT ON COLUMN event_ledger.canonical_entity_type IS
    'P=Person, L=Location, T=Thing, E=Event, A=Authority per chittycanon://gov/governance#core-types';
COMMENT ON COLUMN event_ledger.parent_chitty_id IS
    'Parent entity ChittyID for lineage (fission source, derivative parent)';
COMMENT ON COLUMN event_ledger.event_hash IS
    'SHA-256 of this event for hash chain verification';
COMMENT ON COLUMN event_ledger.prev_hash IS
    'Hash of the previous event in this entitys chain for tamper detection';
