-- ChittyLedger: Universal Immutable Ledger Schema
-- Managed by chittyschema - DO NOT edit in service repos
-- Created: 2025-01-06
-- Source of Truth: chittyschema/migrations/chittyledger/
--
-- PURPOSE: Single source of truth for ALL append-only, immutable records:
--   - Legal evidence and case management
--   - Financial transactions and billing
--   - Event logging and system audit trails
--   - Blockchain records and cryptographic proofs

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS - Legal Classification System
-- =============================================================================

-- Evidence Tiers (admissibility hierarchy)
CREATE TYPE evidence_tier AS ENUM (
    'SELF_AUTHENTICATING',
    'GOVERNMENT',
    'FINANCIAL_INSTITUTION',
    'INDEPENDENT_THIRD_PARTY',
    'BUSINESS_RECORDS',
    'FIRST_PARTY_ADVERSE',
    'FIRST_PARTY_FRIENDLY',
    'UNCORROBORATED_PERSON'
);

-- Evidence Types
CREATE TYPE evidence_type AS ENUM (
    'Document',
    'Image',
    'Communication',
    'Financial Record',
    'Legal Filing',
    'Physical Evidence'
);

-- User Types (role-based access)
CREATE TYPE user_type AS ENUM (
    'PARTY_PETITIONER',
    'PARTY_RESPONDENT',
    'ATTORNEY_PETITIONER',
    'ATTORNEY_RESPONDENT',
    'COURT_OFFICER',
    'EXPERT_WITNESS'
);

-- Case Types
CREATE TYPE case_type AS ENUM (
    'DIVORCE',
    'CUSTODY',
    'CIVIL',
    'CRIMINAL',
    'PROBATE'
);

-- Fact Types (atomic fact classification)
CREATE TYPE fact_type AS ENUM (
    'DATE',
    'AMOUNT',
    'ADMISSION',
    'IDENTITY',
    'LOCATION',
    'RELATIONSHIP',
    'ACTION',
    'STATUS'
);

-- Classification Levels (evidence strength)
CREATE TYPE classification_level AS ENUM (
    'FACT',
    'SUPPORTED_CLAIM',
    'ASSERTION',
    'ALLEGATION',
    'CONTRADICTION'
);

-- =============================================================================
-- USERS TABLE - Identity and Access Management
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number TEXT UNIQUE NOT NULL DEFAULT 'REG' || lpad((random() * 99999999)::text, 8, '0'),
    user_type user_type NOT NULL,
    full_name TEXT NOT NULL,
    bar_number TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    verified_status BOOLEAN DEFAULT false,
    trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    two_fa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_registration_number ON users(registration_number);
CREATE INDEX idx_users_user_type ON users(user_type);

COMMENT ON TABLE users IS 'ChittyLedger: Legal case participants and system users';

-- =============================================================================
-- CASES TABLE - Legal Case Management
-- =============================================================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT UNIQUE NOT NULL, -- Format: {JURISDICTION}-{YEAR}-{TYPE}-{NUMBER}
    jurisdiction TEXT NOT NULL,
    case_number TEXT NOT NULL,
    case_type case_type NOT NULL,
    filing_date DATE NOT NULL,
    judge_assigned TEXT,
    case_status TEXT DEFAULT 'Active' CHECK (case_status IN ('Active', 'Stayed', 'Closed', 'Appeal')),
    key_dates JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cases_case_id ON cases(case_id);
CREATE INDEX idx_cases_jurisdiction ON cases(jurisdiction);
CREATE INDEX idx_cases_case_type ON cases(case_type);
CREATE INDEX idx_cases_case_status ON cases(case_status);

COMMENT ON TABLE cases IS 'ChittyLedger: Legal cases and court proceedings';

-- =============================================================================
-- CASE PARTIES TABLE - Party-to-Case Relationships
-- =============================================================================
CREATE TABLE case_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('petitioner', 'respondent', 'attorney_petitioner', 'attorney_respondent', 'witness', 'court_officer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(case_id, user_id, role)
);

CREATE INDEX idx_case_parties_case_id ON case_parties(case_id);
CREATE INDEX idx_case_parties_user_id ON case_parties(user_id);

-- =============================================================================
-- EVIDENCE TABLE - Master Evidence Repository
-- =============================================================================
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id TEXT UNIQUE NOT NULL, -- Human-readable identifier
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    evidence_type evidence_type NOT NULL,
    evidence_tier evidence_tier NOT NULL,
    file_path TEXT,
    file_hash TEXT, -- SHA-256 hash for integrity
    file_size INTEGER,
    mime_type TEXT,
    trust_score DECIMAL(5,2) DEFAULT 0.0 CHECK (trust_score >= 0 AND trust_score <= 100),
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'disputed')),
    blockchain_hash TEXT, -- For immutable audit trail
    blockchain_minted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_artifact_id ON evidence(artifact_id);
CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX idx_evidence_evidence_tier ON evidence(evidence_tier);
CREATE INDEX idx_evidence_verification_status ON evidence(verification_status);
CREATE INDEX idx_evidence_file_hash ON evidence(file_hash);

COMMENT ON TABLE evidence IS 'ChittyLedger: Court-admissible evidence repository';

-- =============================================================================
-- CHAIN OF CUSTODY TABLE - Immutable Evidence Tracking
-- =============================================================================
CREATE TABLE chain_of_custody (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('upload', 'view', 'download', 'modify', 'verify', 'mint', 'transfer', 'dispute')),
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ip_address INET,
    user_agent TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chain_of_custody_evidence_id ON chain_of_custody(evidence_id);
CREATE INDEX idx_chain_of_custody_performed_by ON chain_of_custody(performed_by);
CREATE INDEX idx_chain_of_custody_timestamp ON chain_of_custody(timestamp DESC);

COMMENT ON TABLE chain_of_custody IS 'ChittyLedger: Immutable audit trail for evidence handling';

-- =============================================================================
-- ATOMIC FACTS TABLE - Extracted Facts from Evidence
-- =============================================================================
CREATE TABLE atomic_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    fact_type fact_type NOT NULL,
    fact_content TEXT NOT NULL,
    classification classification_level NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    source_page INTEGER,
    source_location TEXT, -- JSON path or coordinates
    extracted_by TEXT, -- 'ai' or user_id
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_atomic_facts_evidence_id ON atomic_facts(evidence_id);
CREATE INDEX idx_atomic_facts_fact_type ON atomic_facts(fact_type);
CREATE INDEX idx_atomic_facts_classification ON atomic_facts(classification);

COMMENT ON TABLE atomic_facts IS 'ChittyLedger: AI-extracted atomic facts from evidence documents';

-- =============================================================================
-- CONTRADICTIONS TABLE - Fact Contradiction Tracking
-- =============================================================================
CREATE TABLE contradictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_a_id UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
    fact_b_id UUID NOT NULL REFERENCES atomic_facts(id) ON DELETE CASCADE,
    contradiction_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
    explanation TEXT,
    detected_by TEXT, -- 'ai' or user_id
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    CONSTRAINT no_self_contradiction CHECK (fact_a_id != fact_b_id),
    CONSTRAINT ordered_facts CHECK (fact_a_id < fact_b_id)
);

CREATE INDEX idx_contradictions_fact_a_id ON contradictions(fact_a_id);
CREATE INDEX idx_contradictions_fact_b_id ON contradictions(fact_b_id);
CREATE INDEX idx_contradictions_severity ON contradictions(severity);
CREATE INDEX idx_contradictions_resolved ON contradictions(resolved);

COMMENT ON TABLE contradictions IS 'ChittyLedger: Detected contradictions between atomic facts';

-- =============================================================================
-- AUDIT LOG TABLE - System-Wide Audit Trail
-- =============================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'case', 'evidence', 'user', etc.
    entity_id UUID,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);

COMMENT ON TABLE audit_log IS 'ChittyLedger: System-wide immutable audit trail';

-- =============================================================================
-- UPDATE TRIGGERS - Automatic timestamp management
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON evidence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FINANCIAL LEDGER - Transaction and Billing Records
-- =============================================================================

-- Transaction Types
CREATE TYPE transaction_type AS ENUM (
    'PAYMENT',
    'REFUND',
    'INVOICE',
    'SUBSCRIPTION',
    'CREDIT',
    'DEBIT',
    'FEE',
    'ADJUSTMENT'
);

-- Transaction Status
CREATE TYPE transaction_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'DISPUTED',
    'REFUNDED'
);

-- Financial Transactions Table
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id TEXT UNIQUE NOT NULL, -- Human-readable: TXN-YYYY-XXXXXX
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status transaction_status DEFAULT 'PENDING' NOT NULL,
    payment_method TEXT, -- 'stripe', 'paypal', 'wire', 'check'
    payment_provider_id TEXT, -- Stripe charge ID, PayPal transaction ID, etc.
    payment_provider_response JSONB,
    description TEXT,
    invoice_url TEXT,
    receipt_url TEXT,
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_transactions_transaction_id ON financial_transactions(transaction_id);
CREATE INDEX idx_financial_transactions_user_id ON financial_transactions(user_id);
CREATE INDEX idx_financial_transactions_case_id ON financial_transactions(case_id);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_created_at ON financial_transactions(created_at DESC);

COMMENT ON TABLE financial_transactions IS 'ChittyLedger: Immutable financial transaction ledger';

-- Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void')),
    due_date DATE,
    paid_date DATE,
    line_items JSONB NOT NULL, -- Array of {description, amount, quantity}
    notes TEXT,
    payment_link TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

