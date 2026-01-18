-- ============================================================================
-- Migration: ChittyCanon Initial Ontology Schema
-- Database: chittycanon (ChittyFoundation Ontology & Standards Registry)
-- Author: ChittyFoundation
-- Date: 2026-01-17
-- ============================================================================
--
-- PURPOSE: Foundation ontology governance database
--   - Ontology term lifecycle (PROPOSED → SIMULATED → PROVISIONAL → PROVEN → CANONICAL)
--   - External standards registry (ChittyStandards)
--   - Alignment mapping and divergence tracking
--   - TY VY RY scoring for external authorities
--
-- INTEGRATION: Uses Neon Auth (neon_auth schema) for authentication
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS - Ontology Classification System
-- =============================================================================

-- Term lifecycle stages
CREATE TYPE term_stage AS ENUM (
    'proposed',
    'simulated',
    'provisional',
    'proven',
    'canonical',
    'deprecated',
    'archived'
);

-- Term categories (grammatical alignment)
CREATE TYPE term_category AS ENUM (
    'core_type',           -- Singular nouns: Entity, Event, Place
    'characterization',    -- Descriptive: verified, trusted, disputed
    'aspect',              -- TY VY RY: identity, connectivity, authority
    'relationship',        -- Connections: linked_to, derived_from
    'action'               -- Verbs: verify, mint, attest
);

-- Alignment types for mapping to external standards
CREATE TYPE alignment_type AS ENUM (
    'aligned',             -- Our term matches external term
    'extended',            -- We extend the external concept
    'mapped',              -- Different name, same concept
    'diverged',            -- Intentional difference documented
    'unique'               -- No external equivalent
);

-- Divergence types
CREATE TYPE divergence_type AS ENUM (
    'defensive',           -- Avoid broken/declining standards
    'leadership',          -- Introduce better patterns
    'conflict',            -- Oppose standards that violate principles
    'strategic'            -- Differentiate for competitive advantage
);

-- Authority basis for external sources
CREATE TYPE authority_basis AS ENUM (
    'treaty',              -- International treaty/law
    'industry',            -- Industry consortium
    'community',           -- Open community
    'corporate',           -- Single corporation
    'academic'             -- Academic institution
);

-- Global reach for external sources
CREATE TYPE global_reach AS ENUM (
    'global',
    'regional',
    'national',
    'niche'
);

-- Confusion detection types
CREATE TYPE confusion_type AS ENUM (
    'ai',                  -- AI uses term inconsistently
    'human',               -- Humans misunderstand
    'cross_org'            -- Different orgs use differently
);

-- Leadership initiative stages
CREATE TYPE initiative_stage AS ENUM (
    'internal',            -- Used only internally
    'published',           -- Whitepaper/spec published
    'proposing',           -- Submitted to standards body
    'adopted'              -- Adopted by external org
);

