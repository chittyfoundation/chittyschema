-- ============================================================================
-- Migration: 002_fractal_scopes.sql
-- Database: chittyos-core (Neon)
-- Schema: public
-- Date: 2026-04-14
--
-- Introduces the fractal scope primitive — a general-purpose persistent
-- container that holds parties, events, and artifacts. Self-similar via
-- parent_scope_id. Domain taxonomy via `scope_type` (free text, so new
-- domains need zero DDL). Lifecycle via `status` enum.
--
-- Ported from contextual.scopes (chittyentity migration 004) and extended
-- with scope_artifacts, wider scope_type vocabulary, and chittyos-core
-- naming conventions.
--
-- Consumers: chitty-stream-canon (live_stream_session), ChittyEvidence
-- (legal_case), ChittyDispute (dispute), ChittyCommand (project), and
-- any future domain.
--
-- @canon: chittycanon://gov/governance#core-types
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE scope_status AS ENUM (
    'new',
    'active',
    'waiting',
    'escalated',
    'paused',
    'resolved',
    'closed',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE scope_characterization AS ENUM (
    'Case',
    'Session',
    'Transaction',
    'Incident',
    'Project',
    'Engagement'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLE: scopes
-- ============================================================================

CREATE TABLE IF NOT EXISTS scopes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chitty_id           text UNIQUE,
  canon_type          char(1) NOT NULL DEFAULT 'E'
                      CHECK (canon_type = 'E'),
  characterization    scope_characterization NOT NULL,
  scope_type          text NOT NULL,
  parent_scope_id     uuid REFERENCES scopes(id) ON DELETE RESTRICT,
  root_scope_id       uuid REFERENCES scopes(id) ON DELETE RESTRICT,
  depth               int NOT NULL DEFAULT 0,
  status              scope_status NOT NULL DEFAULT 'new',
  status_reason       text,
  status_changed_at   timestamptz NOT NULL DEFAULT now(),
  creator_id          text NOT NULL,
  current_agent_id    text,
  current_agent_since timestamptz,
  title               text NOT NULL,
  summary             text,
  source              text,
  external_id         text,
  metadata            jsonb NOT NULL DEFAULT '{}',
  resolved_at         timestamptz,
  closed_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          text,
  deleted_at          timestamptz,

  CONSTRAINT scopes_parent_not_self CHECK (
    parent_scope_id IS NULL OR parent_scope_id <> id
  )
);

COMMENT ON TABLE scopes IS
  'Fractal scope primitive. Event (E) in P/L/T/E/A ontology. Self-similar via parent_scope_id. Domain taxonomy in scope_type (free text). Domain state in metadata JSONB.';

-- ============================================================================
-- TABLE: scope_parties
-- ============================================================================

CREATE TABLE IF NOT EXISTS scope_parties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id      uuid NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  party_id      text NOT NULL,
  entity_type   char(1) NOT NULL
                CHECK (entity_type IN ('P', 'L', 'T', 'E', 'A')),
  role          text NOT NULL,
  display_name  text,
  metadata      jsonb DEFAULT '{}',
  joined_at     timestamptz NOT NULL DEFAULT now(),
  left_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scope_parties_unique UNIQUE (scope_id, party_id, role)
);

COMMENT ON TABLE scope_parties IS
  'Parties participating in a scope. Entity types follow P/L/T/E/A ontology.';

-- ============================================================================
-- TABLE: scope_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS scope_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id      uuid NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  event_type    text NOT NULL,
  summary       text NOT NULL,
  actor         text,
  from_status   scope_status,
  to_status     scope_status,
  details       jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE scope_events IS
  'Immutable append-only event log for scope lifecycle.';

-- ============================================================================
-- TABLE: scope_artifacts
-- ============================================================================

CREATE TABLE IF NOT EXISTS scope_artifacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id      uuid NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  artifact_type text NOT NULL,
  title         text NOT NULL,
  description   text,
  storage_type  text,
  storage_ref   text,
  content_hash  text,
  file_size     bigint,
  mime_type     text,
  metadata      jsonb DEFAULT '{}',
  added_by      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

