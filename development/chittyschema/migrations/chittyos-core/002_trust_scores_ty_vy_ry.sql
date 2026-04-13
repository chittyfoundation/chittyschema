-- Migration: Replace old scoring model with TY/VY/RY
-- Service: ChittyScore v2.0.0
-- Model: TY-VY-RY White Paper v2.1
-- Date: 2026-03-23
--
-- Per the white paper, the DRL is "reckoning, not record" — computed at
-- query time from ledger entries. This table caches the most recent
-- reckoning for each entity so downstream consumers can read without
-- triggering a full reckoning.
--
-- NOTE: Do NOT apply 001_upgrade_trust_scores_to_6d.sql — that migration
-- is superseded by this one. The 6D model was never the canonical model.

-- ============================================================================
-- STEP 1: Add TY/VY/RY columns
-- ============================================================================

ALTER TABLE trust_scores
  ADD COLUMN IF NOT EXISTS ty_score NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vy_score NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ry_score NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signal_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reckoned_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS anchor_tx_hash VARCHAR(66);

-- ============================================================================
-- STEP 2: Add indexes for common query patterns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trust_scores_ty ON trust_scores(ty_score DESC);
CREATE INDEX IF NOT EXISTS idx_trust_scores_reckoned ON trust_scores(reckoned_at DESC);

-- ============================================================================
-- STEP 3: Add column comments
-- ============================================================================

COMMENT ON COLUMN trust_scores.ty_score IS 'TY — idenTitY / ontological identity (0-1), per TY-VY-RY White Paper v2.1';
COMMENT ON COLUMN trust_scores.vy_score IS 'VY — connectiVitY / behavioral record and network experience (0-1)';
COMMENT ON COLUMN trust_scores.ry_score IS 'RY — authoRitY / earned, revocable authority (0-1)';
COMMENT ON COLUMN trust_scores.signal_count IS 'Number of ledger signals used in most recent reckoning';
COMMENT ON COLUMN trust_scores.reckoned_at IS 'Timestamp of most recent DRL reckoning';
COMMENT ON COLUMN trust_scores.anchor_tx_hash IS 'ChittyChain tx hash if reckoning was Hard-Minted';

-- ============================================================================
-- NOTE: Old columns (base_score, history_score, network_score, risk_penalty,
-- final_score) are kept for now. Drop them in a future migration once all
-- consumers have been updated to use TY/VY/RY.
-- ============================================================================
