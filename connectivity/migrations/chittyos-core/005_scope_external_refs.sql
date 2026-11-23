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
-- The table is created LOCKED: row level security is enabled and forced, and
-- no policy is created. Every role without BYPASSRLS (including the table
-- owner, because of FORCE) sees zero rows and cannot insert. Space policies
-- are added by a later migration, after the canon amendment that defines how
-- the database learns a writer's space (matter-scope write gate item 1).
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
-- No policy on purpose. See header.

COMMENT ON TABLE scope_external_refs IS
  'External references for scopes (chittycanon://specs/matter-scope rule 9). Written only on operator confirmation. Locked by forced RLS with no policy until space policies land.';
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
END $$;

COMMIT;
