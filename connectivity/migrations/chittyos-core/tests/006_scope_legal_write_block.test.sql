-- ============================================================================
-- Real-behavior tests for 006_scope_legal_write_block.sql
--
-- Run on a disposable Neon branch of chittyos-core (restless-grass-40598426),
-- never on the default branch, as neondb_owner (the owner, with BYPASSRLS: the
-- role services use through Hyperdrive), in ONE transaction (Neon MCP
-- run_sql_transaction, or psql --single-transaction). Every case runs in its
-- own subtransaction that is rolled back, so the script leaves no rows behind
-- and can be rerun. It never disables a trigger.
--
-- Each case records an outcome in a temp table; the last block compares every
-- outcome with the expected one and raises '006 TESTS FAIL: ...' listing each
-- mismatch. Run on a branch WITHOUT 006, the G2 cases all show 'accepted'
-- (the negative check).
--
-- Expected rejection: SQLSTATE 42501 with a 'blocked' message from the 006
-- trigger. A NOT NULL (23502) or foreign-key (23503) error does NOT count: the
-- trigger must reject first.
--
-- Not covered here: a child row on an existing parent that fails the scopes
-- check. Such a parent cannot be written while 006 is on, so it only arises for
-- rows written before 006; the path shares scope_legal_block_reason with G2.
--
-- All values are synthetic TEST DATA: no matter facts, party names or case
-- numbers. The ChittyID is format-valid only; it is not minted.
--
-- @canon: chittycanon://gov/governance#core-types
-- ============================================================================

CREATE TEMP TABLE t006 (
  gate      text NOT NULL,
  test_case text NOT NULL,
  expected  text NOT NULL,
  outcome   text NOT NULL
) ON COMMIT DROP;

-- Runs one statement in a subtransaction, always rolls it back, and returns
-- 'accepted', 'rejected' (42501 + 'blocked' from 006) or 'error:<state>:<msg>'.
CREATE FUNCTION pg_temp.t006_try(stmt text) RETURNS text
LANGUAGE plpgsql AS $fn$
BEGIN
  BEGIN
    EXECUTE stmt;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = 'accepted';
  EXCEPTION
    WHEN SQLSTATE 'P0099' THEN RETURN 'accepted';
    WHEN insufficient_privilege THEN
      IF SQLERRM LIKE '%blocked%' THEN RETURN 'rejected'; END IF;
      RETURN 'error:42501:' || SQLERRM;
    WHEN OTHERS THEN RETURN 'error:' || SQLSTATE || ':' || SQLERRM;
  END;
END;
$fn$;

-- G1: every 006 trigger exists and is ENABLE ALWAYS ('A').
INSERT INTO t006
SELECT 'G1', 'four triggers tgenabled=A', '4', count(*)::text
  FROM pg_trigger t
 WHERE NOT t.tgisinternal AND t.tgenabled = 'A'
   AND (t.tgrelid, t.tgname) IN (
     ('public.scopes'::regclass,          'trg_scopes_legal_write_block'),
     ('public.scope_parties'::regclass,   'trg_scope_parties_legal_write_block'),
     ('public.scope_events'::regclass,    'trg_scope_events_legal_write_block'),
     ('public.scope_artifacts'::regclass, 'trg_scope_artifacts_legal_write_block'));

