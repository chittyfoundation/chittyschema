-- @canon: chittycanon://gov/governance#core-types
-- Migration: 001_artifact_certifications.sql
-- Database: chittycertify (ChittyCertify worker DB, Tier 1)
-- DO NOT APPLY without operator approval per migration governance.
--
-- Badge records for canon ARTIFACTS (chittycanon:// docs). Distinct from
-- service_certifications (chittyregister). Record-id entity type = A (Authority:
-- certification credential). Idempotent on (artifact_uri, content_hash) for
-- CF Queues at-least-once delivery.

CREATE TABLE IF NOT EXISTS artifact_certifications (
  chitty_id             TEXT PRIMARY KEY,
  artifact_uri          TEXT NOT NULL,
  artifact_namespace    TEXT,
  content_hash          TEXT NOT NULL,
  artifact_type         TEXT NOT NULL,
  artifact_version      TEXT,
  artifact_canon_status TEXT,
  source_pr             TEXT,
  badge_level           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active',
  evaluation_result     JSONB NOT NULL DEFAULT '{}'::jsonb,
  certifier             TEXT NOT NULL DEFAULT 'chittycanon://gov/authority/chittycertify',
  superseded_by         TEXT,
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at            TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  CONSTRAINT artifact_type_valid CHECK (artifact_type IN
    ('policy','spec','procedure','registry','architecture','catalog','summary')),
  CONSTRAINT artifact_canon_status_valid CHECK (artifact_canon_status IS NULL OR artifact_canon_status IN
    ('DRAFT','PENDING','CERTIFIED','CANONICAL','DEPRECATED','ARCHIVED')),
  CONSTRAINT badge_level_valid CHECK (badge_level IN
    ('Compatible','Compliant','Certified','Canonical')),
  CONSTRAINT artifact_status_valid CHECK (status IN
    ('active','pending','revoked','superseded')),
  CONSTRAINT artifact_uri_hash_uniq UNIQUE (artifact_uri, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_artifact_certifications_uri
  ON artifact_certifications (artifact_uri);
CREATE INDEX IF NOT EXISTS idx_artifact_certifications_status
  ON artifact_certifications (status);
CREATE INDEX IF NOT EXISTS idx_artifact_certifications_uri_latest
  ON artifact_certifications (artifact_uri, evaluated_at DESC)
  WHERE deleted_at IS NULL AND status IN ('active','pending');

CREATE OR REPLACE FUNCTION update_artifact_cert_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_artifact_certifications_updated_at ON artifact_certifications;
CREATE TRIGGER trg_artifact_certifications_updated_at
  BEFORE UPDATE ON artifact_certifications
  FOR EACH ROW EXECUTE FUNCTION update_artifact_cert_updated_at();

COMMENT ON TABLE artifact_certifications IS
  'Badge records for canon ARTIFACTS (chittycanon:// docs). Owned by chittycertify. Distinct from service_certifications (chittyregister). @canon: chittycanon://docs/ops/policy/chitty-certify-charter';
COMMENT ON COLUMN artifact_certifications.chitty_id IS
  'Record ChittyID, format VV-G-LLL-SSSS-A-YM-C-X. Entity type A=Authority (certification credential), per chittycanon://gov/governance#core-types.';
COMMENT ON COLUMN artifact_certifications.status IS
  'Record award-state: active|pending|revoked|superseded. NOT artifact canon doc-status (see artifact_canon_status).';