COMMENT ON TABLE scope_artifacts IS
  'Artifacts attached to a scope. Storage-agnostic via storage_type + storage_ref. Integrity via content_hash.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_scopes_type_status
  ON scopes(scope_type, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scopes_status_updated
  ON scopes(status, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scopes_creator
  ON scopes(creator_id);
CREATE INDEX IF NOT EXISTS idx_scopes_parent
  ON scopes(parent_scope_id) WHERE parent_scope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scopes_root
  ON scopes(root_scope_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scopes_source_external_unique
  ON scopes(source, external_id) WHERE external_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scopes_metadata_gin
  ON scopes USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_scopes_characterization
  ON scopes(characterization);

CREATE INDEX IF NOT EXISTS idx_scope_parties_scope
  ON scope_parties(scope_id);
CREATE INDEX IF NOT EXISTS idx_scope_parties_party
  ON scope_parties(party_id);
CREATE INDEX IF NOT EXISTS idx_scope_parties_role
  ON scope_parties(scope_id, role);

CREATE INDEX IF NOT EXISTS idx_scope_events_scope_created
  ON scope_events(scope_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scope_events_type
  ON scope_events(event_type);

CREATE INDEX IF NOT EXISTS idx_scope_artifacts_scope
  ON scope_artifacts(scope_id);
CREATE INDEX IF NOT EXISTS idx_scope_artifacts_type
  ON scope_artifacts(scope_id, artifact_type);
CREATE INDEX IF NOT EXISTS idx_scope_artifacts_hash
  ON scope_artifacts(content_hash) WHERE content_hash IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION touch_scopes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scopes_touch ON scopes;
CREATE TRIGGER trg_scopes_touch
  BEFORE UPDATE ON scopes
  FOR EACH ROW EXECUTE FUNCTION touch_scopes_updated_at();

CREATE OR REPLACE FUNCTION log_scope_transitions()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO scope_events
      (scope_id, event_type, summary, from_status, to_status, actor, details)
    VALUES (
      NEW.id, 'state_change',
      format('status %s -> %s', OLD.status, NEW.status),
      OLD.status, NEW.status,
      NEW.current_agent_id,
      jsonb_build_object('reason', NEW.status_reason)
    );
  END IF;
  IF OLD.current_agent_id IS DISTINCT FROM NEW.current_agent_id THEN
    INSERT INTO scope_events
      (scope_id, event_type, summary, actor, details)
    VALUES (
      NEW.id, 'handoff',
      format('handoff %s -> %s',
        COALESCE(OLD.current_agent_id, 'none'),
        COALESCE(NEW.current_agent_id, 'none')),
      NEW.current_agent_id,
      jsonb_build_object(
        'from_agent', OLD.current_agent_id,
        'to_agent', NEW.current_agent_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scopes_transitions ON scopes;
CREATE TRIGGER trg_scopes_transitions
  AFTER UPDATE ON scopes
  FOR EACH ROW EXECUTE FUNCTION log_scope_transitions();

CREATE OR REPLACE FUNCTION scope_set_root_and_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_scope_id IS NULL THEN
    NEW.root_scope_id := NEW.id;
    NEW.depth := 0;
  ELSE
    SELECT COALESCE(root_scope_id, id), depth + 1
      INTO NEW.root_scope_id, NEW.depth
      FROM scopes WHERE id = NEW.parent_scope_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scopes_root ON scopes;
CREATE TRIGGER trg_scopes_root
  BEFORE INSERT ON scopes
  FOR EACH ROW EXECUTE FUNCTION scope_set_root_and_depth();

CREATE OR REPLACE FUNCTION touch_scope_parties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_parties_touch ON scope_parties;
CREATE TRIGGER trg_scope_parties_touch
  BEFORE UPDATE ON scope_parties
  FOR EACH ROW EXECUTE FUNCTION touch_scope_parties_updated_at();

CREATE OR REPLACE FUNCTION touch_scope_artifacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_artifacts_touch ON scope_artifacts;
CREATE TRIGGER trg_scope_artifacts_touch
  BEFORE UPDATE ON scope_artifacts
  FOR EACH ROW EXECUTE FUNCTION touch_scope_artifacts_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'scopes'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'scope_artifacts'
  ) THEN
    RAISE NOTICE 'scopes primitive (4 tables) created successfully';
  ELSE
    RAISE EXCEPTION 'scopes primitive creation failed';
  END IF;
END $$;

COMMIT;
