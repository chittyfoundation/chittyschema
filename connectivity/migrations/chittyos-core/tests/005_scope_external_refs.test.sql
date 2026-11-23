-- ============================================================================
-- Real-behavior tests for 005_scope_external_refs.sql
--
-- Run on a disposable Neon branch of chittyos-core (restless-grass-40598426),
-- never on the default branch. Each test is one DO block that raises
-- 'Rn FAIL: ...' on wrong behavior. Every block undoes its own writes by
-- rolling back a subtransaction (sentinel SQLSTATE P0099), so the script
-- leaves no rows behind and can be rerun.
--
-- Run as a role that can write scopes (the table owner). Without the
-- migration, R3 and R5 fail with undefined_table (negative gate).
--
-- All values are synthetic TEST DATA: no matter facts, party names or case
-- numbers. Test ChittyIDs are format-valid only; they are not minted.
--
-- @canon: chittycanon://gov/governance#core-types
-- ============================================================================

-- R3: a duplicate (system, ref) on a DIFFERENT scope is a unique violation.
DO $$
DECLARE s1 uuid; s2 uuid; outcome text;
BEGIN
  BEGIN
    INSERT INTO scopes (characterization, scope_type, creator_id, title)
    VALUES ('Project', 'test_fixture', '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope A')
    RETURNING id INTO s1;
    INSERT INTO scopes (characterization, scope_type, creator_id, title)
    VALUES ('Project', 'test_fixture', '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope B')
    RETURNING id INTO s2;

    INSERT INTO scope_external_refs (scope_id, system, ref, ref_kind, confirmed_by, confirmed_at)
    VALUES (s1, 'test-system', 'TEST-REF-0001', 'test_kind', '00-0-TST-0001-P-2611-0-00', now());

    BEGIN
      INSERT INTO scope_external_refs (scope_id, system, ref, ref_kind, confirmed_by, confirmed_at)
      VALUES (s2, 'test-system', 'TEST-REF-0001', 'test_kind', '00-0-TST-0001-P-2611-0-00', now());
      outcome := 'accepted';
    EXCEPTION WHEN unique_violation THEN
      outcome := 'unique_violation';
    END;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = outcome;
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    IF SQLERRM <> 'unique_violation' THEN
      RAISE EXCEPTION 'R3 FAIL: duplicate (system, ref) on another scope was %', SQLERRM;
    END IF;
  END;
END $$;

-- R4 (separate steps, not a DO block): a non-owner role sees zero rows and
-- cannot insert, even with SELECT/INSERT and schema USAGE granted.
-- neondb_owner has no SET option on the existing app roles, so SET ROLE
-- fails; run R4 by logging in as core_app_rw (an existing LOGIN role without
-- BYPASSRLS), e.g. Neon MCP run_sql with role_name='core_app_rw'.
--
-- R4.1 as owner (disposable branch only):
--   INSERT INTO scopes (id, characterization, scope_type, creator_id, title)
--   VALUES ('00000000-0000-4000-8000-000000000005', 'Project', 'test_fixture',
--           '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope R4');
--   INSERT INTO scope_external_refs (scope_id, system, ref, ref_kind, confirmed_by, confirmed_at)
--   VALUES ('00000000-0000-4000-8000-000000000005', 'test-system', 'TEST-REF-R4-SEED',
--           'test_kind', '00-0-TST-0001-P-2611-0-00', now());
--   GRANT USAGE ON SCHEMA public TO core_app_rw;
--   GRANT SELECT, INSERT ON scope_external_refs TO core_app_rw;
-- R4.2 as core_app_rw:  SELECT count(*) FROM public.scope_external_refs;
--   EXPECT 0 (the owner sees 1).
-- R4.3 as core_app_rw:
--   INSERT INTO public.scope_external_refs (scope_id, system, ref, ref_kind, confirmed_by, confirmed_at)
--   VALUES ('00000000-0000-4000-8000-000000000005', 'test-system', 'TEST-REF-R4-NONOWNER',
--           'test_kind', '00-0-TST-0001-P-2611-0-00', now());
--   EXPECT SQLSTATE 42501 "new row violates row-level security policy".
-- Negative: with the table created without the two RLS lines, R4.2 returns 1
-- and R4.3 succeeds.

-- R5: confirmed_by rejects a non-P type, a role/service name, and malformed
-- segment lengths (YM instead of YYMM, X instead of XX).
DO $$
DECLARE s1 uuid; bad text; outcome text;
BEGIN
  BEGIN
    INSERT INTO scopes (characterization, scope_type, creator_id, title)
    VALUES ('Project', 'test_fixture', '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope D')
    RETURNING id INTO s1;
    outcome := 'all_rejected';
    FOREACH bad IN ARRAY ARRAY[
      '00-0-TST-0001-T-2611-0-00',   -- type T, not P
      '00-0-TST-0001-E-2611-0-00',   -- type E, not P
      'chittyschema',                -- service name
      'core_rw',                     -- role name
      '00-0-TST-0001-P-261-0-00',    -- YM (3 chars)
      '00-0-TST-0001-P-2611-0-0',    -- X (1 char)
      '00-0-tst-0001-P-2611-0-00'    -- lower case
    ] LOOP
      BEGIN
        INSERT INTO scope_external_refs (scope_id, system, ref, ref_kind, confirmed_by, confirmed_at)
        VALUES (s1, 'test-system', 'TEST-REF-R5-' || md5(bad), 'test_kind', bad, now());
        outcome := 'accepted:' || bad;
        EXIT;
      EXCEPTION WHEN check_violation THEN
        NULL;
      END;
    END LOOP;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = outcome;
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    IF SQLERRM <> 'all_rejected' THEN
      RAISE EXCEPTION 'R5 FAIL: confirmed_by %', SQLERRM;
    END IF;
  END;
END $$;

SELECT 'ALL PASS' AS result,
       (SELECT count(*) FROM scope_external_refs) AS rows_left,
       (SELECT count(*) FROM scopes WHERE scope_type = 'test_fixture') AS fixtures_left;
