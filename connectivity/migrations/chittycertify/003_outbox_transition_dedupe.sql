-- @canon: chittycanon://gov/governance#core-types
-- Migration: 003_outbox_transition_dedupe.sql
-- Database: chittycertify
-- Authoring repo: CHITTYFOUNDATION/chittyschema
--
-- Closes the duplicate-ledger-event race left open by 002 + the chittycertify
-- effective-badge fix (chittyfoundation/chittycertify#6, third review pass).
--
-- WHY THIS CANNOT BE FIXED IN THE STATEMENT
--
-- The outbox insert is gated on previous_badge_level IS DISTINCT FROM badge_level.
-- Two requirements pull that baseline in opposite directions:
--
--   * Effective-badge correctness (cross-content-hash) needs the baseline to come
--     from the `prior` CTE -- the latest live row across ALL hashes -- because
--     re-evaluating an older hash can flip the artifact's effective badge while
--     that row's own badge is unchanged. Sourcing it from the row itself silently
--     drops that transition. That was issue #6, found by review pass 1.
--
--   * Race suppression needs the baseline re-read from the LOCKED target tuple.
--     Postgres re-evaluates ON CONFLICT DO UPDATE against the locked row, so
--     `artifact_certifications.badge_level` sees the winner's committed write and
--     the loser's transition correctly collapses to a no-op. But EXCLUDED is the
--     PROPOSED tuple -- computed once from the source SELECT, against the loser's
--     own pre-lock snapshot -- and is NOT recomputed after the lock is taken. So
--     sourcing from `prior` (via EXCLUDED) writes a stale baseline, the gate passes
--     a second time, and one transition yields TWO immutable ledger events.
--
-- They are not simultaneously satisfiable in one statement. Rather than trade one
-- defect for the other -- which is exactly what the first two review passes did to
-- each other -- make the duplicate unrepresentable in the schema.
--
-- DO NOT APPLY without operator approval per migration governance.
-- Gate: apply and verify on a Neon branch before this merges.

BEGIN;

-- One un-emitted row per (certification, content hash, transition).
--
-- Partial, on purpose: it bounds only obligations not yet handed to ChittyLedger.
-- A legitimate repeat of the same transition later (A -> B, B -> A, A -> B again)
-- is still recorded, because by then the earlier row is 'emitted' or 'failed' and
-- falls outside the index.
--
-- NULLS NOT DISTINCT is load-bearing (PG15+). previous_badge is NULL for a first
-- award and new_badge is NULL for a revocation; under default NULL semantics two
-- such rows would compare as distinct and the index would not bind on precisely
-- the first-award race.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cert_outbox_unique_open_transition
  ON certification_ledger_outbox (cert_chitty_id, content_hash, previous_badge, new_badge)
  NULLS NOT DISTINCT
  WHERE status IN ('pending', 'claimed');

COMMENT ON INDEX idx_cert_outbox_unique_open_transition IS
  'At most one UN-EMITTED outbox row per (certification, content_hash, transition). Paired with ON CONFLICT DO NOTHING on the outbox insert so a concurrent writer that loses the row lock cannot mint a second immutable ChittyLedger event for one badge change. Partial so the same transition may legitimately recur once the earlier obligation has drained. See chittyfoundation/chittycertify#6.';

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run on the Neon branch; paste results in the PR)
-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Index exists and is partial + NULLS NOT DISTINCT:
--    SELECT indexdef FROM pg_indexes WHERE indexname='idx_cert_outbox_unique_open_transition';
--
-- 2. Duplicate open transition is rejected (both NULL and non-NULL previous_badge):
--    two inserts of the same (cert, hash, prev, new) -> second must violate.
--
-- 3. Repeat after drain is still allowed:
--    insert, mark 'emitted', insert the same transition again -> must succeed.
--
-- ROLLBACK:
--    DROP INDEX IF EXISTS idx_cert_outbox_unique_open_transition;
