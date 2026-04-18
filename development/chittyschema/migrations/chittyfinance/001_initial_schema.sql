-- ChittyFinance: Multi-Tenant Financial Management Schema
-- Managed by chittyschema - DO NOT edit in service repos
-- Created: 2026-04-17
-- Source of Truth: chittyschema/migrations/chittyfinance/
-- Drizzle Origin: CHITTYAPPS/chittyfinance/database/system.schema.ts
--
-- PURPOSE: Full-stack financial management for the ChittyOS ecosystem:
--   - Multi-tenant LLC/property hierarchy (IT CAN BE LLC structure)
--   - Chart of Accounts with trust-path classification (L0-L4)
--   - Property management (units, leases, valuations)
--   - Inter-company allocation engine
--   - Integration hub (Mercury, Wave, Stripe)
--   - Communication and workflow automation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TENANTS TABLE - Legal Entities (LLCs, Properties, Management Companies)
-- =============================================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'holding', 'series', 'property', 'management', 'personal'
    parent_id UUID REFERENCES tenants(id),
    tax_id TEXT, -- EIN or SSN
    metadata JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX tenants_slug_idx ON tenants(slug);
CREATE INDEX tenants_parent_idx ON tenants(parent_id);

COMMENT ON TABLE tenants IS 'ChittyFinance: Legal entities (LLCs, properties, management companies). Owned by chittyfinance.';
COMMENT ON COLUMN tenants.type IS 'Entity type: holding, series, property, management, personal';
COMMENT ON COLUMN tenants.parent_id IS 'Self-referential FK for LLC hierarchy (e.g. ARIBIA LLC -> IT CAN BE LLC)';
COMMENT ON COLUMN tenants.tax_id IS 'EIN or SSN - encrypted at rest by Neon';
COMMENT ON COLUMN tenants.metadata IS 'Legal documents, addresses, formation details';

-- =============================================================================
-- USERS TABLE - User Accounts with ChittyID Integration
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chitty_id TEXT UNIQUE, -- ChittyID DID (did:chitty:*)
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin', 'manager', 'accountant', 'user'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_chitty_id_idx ON users(chitty_id);

COMMENT ON TABLE users IS 'ChittyFinance: User accounts with optional ChittyID SSO binding. Owned by chittyfinance.';
COMMENT ON COLUMN users.chitty_id IS 'ChittyID DID for SSO integration (did:chitty:*)';
COMMENT ON COLUMN users.password_hash IS 'SHA-256 hashed password (Web Crypto in Workers)';
COMMENT ON COLUMN users.role IS 'Global role: admin, manager, accountant, user';

-- =============================================================================
-- TENANT_USERS TABLE - User Access to Tenants with Role-Based Permissions
-- =============================================================================
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'viewer', -- 'owner', 'admin', 'manager', 'viewer'
    permissions JSONB, -- Granular permissions
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX tenant_users_tenant_user_idx ON tenant_users(tenant_id, user_id);

COMMENT ON TABLE tenant_users IS 'ChittyFinance: User access to tenants with role-based permissions. Owned by chittyfinance.';
COMMENT ON COLUMN tenant_users.role IS 'Tenant-scoped role: owner, admin (L4 COA govern), manager, viewer';
COMMENT ON COLUMN tenant_users.permissions IS 'Granular permissions override (JSONB)';

-- =============================================================================
-- CHART_OF_ACCOUNTS TABLE - Database-Backed COA with Tenant Customization
-- =============================================================================
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id), -- NULL = global default
    code TEXT NOT NULL, -- e.g. '5070'
    name TEXT NOT NULL, -- e.g. 'Repairs'
    type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'income', 'expense'
    subtype TEXT, -- 'cash', 'receivable', 'fixed', 'contra', 'current', 'long-term', 'capital', 'suspense', 'non-deductible'
    description TEXT,
    schedule_e_line TEXT, -- IRS Schedule E line reference
    tax_deductible BOOLEAN NOT NULL DEFAULT false,
    parent_code TEXT, -- for hierarchical grouping
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_date TIMESTAMP WITH TIME ZONE, -- when this account definition became active
    modified_by TEXT, -- L4 auditor who last changed this
    metadata JSONB, -- additional config (keywords, aliases, etc.)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX coa_tenant_idx ON chart_of_accounts(tenant_id);