-- =============================================================================
-- ONTOLOGY TERMS TABLE - Core Term Registry
-- =============================================================================
CREATE TABLE ontology_terms (
    term_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    definition TEXT NOT NULL,
    domain TEXT[] NOT NULL,              -- e.g., ['legal', 'identity', 'trust']
    category term_category,

    -- Lifecycle
    stage term_stage NOT NULL DEFAULT 'proposed',
    proposed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    simulated_at TIMESTAMP WITH TIME ZONE,
    provisional_at TIMESTAMP WITH TIME ZONE,
    proven_at TIMESTAMP WITH TIME ZONE,
    canonical_at TIMESTAMP WITH TIME ZONE,

    -- Simulation results
    simulation_scores JSONB,             -- {uniqueness, independence, differentiation, necessity, coherence}
    simulation_composite DECIMAL(3,2),   -- Composite score 0.00-1.00
    simulation_passed BOOLEAN,
    simulation_feedback TEXT,

    -- Provisional observation
    usage_count INTEGER DEFAULT 0,
    stability_score DECIMAL(3,2),        -- 0.00-1.00
    consistency_score DECIMAL(3,2),      -- 0.00-1.00
    confusion_score DECIMAL(3,2),        -- 0.00-1.00 (lower is better)
    error_rate DECIMAL(3,2),             -- 0.00-1.00 (lower is better)

    -- Documentation
    gap_filled TEXT NOT NULL,            -- What need this addresses
    not_for TEXT[],                      -- What this is NOT for
    may_change TEXT[],                   -- What might adjust during provisional
    usage_guidance TEXT,
    examples JSONB,                      -- [{context, usage, correct}]

    -- Governance
    proposer TEXT NOT NULL,              -- ChittyID of proposer
    service TEXT NOT NULL,               -- Service that needs this
    guardian_approved BOOLEAN DEFAULT FALSE,
    approved_by TEXT,                    -- ChittyID of guardian
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Package distribution
    in_stable BOOLEAN DEFAULT FALSE,     -- @chittyfoundation/ontology
    in_unstable BOOLEAN DEFAULT FALSE,   -- @chittyfoundation/ontology-unstable

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ontology_terms_name ON ontology_terms(name);
CREATE INDEX idx_ontology_terms_stage ON ontology_terms(stage);
CREATE INDEX idx_ontology_terms_category ON ontology_terms(category);
CREATE INDEX idx_ontology_terms_domain ON ontology_terms USING GIN(domain);
CREATE INDEX idx_ontology_terms_proposer ON ontology_terms(proposer);
CREATE INDEX idx_ontology_terms_service ON ontology_terms(service);
CREATE INDEX idx_ontology_terms_in_stable ON ontology_terms(in_stable) WHERE in_stable = TRUE;
CREATE INDEX idx_ontology_terms_in_unstable ON ontology_terms(in_unstable) WHERE in_unstable = TRUE;

COMMENT ON TABLE ontology_terms IS 'ChittyCanon: Master ontology term registry with lifecycle tracking';

-- =============================================================================
-- TERM OBSERVATIONS TABLE - Provisional Period Metrics
-- =============================================================================
CREATE TABLE term_observations (
    observation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_id UUID NOT NULL REFERENCES ontology_terms(term_id) ON DELETE CASCADE,
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metrics snapshot
    usage_count INTEGER,
    stability_score DECIMAL(3,2),
    consistency_score DECIMAL(3,2),
    confusion_score DECIMAL(3,2),
    error_rate DECIMAL(3,2),

    -- Signals
    drift_detected BOOLEAN DEFAULT FALSE,
    confusion_type confusion_type,
    notes TEXT,

    -- Source
    observed_by TEXT,                    -- 'system' or ChittyID
    service TEXT                         -- Service that reported
);

CREATE INDEX idx_term_observations_term_id ON term_observations(term_id);
CREATE INDEX idx_term_observations_observed_at ON term_observations(observed_at DESC);
CREATE INDEX idx_term_observations_drift ON term_observations(drift_detected) WHERE drift_detected = TRUE;

COMMENT ON TABLE term_observations IS 'ChittyCanon: Observation log for terms in provisional stage';

-- =============================================================================
-- STANDARDS SOURCES TABLE - External Authority Registry (TY VY RY Scored)
-- =============================================================================
CREATE TABLE standards_sources (
    source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,           -- "Schema.org", "W3C PROV", "Black's Law"
    url TEXT,

    -- TY: Identity
    organization TEXT,                   -- Governing organization
    domain TEXT[],                       -- e.g., ['web', 'legal', 'identity']
    founded DATE,

    -- VY: Connectivity
    update_frequency TEXT,               -- "monthly", "quarterly", "annual"
    governance_model TEXT,               -- "consortium", "committee", "corporate"
    open_process BOOLEAN,
    adoption_rate DECIMAL(3,2),          -- 0.00-1.00

    -- RY: Authority
    authority_basis authority_basis,
    recognized_by TEXT[],                -- Organizations that recognize this
    global_reach global_reach,

    -- Intrinsic Scores (TY VY RY calculated)
    ty_score DECIMAL(3,2),               -- 0.00-1.00
    vy_score DECIMAL(3,2),               -- 0.00-1.00
    ry_score DECIMAL(3,2),               -- 0.00-1.00
    intrinsic_authority DECIMAL(3,2),    -- Average of TY VY RY

    -- Foundation Overlay
    domain_relevance DECIMAL(3,2),       -- Foundation-set: 0.00-1.00
    strategic_alignment DECIMAL(3,2),    -- Foundation-set: 0.00-1.00
    effective_weight DECIMAL(3,2),       -- Intrinsic * Relevance * Alignment

    -- Governance
    fast_track_eligible BOOLEAN DEFAULT FALSE,  -- effective_weight > 0.80
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'watching', 'proposed')),
    last_synced TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,                    -- ChittyID of reviewer
    reviewed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_standards_sources_name ON standards_sources(name);