-- G2: as neondb_owner, each blocked INSERT into scopes is rejected by 006.
DO $$
DECLARE c record;
BEGIN
  IF NOT (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'G2 setup: run as the BYPASSRLS/owner role, not %', current_user;
  END IF;
  FOR c IN SELECT * FROM (VALUES
    ('matter',        'Engagement', $j${}$j$),
    ('legal_case',    'Case',       $j${}$j$),
    ('dispute',       'Incident',   $j${}$j$),
    ('claim',         'Case',       $j${}$j$),
    ('issue',         'Case',       $j${}$j$),
    ('investigation', 'Incident',   $j${}$j$),
    (NULL,            'Project',    $j${}$j$),
    ('matterr',       'Project',    $j${}$j$),
    ('Project',       'Project',    $j${}$j$),
    ('project',       'Project',    $j${"space":"legalink"}$j$),
    ('project',       'Project',    $j${"space":" Legalink "}$j$),
    ('project',       'Project',    $j${"privilege":"pii"}$j$),
    ('project',       'Project',    $j${"privilege":"privileged"}$j$),
    ('project',       'Project',    $j${"space":["legalink"]}$j$),
    ('live_stream_session', 'Session', $j${"privilege":"pii"}$j$)
  ) AS v(scope_type, characterization, metadata) LOOP
    INSERT INTO t006 VALUES ('G2',
      format('insert scope_type=%s metadata=%s', coalesce(c.scope_type, 'NULL'), c.metadata),
      'rejected',
      pg_temp.t006_try(format(
        'INSERT INTO scopes (characterization, scope_type, creator_id, title, metadata)
         VALUES (%L, %L, %L, %L, %L::jsonb)',
        c.characterization, c.scope_type, '00-0-TST-0001-P-2611-0-00',
        'TEST DATA synthetic scope G2', c.metadata)));
  END LOOP;
END $$;

-- G3: an allowlisted, unclassified scope is accepted; UPDATEs that make it
-- legal are rejected; a status UPDATE (which 002 logs into scope_events) is
-- accepted.
DO $$
DECLARE s1 uuid; r text[] := '{}';
BEGIN
  BEGIN
    r := r || pg_temp.t006_try(
      $q$INSERT INTO scopes (characterization, scope_type, creator_id, title, metadata)
         VALUES ('Session', 'live_stream_session', '00-0-TST-0001-P-2611-0-00',
                 'TEST DATA synthetic scope G3 stream', '{"privilege":"public","space":"business"}')$q$);
    INSERT INTO scopes (characterization, scope_type, creator_id, title)
    VALUES ('Project', 'project', '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope G3')
    RETURNING id INTO s1;
    r := r || 'accepted'::text;
    r := r || pg_temp.t006_try(format(
      $q$UPDATE scopes SET scope_type = 'matter', characterization = 'Engagement' WHERE id = %L$q$, s1));
    r := r || pg_temp.t006_try(format(
      $q$UPDATE scopes SET metadata = '{"space":"legalink"}' WHERE id = %L$q$, s1));
    r := r || pg_temp.t006_try(format(
      $q$UPDATE scopes SET metadata = metadata || '{"privilege":"pii"}' WHERE id = %L$q$, s1));
    r := r || pg_temp.t006_try(format(
      $q$UPDATE scopes SET status = 'active', status_reason = 'TEST DATA' WHERE id = %L$q$, s1));
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = 'done';
  EXCEPTION WHEN SQLSTATE 'P0099' THEN NULL;
  END;
  INSERT INTO t006 VALUES
    ('G3', 'insert live_stream_session business/public', 'accepted', coalesce(r[1], 'missing')),
    ('G3', 'insert project, no metadata',               'accepted', coalesce(r[2], 'missing')),
    ('G3', 'update scope_type -> matter',               'rejected', coalesce(r[3], 'missing')),
    ('G3', 'update metadata -> space legalink',         'rejected', coalesce(r[4], 'missing')),
    ('G3', 'update metadata -> privilege pii',          'rejected', coalesce(r[5], 'missing')),
    ('G3', 'update status (002 logs a scope_event)',    'accepted', coalesce(r[6], 'missing'));
END $$;

-- G4: child rows. On a non-existent scope_id the 006 trigger rejects (42501),
-- before the foreign key (23503) is checked. On an allowed scope they are
-- accepted. On scope_parties / scope_artifacts, the row's own Legalink or
-- privileged metadata is rejected, on INSERT and on UPDATE.
DO $$
DECLARE s1 uuid; missing uuid := '00000000-0000-4000-8000-000000000006';
        r text[] := '{}';
BEGIN
  BEGIN
    INSERT INTO scopes (characterization, scope_type, creator_id, title)
    VALUES ('Project', 'project', '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope G4')
    RETURNING id INTO s1;

    -- 1-3: missing parent
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_parties (scope_id, party_id, entity_type, role) VALUES (%L, 'TEST-PARTY-0001', 'P', 'test_role')$q$, missing));
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_events (scope_id, event_type, summary) VALUES (%L, 'test_event', 'TEST DATA')$q$, missing));
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_artifacts (scope_id, artifact_type, title) VALUES (%L, 'test_artifact', 'TEST DATA')$q$, missing));
    -- 4-6: allowed parent, unclassified rows
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_parties (scope_id, party_id, entity_type, role) VALUES (%L, 'TEST-PARTY-0001', 'P', 'test_role')$q$, s1));
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_events (scope_id, event_type, summary, details) VALUES (%L, 'test_event', 'TEST DATA', '{"space":"legalink"}')$q$, s1));
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_artifacts (scope_id, artifact_type, title, metadata) VALUES (%L, 'test_artifact', 'TEST DATA', NULL)$q$, s1));
    -- 7-10: own classification on parties / artifacts
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_parties (scope_id, party_id, entity_type, role, metadata) VALUES (%L, 'TEST-PARTY-0002', 'P', 'test_role', '{"space":"legalink"}')$q$, s1));
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_artifacts (scope_id, artifact_type, title, metadata) VALUES (%L, 'test_artifact', 'TEST DATA', '{"space":"legalink"}')$q$, s1));
    r := r || pg_temp.t006_try(format(
      $q$INSERT INTO scope_artifacts (scope_id, artifact_type, title, metadata) VALUES (%L, 'test_artifact', 'TEST DATA', '{"privilege":"privileged"}')$q$, s1));
    INSERT INTO scope_parties (scope_id, party_id, entity_type, role)
    VALUES (s1, 'TEST-PARTY-0003', 'P', 'test_role');
    r := r || pg_temp.t006_try(format(
      $q$UPDATE scope_parties SET metadata = '{"privilege":"pii"}' WHERE scope_id = %L AND party_id = 'TEST-PARTY-0003'$q$, s1));
    -- 11: re-pointing a child row at a missing scope
    r := r || pg_temp.t006_try(format(
      $q$UPDATE scope_parties SET scope_id = %L WHERE scope_id = %L AND party_id = 'TEST-PARTY-0003'$q$, missing, s1));
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = 'done';
  EXCEPTION WHEN SQLSTATE 'P0099' THEN NULL;
  END;
  INSERT INTO t006 VALUES
    ('G4', 'scope_parties on missing scope_id',          'rejected', coalesce(r[1], 'missing')),
    ('G4', 'scope_events on missing scope_id',           'rejected', coalesce(r[2], 'missing')),
    ('G4', 'scope_artifacts on missing scope_id',        'rejected', coalesce(r[3], 'missing')),
    ('G4', 'scope_parties on allowed scope',             'accepted', coalesce(r[4], 'missing')),
    ('G4', 'scope_events on allowed scope (details not checked)', 'accepted', coalesce(r[5], 'missing')),
    ('G4', 'scope_artifacts on allowed scope, NULL metadata', 'accepted', coalesce(r[6], 'missing')),
    ('G4', 'scope_parties own metadata legalink',        'rejected', coalesce(r[7], 'missing')),
    ('G4', 'scope_artifacts own metadata legalink',      'rejected', coalesce(r[8], 'missing')),
    ('G4', 'scope_artifacts own metadata privileged',    'rejected', coalesce(r[9], 'missing')),
    ('G4', 'update scope_parties metadata -> pii',       'rejected', coalesce(r[10], 'missing')),
    ('G4', 'update scope_parties scope_id -> missing',   'rejected', coalesce(r[11], 'missing'));
END $$;

DO $$
DECLARE failures text;
BEGIN
  SELECT string_agg(format('%s [%s] expected %s got %s', gate, test_case, expected, outcome), '; ')
    INTO failures FROM t006 WHERE outcome <> expected;
  IF failures IS NOT NULL THEN
    RAISE EXCEPTION '006 TESTS FAIL: %', failures;
  END IF;
END $$;

SELECT gate, test_case, expected, outcome FROM t006 ORDER BY gate, test_case;

SELECT 'ALL PASS' AS result,
       (SELECT count(*) FROM scopes WHERE title LIKE 'TEST DATA%') AS scopes_left,
       (SELECT count(*) FROM scope_parties WHERE party_id LIKE 'TEST-PARTY-%') AS parties_left;
