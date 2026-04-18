-- Migration: Upgrade trust_scores to 6D Behavioral Trust Scoring Model
-- Service: ChittyScore (formerly ChittyTrust)
-- Date: 2025-11-08
--
-- Upgrades trust_scores table from simple 3-component model to sophisticated
-- 6D behavioral trust scoring with dimension analysis and output scores

-- ============================================================================
-- STEP 1: Backup existing data (optional - keep old columns for now)
-- ============================================================================

-- Add backup columns to preserve old scoring model during transition
ALTER TABLE trust_scores
  ADD COLUMN IF NOT EXISTS legacy_base_score NUMERIC,
  ADD COLUMN IF NOT EXISTS legacy_history_score NUMERIC,
  ADD COLUMN IF NOT EXISTS legacy_network_score NUMERIC,
  ADD COLUMN IF NOT EXISTS legacy_risk_penalty NUMERIC,
  ADD COLUMN IF NOT EXISTS legacy_final_score NUMERIC;

-- Copy existing data to legacy columns
UPDATE trust_scores
SET
  legacy_base_score = base_score,
  legacy_history_score = history_score,
  legacy_network_score = network_score,
  legacy_risk_penalty = risk_penalty,
  legacy_final_score = final_score;

-- ============================================================================
-- STEP 2: Add 6D Dimension Score Columns
-- ============================================================================

-- Six trust dimensions (each 0-100 scale)
ALTER TABLE trust_scores
  ADD COLUMN IF NOT EXISTS source_dimension NUMERIC(5,2) DEFAULT 0 CHECK (source_dimension >= 0 AND source_dimension <= 100),
  ADD COLUMN IF NOT EXISTS temporal_dimension NUMERIC(5,2) DEFAULT 0 CHECK (temporal_dimension >= 0 AND temporal_dimension <= 100),
  ADD COLUMN IF NOT EXISTS channel_dimension NUMERIC(5,2) DEFAULT 0 CHECK (channel_dimension >= 0 AND channel_dimension <= 100),
  ADD COLUMN IF NOT EXISTS outcome_dimension NUMERIC(5,2) DEFAULT 0 CHECK (outcome_dimension >= 0 AND outcome_dimension <= 100),
  ADD COLUMN IF NOT EXISTS network_dimension NUMERIC(5,2) DEFAULT 0 CHECK (network_dimension >= 0 AND network_dimension <= 100),
  ADD COLUMN IF NOT EXISTS justice_dimension NUMERIC(5,2) DEFAULT 0 CHECK (justice_dimension >= 0 AND justice_dimension <= 100);

-- ============================================================================
-- STEP 3: Add 4 Output Score Columns
-- ============================================================================

ALTER TABLE trust_scores
  ADD COLUMN IF NOT EXISTS people_score NUMERIC(5,2) DEFAULT 0 CHECK (people_score >= 0 AND people_score <= 100),
  ADD COLUMN IF NOT EXISTS legal_score NUMERIC(5,2) DEFAULT 0 CHECK (legal_score >= 0 AND legal_score <= 100),
  ADD COLUMN IF NOT EXISTS state_score NUMERIC(5,2) DEFAULT 0 CHECK (state_score >= 0 AND state_score <= 100),
  ADD COLUMN IF NOT EXISTS chitty_score NUMERIC(5,2) DEFAULT 0 CHECK (chitty_score >= 0 AND chitty_score <= 100);

-- ============================================================================
-- STEP 4: Add Composite Score & Metadata
-- ============================================================================

ALTER TABLE trust_scores
  ADD COLUMN IF NOT EXISTS composite_score NUMERIC(5,2) DEFAULT 0 CHECK (composite_score >= 0 AND composite_score <= 100),
  ADD COLUMN IF NOT EXISTS trust_level VARCHAR(20) DEFAULT 'L0_ANONYMOUS',
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  ADD COLUMN IF NOT EXISTS ai_enhanced BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS insights JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- STEP 5: Update Existing Columns & Add Comments
-- ============================================================================

