-- ============================================================================
-- Migration: 005_scope_external_refs.sql
-- Database: chittyos-core (Neon)
-- Schema: public
-- Date: 2026-11-22
--
-- Creates scope_external_refs, the side table for identifiers that a system
-- outside the owning stores assigns to a matter or to one of its children.
-- Spec: chittycanon://specs/matter-scope 0.2.1, rule 9 and open item 8
-- (chittyfoundation/chittycanon specs/MATTER_SCOPE.md @ 5c31a1c).
--
-- The table is created WRITE-LOCKED, by two independent mechanisms:
--   1. Writes: BEFORE INSERT/UPDATE/DELETE row triggers and a BEFORE TRUNCATE
--      statement trigger always raise. This blocks EVERY role, including the
--      table owner and any BYPASSRLS role (neondb_owner, the role chittyos-core
--      services use through Hyperdrive). Only session_replication_role =
--      replica, which needs superuser, skips triggers.
--   2. Reads: row level security is enabled and forced, with no policy. This
--      denies reads to every role WITHOUT BYPASSRLS. It does NOT bind
--      neondb_owner or any other BYPASSRLS role (BYPASSRLS beats FORCE), so
--      those roles can still read. The table is empty and, while the write
--      trigger exists, nothing can be written to it.
-- A later migration that adds the space policies (after the canon amendment
-- that defines how the database learns a writer's space, matter-scope write
-- gate item 1) drops the write-lock triggers and function.
--
-- Applying this migration does NOT open the matter write gate. Gate items 1
-- (write-time Legalink suppression) and 3 (rule 10 link check) still block
-- every matter-tree row.
--
-- @canon: chittycanon://gov/governance#core-types
-- @canon: chittycanon://specs/matter-scope#rule-9
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS scope_external_refs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT, not CASCADE: rule 10 says a broken link is reported, never
  -- repaired, so deleting a scope must not silently drop its references.
  scope_id      uuid NOT NULL REFERENCES scopes(id) ON DELETE RESTRICT,
  system        text NOT NULL CHECK (btrim(system) <> ''),
  ref           text NOT NULL CHECK (btrim(ref) <> '' AND ref = btrim(ref)),
  ref_kind      text NOT NULL CHECK (btrim(ref_kind) <> ''),
  -- The originating caller's ChittyID (from a verified ChittyAuth claim),
  -- never a role or service name. Format VV-G-LLL-SSSS-T-YYMM-C-XX per
  -- CHITTYFOUNDATION/chittyid CHARTER.md ("ChittyID Format") and CLAUDE.md
  -- ("ChittyID Format"); T is restricted to P because the confirmer is a
  -- Person (Natural or Synthetic), per chittycanon://gov/governance#core-types.
  -- VV, G, LLL and C accept letters or digits (README example
  -- CP-A-001-1234-P-2509-I-82); SSSS, YYMM and XX are digits.
  confirmed_by  text NOT NULL CHECK (
    confirmed_by ~ '^[A-Z0-9]{2}-[A-Z0-9]-[A-Z0-9]{3}-[0-9]{4}-P-[0-9]{4}-[A-Z0-9]-[0-9]{2}$'
  ),
  confirmed_at  timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Rule 9: (system, ref) is unique across the whole table, not per scope.
  -- A second attachment is rejected and reported as a conflict.
  CONSTRAINT uq_scope_external_refs_system_ref UNIQUE (system, ref)
);

CREATE INDEX IF NOT EXISTS idx_scope_external_refs_scope
  ON scope_external_refs(scope_id);

ALTER TABLE scope_external_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_external_refs FORCE ROW LEVEL SECURITY;
-- No policy on purpose: denies reads to roles without BYPASSRLS. See header.

-- Write lock that BYPASSRLS and the table owner cannot skip.
CREATE OR REPLACE FUNCTION scope_external_refs_write_gate() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION
    'scope_external_refs is write-locked: % is blocked until the space policies land (chittycanon://specs/matter-scope, write gate)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$fn$;

DROP TRIGGER IF EXISTS trg_scope_external_refs_write_gate ON scope_external_refs;
CREATE TRIGGER trg_scope_external_refs_write_gate
  BEFORE INSERT OR UPDATE OR DELETE ON scope_external_refs
  FOR EACH ROW EXECUTE FUNCTION scope_external_refs_write_gate();

DROP TRIGGER IF EXISTS trg_scope_external_refs_truncate_gate ON scope_external_refs;
CREATE TRIGGER trg_scope_external_refs_truncate_gate
  BEFORE TRUNCATE ON scope_external_refs
  FOR EACH STATEMENT EXECUTE FUNCTION scope_external_refs_write_gate();

COMMENT ON TABLE scope_external_refs IS
  'External references for scopes (chittycanon://specs/matter-scope rule 9). Written only on operator confirmation. Writes are blocked for every role (owner and BYPASSRLS included) by trigger until space policies land; forced RLS with no policy denies reads to non-BYPASSRLS roles only.';
COMMENT ON COLUMN scope_external_refs.system IS
  'The outside system that assigned the identifier.';
COMMENT ON COLUMN scope_external_refs.ref IS
  'The identifier only: no caption, description, party name or status. Court-assigned case numbers are excluded (rule 9).';
COMMENT ON COLUMN scope_external_refs.ref_kind IS
  'What kind of identifier ref is, within system.';
COMMENT ON COLUMN scope_external_refs.confirmed_by IS
  'ChittyID (type P) of the person who confirmed the reference, VV-G-LLL-SSSS-T-YYMM-C-XX.';
COMMENT ON COLUMN scope_external_refs.confirmed_at IS
  'When the operator confirmed the reference.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'scope_external_refs'
      AND c.relrowsecurity AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'scope_external_refs missing or not RLS-forced';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scope_external_refs'
  ) THEN
    RAISE EXCEPTION 'scope_external_refs must have no policy';
  END IF;
  IF (SELECT count(*) FROM pg_trigger
      WHERE tgrelid = 'public.scope_external_refs'::regclass
        AND tgname IN ('trg_scope_external_refs_write_gate',
                       'trg_scope_external_refs_truncate_gate')
        AND tgenabled = 'O') <> 2 THEN
    RAISE EXCEPTION 'scope_external_refs write-lock triggers missing or disabled';
  END IF;
END $$;

COMMIT;
