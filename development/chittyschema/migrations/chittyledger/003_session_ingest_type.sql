-- 003_session_ingest_type.sql
-- Add SESSION_INGEST event type for ch1tty session log ingestion pipeline
--
-- SESSION_INGEST records that a batch of session transcripts was ingested
-- into the ledger from a local buffer. Distinct from SESSION_START/END
-- (individual session lifecycle) and SESSION_MERGE (concurrent session merge).
--
-- @canon chittycanon://gov/governance#core-types

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'SESSION_INGEST';