COMMENT ON TABLE invoices IS 'ChittyLedger: Invoice records for billing';

-- =============================================================================
-- EVENT LEDGER - System-Wide Event Logging
-- =============================================================================

-- Event Types
CREATE TYPE event_type AS ENUM (
    'USER_ACTION',
    'SYSTEM_EVENT',
    'API_CALL',
    'SERVICE_INTERACTION',
    'ERROR',
    'SECURITY',
    'AUDIT',
    'INTEGRATION'
);

-- Event Severity
CREATE TYPE event_severity AS ENUM (
    'DEBUG',
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL'
);

-- Event Ledger Table
CREATE TABLE event_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT UNIQUE NOT NULL, -- Human-readable: EVT-YYYY-XXXXXX
    event_type event_type NOT NULL,
    event_severity event_severity DEFAULT 'INFO' NOT NULL,
    service_name TEXT NOT NULL, -- 'chittyid', 'chittyauth', 'chittyverify', etc.
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT, -- 'identity', 'evidence', 'case', 'transaction', etc.
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT, -- For tracing across services
    session_id TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_ledger_event_id ON event_ledger(event_id);
CREATE INDEX idx_event_ledger_event_type ON event_ledger(event_type);
CREATE INDEX idx_event_ledger_service_name ON event_ledger(service_name);
CREATE INDEX idx_event_ledger_user_id ON event_ledger(user_id);
CREATE INDEX idx_event_ledger_entity_type_id ON event_ledger(entity_type, entity_id);
CREATE INDEX idx_event_ledger_timestamp ON event_ledger(timestamp DESC);
CREATE INDEX idx_event_ledger_request_id ON event_ledger(request_id);

COMMENT ON TABLE event_ledger IS 'ChittyLedger: Immutable event log for all ChittyOS services';

-- =============================================================================
-- BLOCKCHAIN LEDGER - Cryptographic Proofs and Minting Records
-- =============================================================================

-- Blockchain Networks
CREATE TYPE blockchain_network AS ENUM (
    'ETHEREUM_MAINNET',
    'ETHEREUM_SEPOLIA',
    'POLYGON',
    'BASE',
    'LOCAL_TESTNET'
);

-- Blockchain Records Table
CREATE TABLE blockchain_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id TEXT UNIQUE NOT NULL,
    blockchain_network blockchain_network NOT NULL,
    transaction_hash TEXT UNIQUE NOT NULL,
    block_number BIGINT,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    contract_address TEXT,
    from_address TEXT NOT NULL,
    to_address TEXT,
    gas_used BIGINT,
    gas_price BIGINT,
    entity_type TEXT NOT NULL, -- 'evidence', 'credential', 'verification'
    entity_id UUID NOT NULL,
    metadata_uri TEXT, -- IPFS or Arweave URI
    metadata_hash TEXT, -- SHA-256 of metadata
    proof_data JSONB,
    minted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blockchain_records_transaction_hash ON blockchain_records(transaction_hash);
CREATE INDEX idx_blockchain_records_entity_type_id ON blockchain_records(entity_type, entity_id);
CREATE INDEX idx_blockchain_records_blockchain_network ON blockchain_records(blockchain_network);
CREATE INDEX idx_blockchain_records_minted_by ON blockchain_records(minted_by);

COMMENT ON TABLE blockchain_records IS 'ChittyLedger: Blockchain transaction records and cryptographic proofs';

-- =============================================================================
-- API USAGE LEDGER - API Call Tracking and Rate Limiting
-- =============================================================================

CREATE TABLE api_usage_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    api_key_hash TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_usage_ledger_user_id ON api_usage_ledger(user_id);
CREATE INDEX idx_api_usage_ledger_endpoint ON api_usage_ledger(endpoint);
CREATE INDEX idx_api_usage_ledger_timestamp ON api_usage_ledger(timestamp DESC);
CREATE INDEX idx_api_usage_ledger_api_key_hash ON api_usage_ledger(api_key_hash);

COMMENT ON TABLE api_usage_ledger IS 'ChittyLedger: API usage tracking for rate limiting and analytics';

-- =============================================================================
-- SUBSCRIPTION LEDGER - Subscription and Billing Cycle Tracking
-- =============================================================================

CREATE TYPE subscription_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'CANCELLED',
    'EXPIRED',
    'TRIAL'
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    plan_name TEXT NOT NULL,
    plan_price DECIMAL(12,2) NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual', 'one-time')),
    status subscription_status DEFAULT 'TRIAL' NOT NULL,
    stripe_subscription_id TEXT,
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    trial_start DATE,
    trial_end DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_subscription_id ON subscriptions(subscription_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

COMMENT ON TABLE subscriptions IS 'ChittyLedger: Subscription lifecycle tracking';

-- =============================================================================
-- UPDATE TRIGGERS - Extend to new tables
-- =============================================================================

CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
