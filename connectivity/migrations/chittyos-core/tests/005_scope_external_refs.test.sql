-- ============================================================================
-- Real-behavior tests for 005_scope_external_refs.sql
--
-- Run on a disposable Neon branch of chittyos-core (restless-grass-40598426),
-- never on the default branch. Each test is one DO block that raises
-- 'Rn FAIL: ...' on wrong behavior. Every block undoes its own writes by
-- rolling back a subtransaction (sentinel SQLSTATE P0099), so the script
-- leaves no rows behind and can be rerun.
--
-- Run as the connecting/owner role (neondb_owner, which has BYPASSRLS), in ONE
-- transaction (the Neon MCP run_sql_transaction tool, or psql --single-transaction)
-- so a failure can never leave the write-lock trigger disabled. Statement
-- order matters: L1, DISABLE TRIGGER, R3, R5, ENABLE TRIGGER, L1b.
-- Without the migration, L1 fails (the insert succeeds), and R3/R5 fail with
-- undefined_table. Without the trigger lines in 005, L1 fails.
--
-- AUTOMATED here: L1 (write lock), L1b (re-enable), R3, R5.
-- MANUAL, not run by this script: R4 (needs a login as a second role).
--
-- All values are synthetic TEST DATA: no matter facts, party names or case
-- numbers. Test ChittyIDs are format-valid only; they are not minted.
--
-- @canon: chittycanon://gov/governance#core-types
-- ============================================================================