CREATE INDEX coa_code_idx ON chart_of_accounts(code);
CREATE INDEX coa_type_idx ON chart_of_accounts(type);
CREATE UNIQUE INDEX coa_tenant_code_idx ON chart_of_accounts(tenant_id, code);

COMMENT ON TABLE chart_of_accounts IS 'ChittyFinance: Database-backed COA with tenant customization. NULL tenant_id = global defaults (60 REI accounts seeded). Owned by chittyfinance.';
COMMENT ON COLUMN chart_of_accounts.code IS 'Account code, e.g. 5070 for Repairs. Unique per tenant.';
COMMENT ON COLUMN chart_of_accounts.schedule_e_line IS 'IRS Schedule E line reference for tax export';
COMMENT ON COLUMN chart_of_accounts.modified_by IS 'L4 auditor who last modified this account (user UUID or agent session ID)';
COMMENT ON COLUMN chart_of_accounts.metadata IS 'Keywords, aliases, and additional config for AI classification matching';

-- =============================================================================
-- ACCOUNTS TABLE - Financial Accounts (Bank, Credit, Investment, Liability)
-- =============================================================================
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'checking', 'savings', 'credit', 'investment', 'mortgage', 'loan', 'tax_liability'
    institution TEXT, -- 'Mercury Bank', 'Wave', etc.
    account_number TEXT, -- Last 4 digits only
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
    external_id TEXT, -- For Mercury/Wave API integration
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    liability_details JSONB, -- mortgage/loan/tax_liability specific fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX accounts_tenant_idx ON accounts(tenant_id);
CREATE INDEX accounts_external_idx ON accounts(external_id);

COMMENT ON TABLE accounts IS 'ChittyFinance: Financial accounts (bank, credit, investment, liability). Tenant-scoped. Owned by chittyfinance.';
COMMENT ON COLUMN accounts.account_number IS 'Last 4 digits only - never store full account numbers';
COMMENT ON COLUMN accounts.external_id IS 'External provider ID for Mercury/Wave/Stripe sync';
COMMENT ON COLUMN accounts.liability_details IS 'Structured data for liability accounts: {interestRate, escrowBalance, payoffAmount, maturityDate, lender, monthlyPayment}';

-- =============================================================================
-- PROPERTIES TABLE - Real Estate Assets
-- =============================================================================
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'USA',
    property_type TEXT NOT NULL, -- 'condo', 'apartment', 'house', 'commercial'
    purchase_price DECIMAL(12, 2),
    purchase_currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
    purchase_date TIMESTAMP WITH TIME ZONE,
    current_value DECIMAL(12, 2),
    current_value_currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
    metadata JSONB, -- Photos, documents, etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX properties_tenant_idx ON properties(tenant_id);

COMMENT ON TABLE properties IS 'ChittyFinance: Real estate assets with multi-currency support. Tenant-scoped. Owned by chittyfinance.';

-- =============================================================================
-- UNITS TABLE - Rental Units (Multi-Unit Properties)
-- =============================================================================
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id),
    unit_number TEXT,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    square_feet INTEGER,
    monthly_rent DECIMAL(12, 2),
    rent_currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX units_property_idx ON units(property_id);

COMMENT ON TABLE units IS 'ChittyFinance: Rental units within properties. Owned by chittyfinance.';

-- =============================================================================
-- TRANSACTIONS TABLE - Financial Transactions with Trust-Path Classification
-- =============================================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
    type TEXT NOT NULL, -- 'income', 'expense', 'transfer'
    category TEXT, -- 'rent', 'maintenance', 'utilities', 'management_fee', etc.
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    payee TEXT,
    property_id UUID REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    external_id TEXT, -- For bank/Wave API sync
    -- COA classification (trust-path governed)
    coa_code TEXT, -- authoritative classification (L2+ can write)
    suggested_coa_code TEXT, -- AI/keyword proposal (L1 writes, L3 reviews)
    classification_confidence DECIMAL(4, 3), -- 0.000-1.000
    classified_by TEXT, -- who/what set coa_code: user UUID, agent session ID, or 'auto'
    classified_at TIMESTAMP WITH TIME ZONE,
    reconciled BOOLEAN NOT NULL DEFAULT false,
    reconciled_by TEXT, -- L3 auditor who locked this transaction
    reconciled_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX transactions_tenant_idx ON transactions(tenant_id);
