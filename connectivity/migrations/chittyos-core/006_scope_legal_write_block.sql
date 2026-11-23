-- ============================================================================
-- Migration: 006_scope_legal_write_block.sql
-- Database: chittyos-core (Neon)
-- Schema: public
-- Date: 2026-11-23
-- Apply after: 005_scope_external_refs.sql (chittyschema PR #92). 006 does not
-- depend on 005's objects; the order only keeps the numbering monotonic.
--
-- Write block for Legalink rows on the four fractal scope tables from 002:
-- scopes, scope_parties, scope_events, scope_artifacts. scope_external_refs
-- (005) is already fully write-locked and is not touched here.
-- Spec: chittycanon://specs/matter-scope 0.2.2, rule 6, "Write gate" item 1 and
-- open item 4 (chittyfoundation/chittycanon specs/MATTER_SCOPE.md @ e9c86d2);
-- specs/CHITTYROUX_PRIVILEGE_SPACE.md 1.1.0, "Database enforcement for shared
-- Postgres tables", "No bypass". Operator approval: 2026-11-23.
--
-- What it does: BEFORE INSERT OR UPDATE row triggers that reject
--   * a scopes row unless BOTH (a) scope_type is in the allowlist below and
--     (b) metadata carries no protected classification: space is not
--     'legalink' and privilege is not 'privileged' or 'pii';
--   * a scope_parties / scope_events / scope_artifacts row whose parent scope
--     (scope_id) does not exist or would fail the scopes check;
--   * a scope_parties / scope_artifacts row whose own metadata carries a
--     protected classification. (scope_events has details, not metadata, so
--     it gets the parent check only.)
-- The allowlist FAILS CLOSED: a NULL, new, unknown or mistyped scope_type
-- (e.g. 'matterr', 'Project') is rejected until a migration adds it.
--
-- What it does NOT do:
--   * It does NOT open the matter write gate. It writes no matter-tree row and
--     implements neither layer of the space policies. Gate items 1 (space
--     policies with connection role + verified ChittyAuth claim) and 3 (rule 10
--     link check) still block every matter-tree row.
--   * It covers WRITES only. Reads by the owner and BYPASSRLS roles are
--     untouched.
--   * It does NOT stop a determined client connected as the table owner. The
--     triggers are ENABLE ALWAYS (tgenabled = 'A'), so they fire for every
--     role, including the table owner and any BYPASSRLS role (neondb_owner,
--     the role chittyos-core services use through Hyperdrive), and also under
--     session_replication_role = replica. That blocks ACCIDENTAL writes. The
--     owner (neondb_owner) can still DISABLE or DROP the triggers. The actual
--     control is moving services off owner / superuser / BYPASSRLS roles
--     (CHITTYROUX_PRIVILEGE_SPACE 1.1.0, "No bypass";
--     chittyfoundation/chittyauth#81).
--
-- Disabling: these triggers are disabled ONLY on disposable test branches,
-- inside one transaction that re-enables them with ENABLE ALWAYS and asserts
-- tgenabled = 'A' before it ends (for example to seed fixture scopes for
-- 005's tests, or later to test the space policies). That is never permission
-- to disable them on the default branch or any branch holding real data.
--
-- !! GATE ON REMOVING THE TRIGGERS !!
-- The future migration that drops these triggers (and 005's write-lock
-- triggers) must be applied only after
--   npm run check:no-bypass   (identity/scripts/check-no-bypass-connections.ts)
-- exits 0 against production, i.e. no Hyperdrive config pointing at
-- chittyos-core connects as a superuser, a BYPASSRLS role, or a role that owns
-- (directly or by membership) any of the five scope tables. If the triggers
-- are dropped first, the tables reopen to Legalink writes from those roles.
--
-- ALLOWLIST (known non-legal scope_type values) and its sources. Sources
-- searched: 002 header/comments, chittyschema docs, the owner manifest
-- (database-config.json) and chittycanon specs @ e9c86d2.
--   project
--     chittycanon specs/MATTER_SCOPE.md:50 - "representing a non-legal project
--       (use scope_type='project')"
--     connectivity/migrations/chittyos-core/002_fractal_scopes.sql:17-18 -
--       "ChittyCommand (project)"
--     database-config.json:1516 - "ChittyCommand (project)"
--     identity/agents/chittyschema-overlord.md:294 - "Examples: legal_case,
--       dispute, live_stream_session, project."
--   live_stream_session
--     connectivity/migrations/chittyos-core/002_fractal_scopes.sql:16 -
--       "chittystream-canon (live_stream_session)"
--     database-config.json:1516 - "chittystream-canon (live_stream_session)"
--     identity/agents/chittyschema-overlord.md:294 (as above)
--     Named as a non-legal domain's type; no source labels it legal. Unlike
--     project, no source explicitly calls it non-legal.
-- EXCLUDED on purpose:
--   matter, legal_case, dispute, claim, issue, investigation - matter-tree
--     types (MATTER_SCOPE.md "Vocabulary"); legal_case and dispute are also
--     the legal consumers named at 002:16-17.
--   The SCOPE_TYPES constant in connectivity/api/lib/scope-projector.ts:58-91
--     - code, not one of the sources above; it groups legal-adjacent types
--     (evidence_chain, mediation, compliance_review, trace_investigation,
--     engagement), and its anchor chittycanon://gov/governance#fractal-scope-types
--     has no text in chittycanon main. Its other values are rejected until a
--     migration adds them from an authoritative source.
--   test_fixture (used by 005's tests) - not a production type.
--
-- @canon: chittycanon://gov/governance#core-types
-- @canon: chittycanon://specs/matter-scope#write-gate
-- ============================================================================

BEGIN;

-- Returns NULL when (scope_type, metadata) may be written to scopes, else the
-- reason it is blocked. NULL inputs are blocked: the result is only NULL on the
-- explicit allow path at the end.
CREATE OR REPLACE FUNCTION scope_legal_block_reason(p_scope_type text, p_metadata jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE
  allowlist CONSTANT text[] := ARRAY['project', 'live_stream_session'];
  cls text;
BEGIN
  IF p_scope_type IS NULL THEN
    RETURN 'scope_type is NULL';
  END IF;
  IF (p_scope_type = ANY (allowlist)) IS NOT TRUE THEN
    RETURN format('scope_type %L is not in the non-legal allowlist', p_scope_type);
  END IF;
  cls := public.scope_metadata_block_reason(p_metadata);
  IF cls IS NOT NULL THEN
    RETURN cls;
  END IF;
  RETURN NULL;
END;
$fn$;

-- Returns NULL when metadata carries no protected classification, else the
-- reason. NULL metadata (allowed on scope_parties / scope_artifacts) carries
-- none. Non-object metadata, and a space/privilege value that is not a JSON
-- string, cannot be read and are blocked. Values are compared after btrim +
-- lower, so 'Legalink' and ' PII ' are blocked too.
CREATE OR REPLACE FUNCTION scope_metadata_block_reason(p_metadata jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE
  k text;
  v jsonb;
BEGIN
  IF p_metadata IS NULL OR p_metadata = 'null'::jsonb THEN
    RETURN NULL;
  END IF;
  IF jsonb_typeof(p_metadata) <> 'object' THEN
    RETURN 'metadata is not a JSON object, so its classification cannot be read';
  END IF;
  FOREACH k IN ARRAY ARRAY['space', 'privilege'] LOOP
    v := p_metadata -> k;
    IF v IS NOT NULL AND jsonb_typeof(v) NOT IN ('string', 'null') THEN
      RETURN format('metadata.%s is not a string, so it cannot be read', k);
    END IF;
  END LOOP;
  IF lower(btrim(p_metadata ->> 'space')) = 'legalink' THEN
    RETURN 'metadata.space is legalink';
  END IF;
  IF lower(btrim(p_metadata ->> 'privilege')) IN ('privileged', 'pii') THEN
    RETURN format('metadata.privilege is %s', lower(btrim(p_metadata ->> 'privilege')));
  END IF;
  RETURN NULL;
END;
$fn$;

CREATE OR REPLACE FUNCTION scopes_legal_write_block()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE
  reason text;
BEGIN
  reason := public.scope_legal_block_reason(NEW.scope_type, NEW.metadata);
  IF reason IS NOT NULL THEN
    RAISE EXCEPTION
      'scopes % blocked: % (chittycanon://specs/matter-scope, write gate)', TG_OP, reason
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$fn$;

-- Shared by scope_parties, scope_events and scope_artifacts. Reads the parent
-- from public.scopes as the invoking role (not SECURITY DEFINER): a role that
-- cannot see the parent is rejected, which fails closed. Own metadata is read
-- through to_jsonb(NEW) so scope_events (no metadata column) never errors.
CREATE OR REPLACE FUNCTION scope_child_legal_write_block()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE
  p_type text;
  p_meta jsonb;
  reason text;
BEGIN
  SELECT s.scope_type, s.metadata INTO p_type, p_meta
    FROM public.scopes s WHERE s.id = NEW.scope_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION
      '% % blocked: parent scope % does not exist (chittycanon://specs/matter-scope, write gate)',
      TG_TABLE_NAME, TG_OP, coalesce(NEW.scope_id::text, 'NULL')
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  reason := public.scope_legal_block_reason(p_type, p_meta);
  IF reason IS NOT NULL THEN
    RAISE EXCEPTION
      '% % blocked: parent scope %: % (chittycanon://specs/matter-scope, write gate)',
      TG_TABLE_NAME, TG_OP, NEW.scope_id, reason
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_TABLE_NAME IN ('scope_parties', 'scope_artifacts') THEN
    reason := public.scope_metadata_block_reason(to_jsonb(NEW) -> 'metadata');
    IF reason IS NOT NULL THEN
      RAISE EXCEPTION
        '% % blocked: row % (chittycanon://specs/matter-scope, write gate)',
        TG_TABLE_NAME, TG_OP, reason
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_scopes_legal_write_block ON scopes;
CREATE TRIGGER trg_scopes_legal_write_block
  BEFORE INSERT OR UPDATE ON scopes
  FOR EACH ROW EXECUTE FUNCTION scopes_legal_write_block();
ALTER TABLE scopes ENABLE ALWAYS TRIGGER trg_scopes_legal_write_block;

DROP TRIGGER IF EXISTS trg_scope_parties_legal_write_block ON scope_parties;
CREATE TRIGGER trg_scope_parties_legal_write_block
  BEFORE INSERT OR UPDATE ON scope_parties
  FOR EACH ROW EXECUTE FUNCTION scope_child_legal_write_block();
ALTER TABLE scope_parties ENABLE ALWAYS TRIGGER trg_scope_parties_legal_write_block;

DROP TRIGGER IF EXISTS trg_scope_events_legal_write_block ON scope_events;
CREATE TRIGGER trg_scope_events_legal_write_block
  BEFORE INSERT OR UPDATE ON scope_events
  FOR EACH ROW EXECUTE FUNCTION scope_child_legal_write_block();
ALTER TABLE scope_events ENABLE ALWAYS TRIGGER trg_scope_events_legal_write_block;

DROP TRIGGER IF EXISTS trg_scope_artifacts_legal_write_block ON scope_artifacts;
CREATE TRIGGER trg_scope_artifacts_legal_write_block
  BEFORE INSERT OR UPDATE ON scope_artifacts
  FOR EACH ROW EXECUTE FUNCTION scope_child_legal_write_block();
ALTER TABLE scope_artifacts ENABLE ALWAYS TRIGGER trg_scope_artifacts_legal_write_block;

-- Comments go on the functions and triggers, not the tables: COMMENT ON TABLE
-- would overwrite 002's table comments.
COMMENT ON FUNCTION scope_legal_block_reason(text, jsonb) IS
  'NULL if (scope_type, metadata) may be written to scopes, else the reason it is blocked. Allowlist (fails closed): project, live_stream_session. Sources in 006 header. chittycanon://specs/matter-scope 0.2.2 write gate.';
COMMENT ON FUNCTION scope_metadata_block_reason(jsonb) IS
  'NULL if metadata carries no protected classification (space legalink, privilege privileged/pii), else the reason. Unreadable classification is blocked.';
COMMENT ON TRIGGER trg_scopes_legal_write_block ON scopes IS
  'Blocks accidental Legalink / non-allowlisted scope writes by every role (owner and BYPASSRLS included), also under replica mode. Does not stop a determined neondb_owner client, which can disable or drop it; the real control is moving services off owner/BYPASSRLS roles (chittyauth#81). Disable only on disposable test branches. Drop only after check-no-bypass-connections exits 0 against production.';
COMMENT ON TRIGGER trg_scope_parties_legal_write_block ON scope_parties IS
  'Blocks rows on a missing or blocked parent scope, and rows whose own metadata is Legalink/privileged/pii. Same limits as trg_scopes_legal_write_block.';
COMMENT ON TRIGGER trg_scope_events_legal_write_block ON scope_events IS
  'Blocks rows on a missing or blocked parent scope. Same limits as trg_scopes_legal_write_block.';
COMMENT ON TRIGGER trg_scope_artifacts_legal_write_block ON scope_artifacts IS
  'Blocks rows on a missing or blocked parent scope, and rows whose own metadata is Legalink/privileged/pii. Same limits as trg_scopes_legal_write_block.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  bad_scopes bigint;
BEGIN
  IF (SELECT count(*) FROM pg_trigger t
      WHERE NOT t.tgisinternal AND t.tgenabled = 'A'
        AND (t.tgrelid, t.tgname) IN (
          ('public.scopes'::regclass,          'trg_scopes_legal_write_block'),
          ('public.scope_parties'::regclass,   'trg_scope_parties_legal_write_block'),
          ('public.scope_events'::regclass,    'trg_scope_events_legal_write_block'),
          ('public.scope_artifacts'::regclass, 'trg_scope_artifacts_legal_write_block'))) <> 4 THEN
    RAISE EXCEPTION 'scope legal write-block triggers missing or not ENABLE ALWAYS';
  END IF;
  -- Rows written before 006 are not touched (rule 10: report, never repair),
  -- but they are reported: any UPDATE to them is now blocked.
  SELECT count(*) INTO bad_scopes FROM scopes
   WHERE scope_legal_block_reason(scope_type, metadata) IS NOT NULL;
  IF bad_scopes > 0 THEN
    RAISE WARNING '% existing scopes rows fail the 006 check; they are left in place and reported', bad_scopes;
  END IF;
END $$;

COMMIT;