-- L1: the write lock holds against the connecting role. As the owner (which
-- has BYPASSRLS, so RLS cannot stop it), INSERT, UPDATE, DELETE and TRUNCATE
-- must each raise the trigger's 'write-locked' exception. UPDATE and DELETE
-- need a row, which cannot be inserted while the lock is on, so the fixture row
-- is inserted with the trigger disabled and the trigger is re-enabled before
-- the assertions. The whole block is rolled back (sentinel P0099), including
-- the disable/enable and the fixture rows.
DO $$
DECLARE s1 uuid; outcome text := ''; op text;
BEGIN
  IF NOT (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'L1 FAIL: run as the BYPASSRLS/owner role, not %', current_user;
  END IF;
  BEGIN
    INSERT INTO scopes (characterization, scope_type, creator_id, title)
    VALUES ('Project', 'test_fixture', '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope L1')
    RETURNING id INTO s1;

    -- INSERT while locked (trigger on).
    BEGIN
      INSERT INTO scope_external_refs (scope_id, system, ref, ref_kind, confirmed_by, confirmed_at)
      VALUES (s1, 'test-system', 'TEST-REF-L1-INSERT', 'test_kind', '00-0-TST-0001-P-2611-0-00', now());
      outcome := outcome || 'insert_accepted;';
    EXCEPTION WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE '%write-locked%' THEN
        outcome := outcome || 'insert_wrong_error:' || SQLERRM || ';';
      END IF;
    END;

    -- Seed one row with the trigger off, then lock again.
    ALTER TABLE scope_external_refs DISABLE TRIGGER trg_scope_external_refs_write_gate;
    INSERT INTO scope_external_refs (scope_id, system, ref, ref_kind, confirmed_by, confirmed_at)
    VALUES (s1, 'test-system', 'TEST-REF-L1-SEED', 'test_kind', '00-0-TST-0001-P-2611-0-00', now());
    ALTER TABLE scope_external_refs ENABLE TRIGGER trg_scope_external_refs_write_gate;

    FOREACH op IN ARRAY ARRAY['UPDATE', 'DELETE', 'TRUNCATE'] LOOP
      BEGIN
        IF op = 'UPDATE' THEN
          UPDATE scope_external_refs SET ref_kind = 'changed' WHERE ref = 'TEST-REF-L1-SEED';
        ELSIF op = 'DELETE' THEN
          DELETE FROM scope_external_refs WHERE ref = 'TEST-REF-L1-SEED';
        ELSE
          TRUNCATE scope_external_refs;
        END IF;
        outcome := outcome || lower(op) || '_accepted;';
      EXCEPTION WHEN insufficient_privilege THEN
        IF SQLERRM NOT LIKE '%write-locked%' THEN
          outcome := outcome || lower(op) || '_wrong_error:' || SQLERRM || ';';
        END IF;
      END;
    END LOOP;

    IF (SELECT count(*) FROM scope_external_refs WHERE ref = 'TEST-REF-L1-SEED') <> 1 THEN
      outcome := outcome || 'seed_row_changed;';
    END IF;
    IF outcome = '' THEN outcome := 'all_blocked'; END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = outcome;
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    IF SQLERRM <> 'all_blocked' THEN
      RAISE EXCEPTION 'L1 FAIL: owner/BYPASSRLS write was not blocked: %', SQLERRM;
    END IF;
  END;
END $$;

-- Lift ONLY the row trigger so R3 and R5 can reach their constraints. The
-- TRUNCATE trigger stays on. Re-enabled and asserted by L1b below.
ALTER TABLE scope_external_refs DISABLE TRIGGER trg_scope_external_refs_write_gate;

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

-- R4 is MANUAL. It is NOT run by this script and "ALL PASS" below does not
-- cover it. It needs a second login role, which a single script cannot get.
-- R4 (separate steps, not a DO block): a non-BYPASSRLS role sees zero rows
-- (forced RLS, no policy). R4.3 also needs the write trigger OFF to reach RLS;
-- with the trigger on, any insert fails with the 'write-locked' exception
-- first (that case is L1). Run R4.1 and R4.3 on the disposable branch only.
-- neondb_owner has no SET option on the existing app roles, so SET ROLE
-- fails; run R4 by logging in as core_app_rw (an existing LOGIN role without
-- BYPASSRLS), e.g. Neon MCP run_sql with role_name='core_app_rw'.
--
-- R4.1 as owner (disposable branch only):
--   INSERT INTO scopes (id, characterization, scope_type, creator_id, title)
--   VALUES ('00000000-0000-4000-8000-000000000005', 'Project', 'test_fixture',
--           '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope R4');
--   ALTER TABLE scope_external_refs DISABLE TRIGGER trg_scope_external_refs_write_gate;
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

ALTER TABLE scope_external_refs ENABLE TRIGGER trg_scope_external_refs_write_gate;

-- L1b: the re-enable took effect (both triggers 'O' = enabled), and an insert
-- is blocked again.
DO $$
DECLARE s1 uuid; blocked boolean := false;
BEGIN
  IF (SELECT count(*) FROM pg_trigger
      WHERE tgrelid = 'public.scope_external_refs'::regclass
        AND tgname IN ('trg_scope_external_refs_write_gate',
                       'trg_scope_external_refs_truncate_gate')
        AND tgenabled = 'O') <> 2 THEN
    RAISE EXCEPTION 'L1b FAIL: write-lock triggers are not both enabled (tgenabled = O)';
  END IF;
  BEGIN
    INSERT INTO scopes (characterization, scope_type, creator_id, title)
    VALUES ('Project', 'test_fixture', '00-0-TST-0001-P-2611-0-00', 'TEST DATA synthetic scope L1b')
    RETURNING id INTO s1;
    BEGIN
      INSERT INTO scope_external_refs (scope_id, system, ref, ref_kind, confirmed_by, confirmed_at)
      VALUES (s1, 'test-system', 'TEST-REF-L1B', 'test_kind', '00-0-TST-0001-P-2611-0-00', now());
    EXCEPTION WHEN insufficient_privilege THEN
      blocked := SQLERRM LIKE '%write-locked%';
    END;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = blocked::text;
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    IF SQLERRM <> 'true' THEN
      RAISE EXCEPTION 'L1b FAIL: insert after re-enable was not blocked';
    END IF;
  END;
END $$;

SELECT 'ALL PASS' AS result,
       (SELECT count(*) FROM scope_external_refs) AS rows_left,
       (SELECT count(*) FROM scopes WHERE scope_type = 'test_fixture') AS fixtures_left;
