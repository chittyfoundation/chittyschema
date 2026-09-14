-- @canon: chittycanon://gov/governance#core-types
-- Migration: 002_certification_ledger_outbox.sql
-- Database: chittycertify
-- Authoring repo: CHITTYFOUNDATION/chittyschema
--   (Schema Owner Manifest, GET https://schema.chitty.cc/api/owners:
--    table artifact_certifications -> database chittycertify, service chittycertify,
--    repo CHITTYFOUNDATION/chittyschema,
--    authoringFile connectivity/migrations/chittycertify/001_artifact_certifications.sql,
--    canonType A, stewards @chittyfoundation/certify)
-- Target path: connectivity/migrations/chittycertify/002_certification_ledger_outbox.sql
--
-- Closes: chittyfoundation/chittycertify#6 — a badge transition can be committed
-- to artifact_certifications while its ChittyLedger event is never emitted, and
-- the retry then computes badge_changed=false and acks the message as a success.
--
-- Mechanism: transactional outbox. The ledger obligation is written in the SAME
-- atomic unit as the badge write, so a failed emit is a pending row, not a lost
-- event. Emission moves out of the request path entirely.
--
-- DO NOT APPLY without operator approval per migration governance.
-- Gate: apply and verify on a Neon branch of the chittycertify project before
-- the chittyschema PR merges (see verification block at the foot of this file).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. badge_level must be able to represent "evaluated, no badge awarded".
--
-- Migration 001 declares badge_level TEXT NOT NULL with a four-value CHECK.
-- src/lib/certify.js:140-144 produces badgeLevel = null with status='pending'
-- whenever an artifact fails the Compatible rung, so that INSERT throws a
-- NOT NULL violation today and the pending path cannot persist at all.
--
-- This is in scope for #6 rather than a separate ticket because the entire
-- transition model — previousBadge, badgeChangeAction(prev,next), and the
-- outbox gate below — is written around nullable badges. Shipping the outbox
-- onto a schema that cannot represent a null badge leaves it incoherent.
-- Flagged explicitly as a deliberate scope widening.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE artifact_certifications
  ALTER COLUMN badge_level DROP NOT NULL;

ALTER TABLE artifact_certifications
  DROP CONSTRAINT IF EXISTS badge_level_valid;

ALTER TABLE artifact_certifications
  ADD CONSTRAINT badge_level_valid CHECK (
    badge_level IS NULL
    OR badge_level IN ('Compatible', 'Compliant', 'Certified', 'Canonical')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. previous_badge_level — the pre-transition badge, written atomically with
--    the transition itself.
--
-- This is what lets the outbox INSERT decide "did the badge change?" inside the
-- same statement, from values the statement itself produced, instead of from a
-- separate read that a retry will recompute differently. It is also what closes
-- the concurrency hole: on the ON CONFLICT path Postgres re-reads the locked,
-- latest tuple, so a concurrent loser sees the winner's badge here and its
-- transition collapses to a no-op.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE artifact_certifications
  ADD COLUMN IF NOT EXISTS previous_badge_level TEXT;

ALTER TABLE artifact_certifications
  DROP CONSTRAINT IF EXISTS previous_badge_level_valid;

ALTER TABLE artifact_certifications
  ADD CONSTRAINT previous_badge_level_valid CHECK (
    previous_badge_level IS NULL
    OR previous_badge_level IN ('Compatible', 'Compliant', 'Certified', 'Canonical')
  );

COMMENT ON COLUMN artifact_certifications.previous_badge_level IS
  'badge_level immediately before the most recent WRITE to this row (not necessarily the most recent transition: a no-op re-evaluation overwrites it with the current badge). Written in the same statement as the write and read by the outbox gate in that statement. Transition scratch, NOT history: the immutable transition history lives in ChittyLedger and must never be inferred from this mutable row. @canon: chittycanon://gov/governance#core-types';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. certification_ledger_outbox — the durable ledger obligation.
--
-- One row = one badge transition that ChittyLedger owes an immutable event for.
-- Rows are inserted only by the data-modifying CTEs in src/lib/database.js
-- (upsertArtifactCertificationWithOutbox / revokeCertificationsWithOutbox),
-- never on their own, and are drained by the scheduled() handler.
--
-- Deliberately stores SEMANTIC fields, not a rendered ChittyLedger body: the
-- substrate value in src/lib/ledger.js:62-66 is a documented placeholder
-- (VALID_SUBSTRATES has no service-emitted value yet). Freezing a rendered body
-- into rows that may drain days later would persist the wrong substrate; letting
-- the drain call the existing body-builder means the fix applies retroactively
-- to every undrained row.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certification_ledger_outbox (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subject of the event: the artifact certification, entity type A (Authority).
  -- @canon: chittycanon://gov/governance#core-types
  cert_chitty_id     TEXT NOT NULL,
  artifact_uri       TEXT NOT NULL,
  content_hash       TEXT NOT NULL,

  previous_badge     TEXT,
  new_badge          TEXT,
  award_status       TEXT NOT NULL,
  source_pr          TEXT,

  -- Idempotency key sent to ChittyLedger as RawEventInput.event_id. Minted once
  -- at outbox-insert time and stable across every drain retry, so a lost HTTP
  -- response replays the SAME event identity rather than a fresh one.
  -- See the cross-service note at the foot of this file.
  ledger_event_id    UUID NOT NULL DEFAULT gen_random_uuid(),

  status             TEXT NOT NULL DEFAULT 'pending',
  attempts           INTEGER NOT NULL DEFAULT 0,
  last_error         TEXT,
  next_attempt_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at         TIMESTAMPTZ,

  emitted_at         TIMESTAMPTZ,
  ledger_event_hash  TEXT,
  ledger_sequence    BIGINT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cert_outbox_status_valid CHECK (
    status IN ('pending', 'claimed', 'emitted', 'failed')
  ),
  CONSTRAINT cert_outbox_badge_valid CHECK (
    (previous_badge IS NULL OR previous_badge IN ('Compatible','Compliant','Certified','Canonical'))
    AND (new_badge IS NULL OR new_badge IN ('Compatible','Compliant','Certified','Canonical'))
  ),
  -- An outbox row IS a transition. A row whose badges match is a bug, not an event.
  CONSTRAINT cert_outbox_is_a_transition CHECK (previous_badge IS DISTINCT FROM new_badge),
  CONSTRAINT cert_outbox_award_status_valid CHECK (
    award_status IN ('active', 'pending', 'revoked', 'superseded')
  ),

  -- DEFERRABLE: the outbox row and the artifact_certifications row it references
  -- are inserted by sibling CTEs of one statement. Deferring the RI check to
  -- commit removes any dependence on intra-statement trigger ordering.
  CONSTRAINT cert_outbox_cert_fk FOREIGN KEY (cert_chitty_id)
    REFERENCES artifact_certifications (chitty_id)
    DEFERRABLE INITIALLY DEFERRED
);

-- Drain scan: due rows, oldest first. Covers 'claimed' so a row orphaned by a
-- worker that died mid-flight is re-claimed once its visibility timeout lapses.
CREATE INDEX IF NOT EXISTS idx_cert_outbox_due
  ON certification_ledger_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'claimed');