CREATE INDEX transactions_account_idx ON transactions(account_id);
CREATE INDEX transactions_date_idx ON transactions(date);
CREATE INDEX transactions_property_idx ON transactions(property_id);
CREATE INDEX transactions_coa_idx ON transactions(tenant_id, coa_code);
CREATE INDEX transactions_unclassified_idx ON transactions(tenant_id, coa_code);

COMMENT ON TABLE transactions IS 'ChittyFinance: Financial transactions with trust-path COA classification (L0-L4). Tenant-scoped. Owned by chittyfinance.';
COMMENT ON COLUMN transactions.coa_code IS 'Authoritative COA classification. L2+ executor writes. References chart_of_accounts.code.';
COMMENT ON COLUMN transactions.suggested_coa_code IS 'AI/keyword proposal. L1 writes, L3 auditor reviews.';
COMMENT ON COLUMN transactions.classification_confidence IS 'Confidence score 0.000-1.000 from AI classifier';
COMMENT ON COLUMN transactions.reconciled IS 'True when L3 auditor has locked this transaction';
COMMENT ON COLUMN transactions.reconciled_by IS 'L3 auditor who locked this transaction (user UUID or agent session ID)';

-- =============================================================================
-- INTERCOMPANY_TRANSACTIONS TABLE - Transfers Between Tenants
-- =============================================================================
CREATE TABLE intercompany_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_tenant_id UUID NOT NULL REFERENCES tenants(id),
    to_tenant_id UUID NOT NULL REFERENCES tenants(id),
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
    exchange_rate DECIMAL(12, 6), -- amount * exchange_rate = USD equivalent
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    from_transaction_id UUID REFERENCES transactions(id),
    to_transaction_id UUID REFERENCES transactions(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX intercompany_from_tenant_idx ON intercompany_transactions(from_tenant_id);
CREATE INDEX intercompany_to_tenant_idx ON intercompany_transactions(to_tenant_id);

COMMENT ON TABLE intercompany_transactions IS 'ChittyFinance: Inter-company transfers between tenants with multi-currency support. Owned by chittyfinance.';
COMMENT ON COLUMN intercompany_transactions.exchange_rate IS 'Multiply: amount * exchangeRate = USD equivalent (e.g., 100 COP * 0.000244 = 0.0244 USD)';

-- =============================================================================
-- ALLOCATION_RULES TABLE - Automated Inter-Company Allocation Configuration
-- =============================================================================
CREATE TABLE allocation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL, -- 'management_fee', 'cost_sharing', 'rent_passthrough', 'custom_pct'
    source_tenant_id UUID NOT NULL REFERENCES tenants(id),
    target_tenant_id UUID NOT NULL REFERENCES tenants(id),
    percentage DECIMAL(5, 2), -- e.g. 10.00 for 10%
    fixed_amount DECIMAL(12, 2), -- flat fee alternative
    frequency TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annually', 'per_transaction'
    source_category TEXT, -- filter: only allocate from this tx category
    allocation_method TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed', 'remainder'
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB, -- cap amounts, minimum thresholds, etc.
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX allocation_rules_source_tenant_idx ON allocation_rules(source_tenant_id);
CREATE INDEX allocation_rules_target_tenant_idx ON allocation_rules(target_tenant_id);
CREATE INDEX allocation_rules_type_idx ON allocation_rules(rule_type);

COMMENT ON TABLE allocation_rules IS 'ChittyFinance: Automated inter-company allocation rules. Owned by chittyfinance.';
COMMENT ON COLUMN allocation_rules.rule_type IS 'Rule type: management_fee, cost_sharing, rent_passthrough, custom_pct';
COMMENT ON COLUMN allocation_rules.allocation_method IS 'How to calculate: percentage, fixed, remainder';

-- =============================================================================
-- ALLOCATION_RUNS TABLE - Audit Trail for Allocation Executions
-- =============================================================================
CREATE TABLE allocation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES allocation_rules(id),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    source_amount DECIMAL(12, 2) NOT NULL,
    allocated_amount DECIMAL(12, 2) NOT NULL,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    intercompany_transaction_id UUID REFERENCES intercompany_transactions(id),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'posted', 'reversed'
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX allocation_runs_rule_idx ON allocation_runs(rule_id);
CREATE INDEX allocation_runs_period_idx ON allocation_runs(period_start, period_end);
CREATE INDEX allocation_runs_status_idx ON allocation_runs(status);

COMMENT ON TABLE allocation_runs IS 'ChittyFinance: Audit trail for allocation rule executions. Owned by chittyfinance.';

-- =============================================================================
-- LEASES TABLE - Tenant Leases
-- =============================================================================
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id),
    tenant_name TEXT NOT NULL, -- rental tenant (person), not system tenant
    tenant_email TEXT,
    tenant_phone TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    monthly_rent DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
    security_deposit DECIMAL(12, 2),
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'terminated'
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX leases_unit_idx ON leases(unit_id);
CREATE INDEX leases_status_idx ON leases(status);