-- Rename final_score to preserve backward compatibility while adding composite_score
-- (We'll keep both during transition)
COMMENT ON COLUMN trust_scores.composite_score IS 'Weighted average of 6 dimensions (primary trust score)';
COMMENT ON COLUMN trust_scores.source_dimension IS '15% weight - Identity verification and credentials';
COMMENT ON COLUMN trust_scores.temporal_dimension IS '10% weight - Historical consistency and longevity';
COMMENT ON COLUMN trust_scores.channel_dimension IS '15% weight - Communication channel reliability';
COMMENT ON COLUMN trust_scores.outcome_dimension IS '20% weight - Track record of positive outcomes';
COMMENT ON COLUMN trust_scores.network_dimension IS '15% weight - Quality of network connections';
COMMENT ON COLUMN trust_scores.justice_dimension IS '25% weight - Alignment with justice principles';

COMMENT ON COLUMN trust_scores.people_score IS 'Interpersonal trust assessment';
COMMENT ON COLUMN trust_scores.legal_score IS 'Legal system alignment';
COMMENT ON COLUMN trust_scores.state_score IS 'Institutional trust level';
COMMENT ON COLUMN trust_scores.chitty_score IS 'Overall ChittyOS trust rating';

COMMENT ON COLUMN trust_scores.trust_level IS 'ChittyID lifecycle level: L0_ANONYMOUS, L1_BASIC, L2_ENHANCED, L3_PROFESSIONAL, L4_INSTITUTIONAL';
COMMENT ON COLUMN trust_scores.confidence IS 'Confidence in score accuracy (0-100)';
COMMENT ON COLUMN trust_scores.insights IS 'AI-generated trust insights and recommendations';

-- ============================================================================
-- STEP 6: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trust_scores_composite ON trust_scores(composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_trust_scores_trust_level ON trust_scores(trust_level);
CREATE INDEX IF NOT EXISTS idx_trust_scores_chitty_score ON trust_scores(chitty_score DESC);
CREATE INDEX IF NOT EXISTS idx_trust_scores_identity_calculated ON trust_scores(identity_id, calculated_at DESC);

-- ============================================================================
-- STEP 7: Add Calculated At Timestamp (if not exists)
-- ============================================================================

ALTER TABLE trust_scores
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update calculated_at for existing records if NULL
UPDATE trust_scores
SET calculated_at = NOW()
WHERE calculated_at IS NULL;

-- ============================================================================
-- STEP 8: Create trust_events Table for Event History
-- ============================================================================

CREATE TABLE IF NOT EXISTS trust_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'transaction', 'verification', 'endorsement', 'dispute', etc.
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  channel VARCHAR(50), -- 'verified_api', 'blockchain', 'email', etc.
  outcome VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'positive', 'negative', 'neutral', 'pending'
  impact_score NUMERIC(4,2) DEFAULT 1.0 CHECK (impact_score >= 0 AND impact_score <= 10),
  related_identities UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for trust_events
CREATE INDEX IF NOT EXISTS idx_trust_events_identity ON trust_events(identity_id);
CREATE INDEX IF NOT EXISTS idx_trust_events_type ON trust_events(event_type);
CREATE INDEX IF NOT EXISTS idx_trust_events_timestamp ON trust_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trust_events_outcome ON trust_events(outcome);

COMMENT ON TABLE trust_events IS 'Events that affect trust scores - tracked for historical analysis';
COMMENT ON COLUMN trust_events.event_type IS 'Type of event: transaction, verification, endorsement, dispute, collaboration, review, achievement';
COMMENT ON COLUMN trust_events.outcome IS 'Event outcome: positive, negative, neutral, pending';
COMMENT ON COLUMN trust_events.impact_score IS 'How much this event impacts trust (0-10 scale)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Added 6 dimension score columns (source, temporal, channel, outcome, network, justice)
-- ✅ Added 4 output score columns (people, legal, state, chitty)
-- ✅ Added composite_score, trust_level, confidence, ai_enhanced, insights
-- ✅ Created trust_events table for event history tracking
-- ✅ Preserved legacy columns for backward compatibility
-- ✅ Added indexes for performance
-- ✅ Added comprehensive column comments

-- Next Steps:
-- 1. Run chittyschema introspection: npm run introspect
-- 2. Regenerate TypeScript types: npm run generate:types
-- 3. Update ChittyScore Flask app to use new schema
-- 4. Test with demo personas
-- 5. (Optional) Drop legacy columns after confirming migration success:
--    ALTER TABLE trust_scores DROP COLUMN legacy_base_score,
--                              DROP COLUMN legacy_history_score,
--                              DROP COLUMN legacy_network_score,
--                              DROP COLUMN legacy_risk_penalty,
--                              DROP COLUMN legacy_final_score;