CREATE UNIQUE INDEX IF NOT EXISTS idx_cert_outbox_ledger_event_id
  ON certification_ledger_outbox (ledger_event_id);

CREATE INDEX IF NOT EXISTS idx_cert_outbox_cert
  ON certification_ledger_outbox (cert_chitty_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cert_outbox_failed
  ON certification_ledger_outbox (created_at DESC)
  WHERE status = 'failed';

DROP TRIGGER IF EXISTS trg_cert_outbox_updated_at ON certification_ledger_outbox;
CREATE TRIGGER trg_cert_outbox_updated_at
  BEFORE UPDATE ON certification_ledger_outbox
  FOR EACH ROW EXECUTE FUNCTION update_artifact_cert_updated_at();

COMMENT ON TABLE certification_ledger_outbox IS
  'Transactional outbox for ChittyLedger badge-transition events. One row = one owed immutable event. Inserted in the same atomic statement as the artifact_certifications transition; drained by the chittycertify scheduled() handler. Owned by chittycertify. Closes chittyfoundation/chittycertify#6.';
COMMENT ON COLUMN certification_ledger_outbox.ledger_event_id IS
  'Sent to ChittyLedger POST /v1/events as RawEventInput.event_id. Stable across drain retries so the ledger can dedupe a replayed emit. Requires ChittyLedger to enforce uniqueness on event_id — see the open cross-service question on chittycertify#6.';
COMMENT ON COLUMN certification_ledger_outbox.status IS
  'pending -> claimed -> emitted, or -> failed after the attempt ceiling. failed rows are operator-visible via GET /api/v1/outbox and are never silently dropped.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Correct the ChittyID format in the 001 column comment.
--    001 documents VV-G-LLL-SSSS-A-YM-C-X. The canonical format is
--    VV-G-LLL-SSSS-T-YYMM-C-XX (segment 6 is YYMM, segment 8 is XX), verified
--    against live-minted IDs and the chittyid compliance triad. A validator
--    built on the YM/X variant rejects real production IDs.
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON COLUMN artifact_certifications.chitty_id IS
  'Record ChittyID, format VV-G-LLL-SSSS-T-YYMM-C-XX with T=A (Authority: certification credential), minted by POST id.chitty.cc/mint {entityType:"A"}. @canon: chittycanon://gov/governance#core-types';

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run on the Neon branch after applying; paste results in the PR)
-- ═════════════════════════════════════════════════════════════════════════════
--
-- 1. badge_level is now nullable and the CHECK admits NULL:
--    SELECT is_nullable FROM information_schema.columns
--     WHERE table_name='artifact_certifications' AND column_name='badge_level';
--    -- expect: YES
--
-- 2. Outbox shape:
--    SELECT column_name, data_type, is_nullable FROM information_schema.columns
--     WHERE table_name='certification_ledger_outbox' ORDER BY ordinal_position;
--
-- 3. The transition invariant rejects a non-transition:
--    INSERT INTO certification_ledger_outbox
--      (cert_chitty_id, artifact_uri, content_hash, previous_badge, new_badge, award_status)
--    VALUES ('<a real chitty_id>', 'chittycanon://docs/ops/policy/x', 'h', 'Compliant', 'Compliant', 'active');
--    -- expect: ERROR violates cert_outbox_is_a_transition
--
-- 4. End-to-end: run upsertArtifactCertificationWithOutbox twice with the SAME
--    inputs. First call -> outbox_id non-null, badge_changed true.
--    Second call -> outbox_id NULL, badge_changed false, and
--    SELECT count(*) FROM certification_ledger_outbox WHERE artifact_uri=...
--    stays at 1. This is the exact #6 regression.
--
-- ROLLBACK (forward-only preferred; this is the emergency path only, and it
-- DISCARDS undrained ledger obligations — drain to empty first):
--    DROP TABLE IF EXISTS certification_ledger_outbox;
--    ALTER TABLE artifact_certifications DROP COLUMN IF EXISTS previous_badge_level;
--    -- badge_level NOT NULL is NOT restored: rows with a null badge may exist.