COMMENT ON TABLE leases IS 'ChittyFinance: Rental leases for units. GDPR-sensitive (tenant PII). Owned by chittyfinance.';
COMMENT ON COLUMN leases.tenant_name IS 'Rental tenant (person name), not system tenant entity';

-- =============================================================================
-- PROPERTY_VALUATIONS TABLE - Cached External AVM Estimates
-- =============================================================================
CREATE TABLE property_valuations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    source TEXT NOT NULL, -- 'zillow', 'redfin', 'housecanary', 'attom', 'county', 'manual'
    estimate DECIMAL(12, 2),
    low DECIMAL(12, 2),
    high DECIMAL(12, 2),
    rental_estimate DECIMAL(12, 2),
    confidence DECIMAL(4, 3), -- 0.000-1.000
    details JSONB, -- Provider-specific data (zestimate details, comps, etc.)
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX property_valuations_property_idx ON property_valuations(property_id);
CREATE INDEX property_valuations_tenant_idx ON property_valuations(tenant_id);
CREATE INDEX property_valuations_source_idx ON property_valuations(source);
CREATE UNIQUE INDEX property_valuations_property_source_idx ON property_valuations(property_id, source);

COMMENT ON TABLE property_valuations IS 'ChittyFinance: Cached AVM estimates from external providers (Zillow, Redfin, HouseCanary, ATTOM, County). Owned by chittyfinance.';
COMMENT ON COLUMN property_valuations.source IS 'Valuation provider: zillow, redfin, housecanary, attom, county, manual';
COMMENT ON COLUMN property_valuations.confidence IS 'Provider confidence score 0.000-1.000';

-- =============================================================================
-- INTEGRATIONS TABLE - Service Connections (Mercury, Wave, Stripe)
-- =============================================================================
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    service_type TEXT NOT NULL, -- 'mercury_bank', 'wave_accounting', 'stripe', etc.
    name TEXT NOT NULL,
    description TEXT,
    connected BOOLEAN DEFAULT false,
    credentials JSONB, -- Encrypted API keys, tokens (encrypted at rest by Neon)
    last_synced TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX integrations_tenant_idx ON integrations(tenant_id);

COMMENT ON TABLE integrations IS 'ChittyFinance: Service integration connections (Mercury, Wave, Stripe). Credentials encrypted at rest. Owned by chittyfinance.';
COMMENT ON COLUMN integrations.credentials IS 'Encrypted API keys and tokens - NEVER log or expose';

-- =============================================================================
-- TASKS TABLE - Financial Tasks
-- =============================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    priority TEXT, -- 'urgent', 'high', 'medium', 'low'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    related_to TEXT, -- 'property', 'transaction', 'lease', etc.
    related_id UUID,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX tasks_tenant_idx ON tasks(tenant_id);
CREATE INDEX tasks_user_idx ON tasks(user_id);

COMMENT ON TABLE tasks IS 'ChittyFinance: Financial tasks with priority and status tracking. Tenant-scoped. Owned by chittyfinance.';

