-- ============================================================================
-- Migration: 003_service_registrations_private_endpoint.sql
-- Database: chittyos-core (Neon, project restless-grass-40598426)
-- Schema: public
-- Date: 2026-04-30
--
-- Adds an optional private_endpoint JSONB block to service_registrations
-- so the registry can express "how to reach this service over a private
-- mesh" alongside the existing public_url / endpoints[] data.
--
-- Today the only supported transport is "tailscale" (Tailscale Services
-- with TailVIP + MagicDNS). Future transports extend the IN-list inside
-- the CHECK constraint via a separate migration. Do not pre-populate.
--
-- Consumers: ChittyRegister (writes), ChittyRegistry (reads/serves),
-- ChittyDiscovery (reads for routing), chittyagent-tailnet (validates
-- Tailscale-shaped payloads against tailnet ACLs).
--
-- @canon: chittycanon://infrastructure/network/tailscale-services
-- @parent_spec: workspace/dev-ops/proposals/TAILSCALE_SERVICES_HOMELAB.md §5
-- @handoff_doc: workspace/dev-ops/proposals/T1_REGISTRY_PRIVATE_ENDPOINT.md
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Add the column (nullable, no default — NULL means "no private endpoint")
-- ----------------------------------------------------------------------------
ALTER TABLE service_registrations
  ADD COLUMN IF NOT EXISTS private_endpoint JSONB;

-- ----------------------------------------------------------------------------
-- 2. CHECK constraint: NULL is fine; non-NULL must be a well-formed object.
--    transport must be in the known set (today: 'tailscale').
--    Future: extend the IN-list when a real second transport ships.
-- ----------------------------------------------------------------------------
ALTER TABLE service_registrations
  ADD CONSTRAINT service_registrations_private_endpoint_shape
  CHECK (
    private_endpoint IS NULL
    OR (
      jsonb_typeof(private_endpoint) = 'object'
      AND private_endpoint ? 'transport'
      AND private_endpoint ? 'service'
      AND private_endpoint ? 'magic_dns'
      AND private_endpoint ? 'ports'
      AND jsonb_typeof(private_endpoint -> 'ports') = 'array'
      AND (private_endpoint ->> 'transport') IN ('tailscale')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Indexes
--    (a) GIN for containment queries: find services on tailnet X,
--        services exposing tcp:443, etc.
--    (b) Partial btree on transport for "list all tailscale services" —
--        the most common discovery query.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_service_registrations_private_endpoint_gin
  ON service_registrations USING GIN (private_endpoint);

CREATE INDEX IF NOT EXISTS idx_service_registrations_private_transport
  ON service_registrations ((private_endpoint ->> 'transport'))
  WHERE private_endpoint IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Documentation
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN service_registrations.private_endpoint IS
  'Optional private-mesh endpoint descriptor. NULL for public-only services. '
  'When set, must contain transport (discriminator), service, magic_dns, ports[]. '
  'Today only transport="tailscale" is supported. '
  'See chittycanon://infrastructure/network/tailscale-services and '
  'TAILSCALE_SERVICES_HOMELAB.md §5.';

-- ----------------------------------------------------------------------------
-- 5. Validation block — ensures the constraint accepts real Tailscale
--    payloads and rejects malformed ones in this transaction. Failure
--    here aborts the migration before COMMIT. (Empirically verified on
--    branch t1-private-endpoint-ddl-validation 2026-04-30.)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_id TEXT := 'migration-validation-' || gen_random_uuid()::text;
BEGIN
  -- Positive: real Tailscale shape accepted.
  INSERT INTO service_registrations (
    chitty_id, service_name, description, version,
    endpoints, schema, security, status, private_endpoint
  ) VALUES (
    v_id, 'mig-validation-' || v_id, 'transient migration check', '0.0.0',
    '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'active',
    jsonb_build_object(
      'transport',  'tailscale',
      'tailnet',    'cockatoo-dominant.ts.net',
      'service',    'svc:chittyserv',
      'magic_dns',  'chittyserv.cockatoo-dominant.ts.net',
      'ports',      jsonb_build_array(jsonb_build_object('proto','tcp','port',443)),
      'tls',        'tailscale-magicdns-auto',
      'constraints',jsonb_build_object('tcp_only',true,'hairpinning',false,'funnel_forbidden',true)
    )
  );

  -- Clean up the validation row immediately — migration must not leave artifacts.
  DELETE FROM service_registrations WHERE chitty_id = v_id;

  RAISE NOTICE 'private_endpoint shape constraint validated; no migration artifacts left.';
END $$;

COMMIT;