CREATE INDEX idx_standards_sources_domain ON standards_sources USING GIN(domain);
CREATE INDEX idx_standards_sources_status ON standards_sources(status);
CREATE INDEX idx_standards_sources_effective_weight ON standards_sources(effective_weight DESC);
CREATE INDEX idx_standards_sources_fast_track ON standards_sources(fast_track_eligible) WHERE fast_track_eligible = TRUE;

COMMENT ON TABLE standards_sources IS 'ChittyStandards: External standards sources with TY VY RY authority scoring';

-- =============================================================================
-- STANDARDS TERMS TABLE - External Terms Registry
-- =============================================================================
CREATE TABLE standards_terms (
    term_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES standards_sources(source_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    definition TEXT,
    url TEXT,                            -- Link to official definition

    -- Classification
    domain TEXT[],
    category TEXT,                       -- "type", "property", "relationship"

    -- Status
    status TEXT DEFAULT 'current' CHECK (status IN ('current', 'deprecated', 'superseded')),
    deprecated_by TEXT,                  -- Replacement term name
    superseded_by UUID REFERENCES standards_terms(term_id),

    -- Metadata
    external_id TEXT,                    -- ID in the external system
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(source_id, name)
);

CREATE INDEX idx_standards_terms_source_id ON standards_terms(source_id);
CREATE INDEX idx_standards_terms_name ON standards_terms(name);
CREATE INDEX idx_standards_terms_domain ON standards_terms USING GIN(domain);
CREATE INDEX idx_standards_terms_status ON standards_terms(status);

COMMENT ON TABLE standards_terms IS 'ChittyStandards: Terms from external standards sources';

-- =============================================================================
-- RESERVED WORDS TABLE - Programming Keywords to Avoid
-- =============================================================================
CREATE TABLE reserved_words (
    word TEXT PRIMARY KEY,
    context TEXT NOT NULL,               -- "SQL", "JavaScript", "Python", "Go"
    severity TEXT DEFAULT 'soft' CHECK (severity IN ('hard', 'soft')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reserved_words_context ON reserved_words(context);
CREATE INDEX idx_reserved_words_severity ON reserved_words(severity);

COMMENT ON TABLE reserved_words IS 'ChittyStandards: Programming reserved words to avoid in term names';

-- =============================================================================
-- KNOWN ABBREVIATIONS TABLE - Common Abbreviations to Avoid Collision
-- =============================================================================
CREATE TABLE known_abbreviations (
    abbrev TEXT PRIMARY KEY,
    expansion TEXT NOT NULL,
    domain TEXT,
    collision_risk TEXT DEFAULT 'medium' CHECK (collision_risk IN ('high', 'medium', 'low')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_known_abbreviations_domain ON known_abbreviations(domain);
CREATE INDEX idx_known_abbreviations_collision_risk ON known_abbreviations(collision_risk);

COMMENT ON TABLE known_abbreviations IS 'ChittyStandards: Known abbreviations to prevent collision';

-- =============================================================================
-- ALIGNMENT MAP TABLE - Our Terms to External Terms Mapping
-- =============================================================================
CREATE TABLE alignment_map (
    alignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chitty_term TEXT NOT NULL,           -- Our ontology term name
    chitty_term_id UUID REFERENCES ontology_terms(term_id) ON DELETE CASCADE,
    standard_term_id UUID REFERENCES standards_terms(term_id) ON DELETE CASCADE,

    alignment_type alignment_type NOT NULL,
    justification TEXT,

    -- Governance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,                     -- ChittyID
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,                    -- ChittyID

    UNIQUE(chitty_term, standard_term_id)
);

CREATE INDEX idx_alignment_map_chitty_term ON alignment_map(chitty_term);
CREATE INDEX idx_alignment_map_chitty_term_id ON alignment_map(chitty_term_id);
CREATE INDEX idx_alignment_map_standard_term_id ON alignment_map(standard_term_id);
CREATE INDEX idx_alignment_map_alignment_type ON alignment_map(alignment_type);

COMMENT ON TABLE alignment_map IS 'ChittyStandards: Mapping of our terms to external standard terms';

-- =============================================================================
-- DIVERGENCE REGISTRY TABLE - Documented Intentional Divergences
-- =============================================================================
CREATE TABLE divergence_registry (
    divergence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chitty_concept TEXT NOT NULL,        -- Our concept/term name
    chitty_term_id UUID REFERENCES ontology_terms(term_id) ON DELETE SET NULL,

    -- What we're diverging from
    conflicting_standard TEXT NOT NULL,
    standard_term_id UUID REFERENCES standards_terms(term_id) ON DELETE SET NULL,

    -- Type and rationale
    divergence_type divergence_type NOT NULL,
    rationale TEXT NOT NULL,
    charter_alignment TEXT[],            -- Which charter principles this supports

    -- Our alternative
    our_approach TEXT,
    public_statement TEXT,

    -- Governance
    decided_by TEXT,                     -- ChittyID
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    review_required TIMESTAMP WITH TIME ZONE,  -- When to re-evaluate
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'reconsidering')),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_divergence_registry_chitty_concept ON divergence_registry(chitty_concept);
CREATE INDEX idx_divergence_registry_divergence_type ON divergence_registry(divergence_type);
CREATE INDEX idx_divergence_registry_status ON divergence_registry(status);
CREATE INDEX idx_divergence_registry_review_required ON divergence_registry(review_required);

COMMENT ON TABLE divergence_registry IS 'ChittyStandards: Documented intentional divergences from external standards';

-- =============================================================================
-- LEADERSHIP INITIATIVES TABLE - Innovations We're Leading
-- =============================================================================
CREATE TABLE leadership_initiatives (
    initiative_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept TEXT NOT NULL UNIQUE,        -- "TY VY RY", "Dual Immutability"
    description TEXT,

    -- Strategy
    divergence_type divergence_type DEFAULT 'leadership',
    influence_target TEXT,               -- "become standard", "industry adoption"
    target_bodies TEXT[],                -- ["W3C", "IETF"]

    -- Status
    stage initiative_stage DEFAULT 'internal',
    external_adoption TEXT[],            -- Orgs that adopted

    -- Metrics
    implementations INTEGER DEFAULT 0,
    citations INTEGER DEFAULT 0,

    -- Documentation
    whitepaper_url TEXT,
    spec_url TEXT,

    -- Governance
    owner TEXT,                          -- ChittyID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leadership_initiatives_concept ON leadership_initiatives(concept);
CREATE INDEX idx_leadership_initiatives_stage ON leadership_initiatives(stage);
CREATE INDEX idx_leadership_initiatives_divergence_type ON leadership_initiatives(divergence_type);

COMMENT ON TABLE leadership_initiatives IS 'ChittyStandards: Foundation innovations that may become external standards';

-- =============================================================================
-- DOMAIN NEEDS TABLE - What Domains We Serve
-- =============================================================================
CREATE TABLE domain_needs (
    domain TEXT PRIMARY KEY,
    description TEXT,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
    gap_tolerance TEXT CHECK (gap_tolerance IN ('must_align', 'can_create')),
    target_coverage DECIMAL(3,2),        -- Target coverage percentage
    current_coverage DECIMAL(3,2),       -- Current coverage percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE domain_needs IS 'ChittyStandards: Domains we serve and coverage targets';

-- =============================================================================
-- CONCEPT NEEDS TABLE - Concepts We Need Terms For
-- =============================================================================
CREATE TABLE concept_needs (
    concept TEXT PRIMARY KEY,
    domain TEXT REFERENCES domain_needs(domain) ON DELETE CASCADE,
    description TEXT,
    status TEXT CHECK (status IN ('covered', 'gap', 'watching')),
    covered_by TEXT,                     -- Term name filling this gap
    covered_by_id UUID REFERENCES ontology_terms(term_id) ON DELETE SET NULL,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_concept_needs_domain ON concept_needs(domain);
CREATE INDEX idx_concept_needs_status ON concept_needs(status);
CREATE INDEX idx_concept_needs_priority ON concept_needs(priority);

COMMENT ON TABLE concept_needs IS 'ChittyStandards: Specific concepts we need terms for';

-- =============================================================================
-- AUDIT LOG TABLE - Governance Actions
-- =============================================================================
CREATE TABLE canon_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,            -- 'term_proposed', 'term_promoted', 'divergence_decided'
    entity_type TEXT NOT NULL,           -- 'term', 'source', 'alignment', 'divergence'
    entity_id UUID,
    actor TEXT NOT NULL,                 -- ChittyID or 'system'
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    notes TEXT,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_canon_audit_log_entity_type ON canon_audit_log(entity_type);
CREATE INDEX idx_canon_audit_log_entity_id ON canon_audit_log(entity_id);
CREATE INDEX idx_canon_audit_log_actor ON canon_audit_log(actor);
CREATE INDEX idx_canon_audit_log_timestamp ON canon_audit_log(timestamp DESC);

COMMENT ON TABLE canon_audit_log IS 'ChittyCanon: Governance action audit trail';

-- =============================================================================
-- UPDATE TRIGGERS - Automatic timestamp management
-- =============================================================================
CREATE OR REPLACE FUNCTION update_canon_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ontology_terms_updated_at BEFORE UPDATE ON ontology_terms
    FOR EACH ROW EXECUTE FUNCTION update_canon_updated_at();

CREATE TRIGGER update_standards_sources_updated_at BEFORE UPDATE ON standards_sources
    FOR EACH ROW EXECUTE FUNCTION update_canon_updated_at();

CREATE TRIGGER update_standards_terms_updated_at BEFORE UPDATE ON standards_terms
    FOR EACH ROW EXECUTE FUNCTION update_canon_updated_at();

CREATE TRIGGER update_divergence_registry_updated_at BEFORE UPDATE ON divergence_registry
    FOR EACH ROW EXECUTE FUNCTION update_canon_updated_at();

CREATE TRIGGER update_leadership_initiatives_updated_at BEFORE UPDATE ON leadership_initiatives
    FOR EACH ROW EXECUTE FUNCTION update_canon_updated_at();

CREATE TRIGGER update_domain_needs_updated_at BEFORE UPDATE ON domain_needs
    FOR EACH ROW EXECUTE FUNCTION update_canon_updated_at();

CREATE TRIGGER update_concept_needs_updated_at BEFORE UPDATE ON concept_needs
    FOR EACH ROW EXECUTE FUNCTION update_canon_updated_at();

-- =============================================================================
-- TERM PROMOTION FUNCTION - Auto-promote when thresholds met
-- =============================================================================
CREATE OR REPLACE FUNCTION check_term_promotion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if term meets promotion thresholds
    IF NEW.stage = 'provisional' AND
       NEW.usage_count >= 1000 AND
       NEW.stability_score >= 0.90 AND
       NEW.consistency_score >= 0.85 AND
       NEW.error_rate < 0.05 AND
       (CURRENT_TIMESTAMP - NEW.provisional_at) >= INTERVAL '30 days' THEN

        NEW.stage = 'proven';
        NEW.proven_at = CURRENT_TIMESTAMP;

        -- Log the auto-promotion
        INSERT INTO canon_audit_log (event_type, entity_type, entity_id, actor, action, new_value)
        VALUES ('term_promoted', 'term', NEW.term_id, 'system', 'auto_promotion_to_proven',
                jsonb_build_object(
                    'usage_count', NEW.usage_count,
                    'stability_score', NEW.stability_score,
                    'consistency_score', NEW.consistency_score,
                    'error_rate', NEW.error_rate
                ));
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_term_promotion_trigger BEFORE UPDATE ON ontology_terms
    FOR EACH ROW EXECUTE FUNCTION check_term_promotion();

-- =============================================================================
-- SEED DATA: Reserved Words
-- =============================================================================
INSERT INTO reserved_words (word, context, severity, notes) VALUES
    ('SELECT', 'SQL', 'hard', 'SQL keyword'),
    ('INSERT', 'SQL', 'hard', 'SQL keyword'),
    ('UPDATE', 'SQL', 'hard', 'SQL keyword'),
    ('DELETE', 'SQL', 'hard', 'SQL keyword'),
    ('DROP', 'SQL', 'hard', 'SQL keyword'),
    ('TABLE', 'SQL', 'hard', 'SQL keyword'),
    ('INDEX', 'SQL', 'hard', 'SQL keyword'),
    ('CREATE', 'SQL', 'hard', 'SQL keyword'),
    ('ALTER', 'SQL', 'hard', 'SQL keyword'),
    ('function', 'JavaScript', 'hard', 'JS keyword'),
    ('class', 'JavaScript', 'hard', 'JS keyword'),
    ('const', 'JavaScript', 'hard', 'JS keyword'),
    ('let', 'JavaScript', 'hard', 'JS keyword'),
    ('var', 'JavaScript', 'hard', 'JS keyword'),
    ('return', 'JavaScript', 'hard', 'JS keyword'),
    ('async', 'JavaScript', 'hard', 'JS keyword'),
    ('await', 'JavaScript', 'hard', 'JS keyword'),
    ('import', 'JavaScript', 'hard', 'JS keyword'),
    ('export', 'JavaScript', 'hard', 'JS keyword'),
    ('def', 'Python', 'hard', 'Python keyword'),
    ('class', 'Python', 'hard', 'Python keyword'),
    ('import', 'Python', 'hard', 'Python keyword'),
    ('from', 'Python', 'hard', 'Python keyword'),
    ('return', 'Python', 'hard', 'Python keyword'),
    ('yield', 'Python', 'hard', 'Python keyword'),
    ('None', 'Python', 'hard', 'Python keyword'),
    ('True', 'Python', 'hard', 'Python keyword'),
    ('False', 'Python', 'hard', 'Python keyword');

-- =============================================================================
-- SEED DATA: Known Abbreviations
-- =============================================================================
INSERT INTO known_abbreviations (abbrev, expansion, domain, collision_risk, notes) VALUES
    ('ID', 'Identifier', 'general', 'high', 'Universal abbreviation'),
    ('TV', 'Television', 'general', 'high', 'Conflicts with potential TY abbreviation'),
    ('HR', 'Human Resources', 'business', 'high', 'Common business abbreviation'),
    ('AI', 'Artificial Intelligence', 'technology', 'high', 'Universal tech abbreviation'),
    ('ML', 'Machine Learning', 'technology', 'medium', 'Common tech abbreviation'),
    ('DB', 'Database', 'technology', 'medium', 'Common tech abbreviation'),
    ('API', 'Application Programming Interface', 'technology', 'high', 'Universal tech abbreviation'),
    ('URL', 'Uniform Resource Locator', 'technology', 'high', 'Universal tech abbreviation'),
    ('URI', 'Uniform Resource Identifier', 'technology', 'high', 'Universal tech abbreviation'),
    ('JWT', 'JSON Web Token', 'technology', 'medium', 'Auth abbreviation'),
    ('SSO', 'Single Sign-On', 'technology', 'medium', 'Auth abbreviation'),
    ('GDPR', 'General Data Protection Regulation', 'legal', 'medium', 'Legal/privacy abbreviation'),
    ('PII', 'Personally Identifiable Information', 'legal', 'medium', 'Privacy abbreviation'),
    ('KYC', 'Know Your Customer', 'legal', 'medium', 'Compliance abbreviation');

-- =============================================================================
-- SEED DATA: Priority Standards Sources
-- =============================================================================
INSERT INTO standards_sources (
    name, url, organization, domain, governance_model, open_process,
    authority_basis, global_reach, ty_score, vy_score, ry_score, intrinsic_authority,
    domain_relevance, strategic_alignment, effective_weight, fast_track_eligible, status
) VALUES
    ('Black''s Law Dictionary', 'https://thelawdictionary.org', 'Thomson Reuters',
     ARRAY['legal'], 'corporate', FALSE, 'industry', 'global',
     0.90, 0.75, 0.90, 0.85, 0.95, 0.90, 0.73, TRUE, 'active'),

    ('W3C PROV', 'https://www.w3.org/TR/prov-overview/', 'W3C',
     ARRAY['provenance', 'web'], 'consortium', TRUE, 'industry', 'global',
     0.95, 0.90, 0.97, 0.94, 0.90, 0.85, 0.72, TRUE, 'active'),

    ('Schema.org', 'https://schema.org', 'Schema.org Community',
     ARRAY['web', 'identity'], 'community', TRUE, 'community', 'global',
     0.95, 0.98, 0.92, 0.95, 0.80, 0.80, 0.61, FALSE, 'active'),

    ('Dublin Core', 'https://www.dublincore.org', 'Dublin Core Metadata Initiative',
     ARRAY['metadata'], 'consortium', TRUE, 'community', 'global',
     0.92, 0.85, 0.90, 0.89, 0.70, 0.85, 0.53, FALSE, 'active'),

    ('ISO 27001', 'https://www.iso.org/isoiec-27001-information-security.html', 'ISO',
     ARRAY['security'], 'treaty', TRUE, 'treaty', 'global',
     0.98, 0.95, 1.00, 0.98, 0.50, 0.80, 0.39, FALSE, 'active'),

    ('IETF RFCs', 'https://www.rfc-editor.org', 'IETF',
     ARRAY['internet', 'protocols'], 'consortium', TRUE, 'industry', 'global',
     0.95, 0.90, 0.95, 0.93, 0.60, 0.85, 0.47, FALSE, 'active');

-- =============================================================================
-- SEED DATA: Domain Needs
-- =============================================================================
INSERT INTO domain_needs (domain, description, priority, gap_tolerance, target_coverage, current_coverage) VALUES
    ('legal', 'Legal terminology and concepts', 'high', 'must_align', 0.90, 0.00),
    ('provenance', 'Data origin and lineage tracking', 'high', 'must_align', 0.80, 0.00),
    ('identity', 'Entity identification and verification', 'high', 'can_create', 0.85, 0.00),
    ('trust', 'Trust scoring and verification', 'high', 'can_create', 0.90, 0.00),
    ('metadata', 'Document and artifact metadata', 'medium', 'must_align', 0.60, 0.00),
    ('security', 'Security terminology', 'medium', 'must_align', 0.40, 0.00);

-- =============================================================================
-- SEED DATA: Leadership Initiatives
-- =============================================================================
INSERT INTO leadership_initiatives (
    concept, description, divergence_type, influence_target, target_bodies, stage
) VALUES
    ('TY VY RY (Three Aspects)',
     'Universal entity aspects: Identity (TY), Connectivity (VY), Authority (RY)',
     'leadership', 'become standard', ARRAY['W3C', 'IETF'], 'internal'),

    ('Dual Immutability',
     'Ledger + Chain model for evidence integrity',
     'leadership', 'industry adoption', ARRAY['Legal Tech', 'GovTech'], 'internal'),

    ('Multi-Plane Entity',
     'Physical + Digital existence model',
     'leadership', 'academic adoption', ARRAY['Academic'], 'internal'),

    ('Linked Ledger (hu x ai)',
     'Shared consequence model for human-AI collaboration',
     'leadership', 'AI governance', ARRAY['AI Safety', 'Partnership on AI'], 'internal'),

    ('ChittyID Format',
     'Universal identifier format: VV-G-LLL-SSSS-T-YM-C-X',
     'leadership', 'become standard', ARRAY['IETF'], 'internal'),

    ('Provisional to Canonical Lifecycle',
     'Term maturity lifecycle for ontology governance',
     'leadership', 'community adoption', NULL, 'internal');

-- ============================================================================
-- END MIGRATION
-- ============================================================================