-- =============================================================================
-- AI_MESSAGES TABLE - AI Financial Advice Conversations
-- =============================================================================
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    role TEXT NOT NULL, -- 'system', 'user', 'assistant'
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ai_messages_tenant_idx ON ai_messages(tenant_id);
CREATE INDEX ai_messages_user_idx ON ai_messages(user_id);

COMMENT ON TABLE ai_messages IS 'ChittyFinance: AI financial advice conversation history (GPT-4o). Owned by chittyfinance.';

-- =============================================================================
-- COMMS_LOG TABLE - Communication Log (SMS/Email to Rental Tenants)
-- =============================================================================
CREATE TABLE comms_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    property_id UUID REFERENCES properties(id),
    recipient_name TEXT NOT NULL,
    recipient_contact TEXT NOT NULL, -- phone or email
    channel TEXT NOT NULL, -- 'sms', 'email'
    template TEXT, -- template name, if used
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX comms_log_tenant_idx ON comms_log(tenant_id);
CREATE INDEX comms_log_property_idx ON comms_log(property_id);
CREATE INDEX comms_log_channel_idx ON comms_log(channel);

COMMENT ON TABLE comms_log IS 'ChittyFinance: Communication log for SMS/email sent to rental tenants. GDPR-sensitive. Owned by chittyfinance.';

-- =============================================================================
-- WORKFLOWS TABLE - Approval Workflows (Maintenance, Expenses, Vendors)
-- =============================================================================
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    property_id UUID REFERENCES properties(id),
    type TEXT NOT NULL, -- 'maintenance_request', 'expense_approval', 'vendor_dispatch'
    title TEXT NOT NULL,
    description TEXT,
    requestor TEXT, -- name or userId
    cost_estimate DECIMAL(12, 2),
    cost_currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
    status TEXT NOT NULL DEFAULT 'requested', -- 'requested', 'approved', 'in_progress', 'completed', 'rejected'
    metadata JSONB, -- approvedBy, approvedAt, completedAt, vendor info, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX workflows_tenant_idx ON workflows(tenant_id);
CREATE INDEX workflows_property_idx ON workflows(property_id);
CREATE INDEX workflows_status_idx ON workflows(status);

COMMENT ON TABLE workflows IS 'ChittyFinance: Approval workflows for maintenance, expenses, and vendor dispatch. Owned by chittyfinance.';

-- =============================================================================
-- CLASSIFICATION_AUDIT TABLE - COA Classification Audit Trail
-- =============================================================================
CREATE TABLE classification_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id), -- denormalized for tenant-scoped queries
    previous_coa_code TEXT, -- NULL on first classification
    new_coa_code TEXT NOT NULL,
    action TEXT NOT NULL, -- 'classify', 'reclassify', 'suggest', 're-suggest', 'reconcile', 'override'
    trust_level TEXT NOT NULL, -- 'L0', 'L1', 'L2', 'L3', 'L4'
    actor_id TEXT NOT NULL, -- user UUID, agent session ID, or 'auto'
    actor_type TEXT NOT NULL, -- 'user', 'agent', 'system'
    confidence DECIMAL(4, 3), -- 0.000-1.000 at time of action
    reason TEXT, -- why the change was made
    metadata JSONB, -- session context, model used, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX classification_audit_transaction_idx ON classification_audit(transaction_id);
CREATE INDEX classification_audit_tenant_idx ON classification_audit(tenant_id);
CREATE INDEX classification_audit_actor_idx ON classification_audit(actor_id);
CREATE INDEX classification_audit_trust_level_idx ON classification_audit(trust_level);

COMMENT ON TABLE classification_audit IS 'ChittyFinance: Immutable audit trail for every COA classification change. Enforces maker/checker: L2 classifies, L3 reconciles. Owned by chittyfinance.';
COMMENT ON COLUMN classification_audit.action IS 'Action type: classify, reclassify, suggest, re-suggest, reconcile, override';
COMMENT ON COLUMN classification_audit.trust_level IS 'Trust level at time of action: L0 (ingest), L1 (suggest), L2 (classify), L3 (reconcile), L4 (govern)';
COMMENT ON COLUMN classification_audit.actor_id IS 'User UUID, agent session ID, or ''auto'' for system actions';

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

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allocation_rules_updated_at BEFORE UPDATE ON allocation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_valuations_updated_at BEFORE UPDATE ON property_valuations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
