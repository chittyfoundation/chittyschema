/**
 * ChittySchema Registry API - Tier 2 Service Registration
 *
 * Handles registration, validation, and compliance checking for standalone apps
 * that use independent schemas (D1, KV, custom storage)
 */

import { Hono } from 'hono';
import {
  validateRegistration,
  parseRepoUrl,
  type RegistrationValidationRequest,
} from '../lib/registration-validator';

// Registry entry interface
export interface SchemaRegistration {
  serviceName: string;
  organization: 'chittyfoundation' | 'chittyos' | 'chittyapps' | 'community';
  tier: 1 | 2 | 3; // 1=Source, 2=Registry, 3=Catalog
  storageType: 'postgresql' | 'd1' | 'kv' | 'hybrid' | 'custom';
  schemaLocation: string; // Git URL or API endpoint
  schemaVersion: string;
  deployment: {
    production?: string;
    staging?: string;
    development?: string;
  };
  compliance: {
    temporal_versioning: boolean; // updated_at, deleted_at
    gdpr_compliant: boolean; // Right to be forgotten
    audit_logging: boolean; // Comprehensive logging
    security_validated: boolean; // No plaintext secrets
  };
  patterns: {
    naming_convention: 'chittyos' | 'custom';
    primary_key_pattern: string;
    index_strategy: string;
  };
  validation: {
    status: 'pending' | 'validated' | 'non_compliant' | 'deprecated';
    last_validated: string; // ISO timestamp
    validation_report?: string; // URL to full report
    badge_url?: string;
  };
  metadata: {
    description?: string;
    repository?: string;
    documentation?: string;
    contact?: string;
    created_at: string;
    updated_at: string;
  };
}

// ComplianceCheck shape is now defined and exported from
// connectivity/api/lib/registration-validator.ts. The previous local
// definition was tied to a placeholder route that returned hardcoded
// scores; it was removed when the route was rewritten to call the
// real validator. Re-export here so external imports of
// `ComplianceCheck` from this module keep resolving.
export type { ComplianceCheck } from '../lib/registration-validator';

type Bindings = {
  REGISTRY_KV?: KVNamespace; // For storing registry entries
  ENVIRONMENT: string;
  /**
   * Optional GitHub token for the registration validator. Used to fetch
   * compliance artifacts from private repos and to lift rate limits on
   * raw.githubusercontent.com. Inject via `wrangler secret put GITHUB_TOKEN`.
   */
  GITHUB_TOKEN?: string;
};

export const registryRoute = new Hono<{ Bindings: Bindings }>();

// List all registered services
registryRoute.get('/', async (c) => {
  const kv = c.env.REGISTRY_KV;

  if (!kv) {
    return c.json(
      { success: false, error: 'REGISTRY_KV binding is not configured' },
      503
    );
  }

  const list = await kv.list({ prefix: 'registry:' });
  const services: SchemaRegistration[] = [];

  for (const key of list.keys) {
    const value = await kv.get(key.name);
    if (value) {
      try {
        services.push(JSON.parse(value) as SchemaRegistration);
      } catch {
        // Skip corrupt entries; don't fail the whole listing
      }
    }
  }

  return c.json({
    services,
    count: services.length,
    tiers: {
      tier1: services.filter((s) => s.tier === 1).length,
      tier2: services.filter((s) => s.tier === 2).length,
      tier3: services.filter((s) => s.tier === 3).length,
    },
  });
});

// Get specific service registration
registryRoute.get('/:serviceName', async (c) => {
  const serviceName = c.req.param('serviceName');
  const kv = c.env.REGISTRY_KV;

  if (!kv) {
    return c.json(
      { success: false, error: 'REGISTRY_KV binding is not configured' },
      503
    );
  }

  const value = await kv.get(`registry:${serviceName}`);

  if (!value) {
    return c.json({ error: 'Service not found' }, 404);
  }

  return c.json(JSON.parse(value));
});

// Register a new service
registryRoute.post('/register', async (c) => {
  const kv = c.env.REGISTRY_KV;
  const body = await c.req.json<Partial<SchemaRegistration>>();

  if (!body.serviceName || !body.organization || !body.storageType) {
    return c.json({
      error: 'Missing required fields',
      required: ['serviceName', 'organization', 'storageType']
    }, 400);
  }

  // Determine tier based on organization and storage
  let tier: 1 | 2 | 3 = 3;
  if (['chittyfoundation', 'chittyos'].includes(body.organization) && body.storageType === 'postgresql') {
    tier = 1; // Source-controlled
  } else if (body.organization === 'chittyapps') {
    tier = 2; // Registry-validated
  }

  const registration: SchemaRegistration = {
    serviceName: body.serviceName,
    organization: body.organization,
    tier,
    storageType: body.storageType,
    schemaLocation: body.schemaLocation || '',
    schemaVersion: body.schemaVersion || '1.0.0',
    deployment: body.deployment || {},
    compliance: body.compliance || {
      temporal_versioning: false,
      gdpr_compliant: false,
      audit_logging: false,
      security_validated: false
    },
    patterns: body.patterns || {
      naming_convention: 'custom',
      primary_key_pattern: 'unknown',
      index_strategy: 'unknown'
    },
    validation: {
      status: 'pending',
      last_validated: new Date().toISOString()
    },
    metadata: {
      description: body.metadata?.description,
      repository: body.metadata?.repository,
      documentation: body.metadata?.documentation,
      contact: body.metadata?.contact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };

  if (!kv) {
    return c.json(
      { success: false, error: 'REGISTRY_KV binding is not configured' },
      503
    );
  }

  // Store in KV
  await kv.put(`registry:${registration.serviceName}`, JSON.stringify(registration));

  return c.json({
    success: true,
    registration,
    next_steps: [
      `Validate schema: POST /api/registry/validate/${registration.serviceName}`,
      `View status: GET /api/registry/${registration.serviceName}`,
      'Fix any compliance issues',
      'Revalidate to get badge'
    ]
  }, 201);
});

/**
 * Validate a service's schema compliance.
 *
 * POST /api/registry/validate/:serviceName
 * Body: { repoUrl: string, branch?: string }
 *
 * Fetches the candidate repo's compliance artifacts from GitHub raw URLs
 * (database-config.json, CHARTER.md, CHITTY.md, CLAUDE.md, package.json),
 * runs deterministic checks, returns a real score in [0,100].
 *
 * If `repoUrl` is omitted but the service is in the registry KV with
 * a `metadata.repository` field, that repo is used.
 */
registryRoute.post('/validate/:serviceName', async (c) => {
  const serviceName = c.req.param('serviceName');
  const body = await c
    .req
    .json<Partial<RegistrationValidationRequest>>()
    .catch(() => ({} as Partial<RegistrationValidationRequest>));

  // Resolve repo URL: explicit body wins, otherwise look up in KV
  let repoUrl = body.repoUrl;
  let branch = body.branch || 'main';

  const kv = c.env.REGISTRY_KV;
  let registration: SchemaRegistration | null = null;
  if (kv) {
    const existing = await kv.get(`registry:${serviceName}`);
    if (existing) {
      registration = JSON.parse(existing) as SchemaRegistration;
      if (!repoUrl) repoUrl = registration.metadata?.repository;
    }
  }

  if (!repoUrl) {
    return c.json(
      {
        error: 'Missing repoUrl',
        message:
          'Provide repoUrl in body, or register the service first with metadata.repository so it can be looked up.',
      },
      400
    );
  }

  // Validate repo URL shape early so we return a clean 400 instead of a 500
  try {
    parseRepoUrl(repoUrl);
  } catch (err) {
    return c.json({ error: 'Invalid repoUrl', message: (err as Error).message }, 400);
  }

  let complianceCheck;
  try {
    complianceCheck = await validateRegistration(
      { serviceName, repoUrl, branch },
      { githubToken: c.env.GITHUB_TOKEN }
    );
  } catch (err) {
    console.error('Registration validation error:', err);
    return c.json(
      {
        error: 'Validation failed',
        message: (err as Error).message,
        service: serviceName,
        repoUrl,
        branch,
      },
      502
    );
  }

  // Persist validation outcome on the registry entry if present
  if (kv && registration) {
    registration.validation = {
      status:
        complianceCheck.overall_status === 'non_compliant'
          ? 'non_compliant'
          : 'validated',
      last_validated: new Date().toISOString(),
      badge_url: `https://schema.chitty.cc/api/registry/${serviceName}/badge`,
    };
    // Map compliance check facts back onto the legacy SchemaRegistration shape
    registration.compliance = {
      temporal_versioning: registration.compliance?.temporal_versioning ?? false,
      gdpr_compliant: registration.compliance?.gdpr_compliant ?? false,
      audit_logging: registration.compliance?.audit_logging ?? false,
      security_validated: complianceCheck.overall_status !== 'non_compliant',
    };
    registration.metadata.updated_at = new Date().toISOString();
    await kv.put(`registry:${serviceName}`, JSON.stringify(registration));
  }

  const badgeColor = complianceCheck.badge;
  return c.json({
    service: serviceName,
    validation: complianceCheck,
    badge_markdown: `[![ChittySchema ${complianceCheck.overall_status}](https://schema.chitty.cc/api/registry/${serviceName}/badge)](https://schema.chitty.cc/api/registry/${serviceName}/compliance)`,
    badge_color: badgeColor,
    recommendations: complianceCheck.recommended.checks
      .filter((check) => !check.passed)
      .map((check) => check.message)
      .filter((m): m is string => typeof m === 'string'),
  });
});

// Get badge for a service
registryRoute.get('/:serviceName/badge', async (c) => {
  const serviceName = c.req.param('serviceName');
  const kv = c.env.REGISTRY_KV;

  if (!kv) {
    return c.json(
      { success: false, error: 'REGISTRY_KV binding is not configured' },
      503
    );
  }

  let status = 'unknown';
  let color = 'lightgrey';

  const value = await kv.get(`registry:${serviceName}`);
  if (value) {
    try {
      const registration = JSON.parse(value) as SchemaRegistration;
      status = registration.validation.status;
      color =
        status === 'validated'
          ? 'green'
          : status === 'pending'
            ? 'yellow'
            : status === 'non_compliant'
              ? 'red'
              : 'lightgrey';
    } catch {
      // Corrupt KV entry — keep "unknown"/"lightgrey"
    }
  }

  // Escape status text for safe SVG injection (defense in depth — status
  // values come from a closed enum, but the underlying KV could be tampered).
  const safeStatus = status.replace(/[<>&"']/g, '');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="20">
      <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
      </linearGradient>
      <mask id="a">
        <rect width="180" height="20" rx="3" fill="#fff"/>
      </mask>
      <g mask="url(#a)">
        <path fill="#555" d="M0 0h95v20H0z"/>
        <path fill="${color}" d="M95 0h85v20H95z"/>
        <path fill="url(#b)" d="M0 0h180v20H0z"/>
      </g>
      <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
        <text x="47.5" y="15" fill="#010101" fill-opacity=".3">ChittySchema</text>
        <text x="47.5" y="14">ChittySchema</text>
        <text x="137.5" y="15" fill="#010101" fill-opacity=".3">${safeStatus}</text>
        <text x="137.5" y="14">${safeStatus}</text>
      </g>
    </svg>
  `.trim();

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'max-age=300');
  return c.body(svg);
});

/**
 * Compliance report for a registered service.
 *
 * Renders the persisted ComplianceCheck (from POST /validate/:serviceName)
 * as HTML. No hardcoded scores, no fixture services — if the registry
 * has no record, return 404. If the record exists but no validation
 * has been run yet, render the "pending" state explicitly.
 */
registryRoute.get('/:serviceName/compliance', async (c) => {
  const serviceName = c.req.param('serviceName');
  const kv = c.env.REGISTRY_KV;

  if (!kv) {
    return c.json(
      { success: false, error: 'REGISTRY_KV binding is not configured' },
      503
    );
  }

  const value = await kv.get(`registry:${serviceName}`);
  if (!value) {
    return c.json({ error: 'Service not found' }, 404);
  }

  let registration: SchemaRegistration;
  try {
    registration = JSON.parse(value) as SchemaRegistration;
  } catch {
    return c.json({ error: 'Corrupt registry entry' }, 500);
  }

  const escape = (s: string): string =>
    s.replace(/[&<>"']/g, (ch) =>
      ch === '&'
        ? '&amp;'
        : ch === '<'
          ? '&lt;'
          : ch === '>'
            ? '&gt;'
            : ch === '"'
              ? '&quot;'
              : '&#39;'
    );

  const status = registration.validation.status;
  const badgeColor =
    status === 'validated'
      ? 'green'
      : status === 'pending'
        ? 'yellow'
        : status === 'non_compliant'
          ? 'red'
          : 'lightgrey';
  const lastValidated = registration.validation.last_validated || 'never';
  const compliance = registration.compliance;

  const checkRow = (passed: boolean, label: string) =>
    `<div class="check ${passed ? 'pass' : 'fail'}">${
      passed ? '✅' : '❌'
    } ${escape(label)}</div>`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(serviceName)} - ChittySchema Compliance Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; }
    .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.9em; font-weight: 600; }
    .badge.green { background: #10b981; color: white; }
    .badge.yellow { background: #f59e0b; color: white; }
    .badge.red { background: #ef4444; color: white; }
    .badge.lightgrey { background: #9ca3af; color: white; }
    .check { margin: 10px 0; }
    .check.pass { color: #10b981; }
    .check.fail { color: #ef4444; }
    .meta { font-size: 0.85em; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escape(serviceName)}</h1>
    <p>ChittySchema Compliance Report</p>
    <span class="badge ${badgeColor}">${escape(status)}</span>
    <p class="meta">Last validated: ${escape(lastValidated)}</p>
    <p class="meta">Tier ${registration.tier} · ${escape(registration.organization)} · ${escape(registration.storageType)}</p>
  </div>

  <div class="card">
    <h2>Compliance Facts</h2>
    ${checkRow(compliance.temporal_versioning, 'Temporal versioning (updated_at, deleted_at)')}
    ${checkRow(compliance.audit_logging, 'Audit logging')}
    ${checkRow(compliance.security_validated, 'Security validated (no plaintext secrets)')}
    ${checkRow(compliance.gdpr_compliant, 'GDPR compliance')}
  </div>

  <div class="card">
    <h2>Run a Fresh Validation</h2>
    <pre><code>curl -X POST https://schema.chitty.cc/api/registry/validate/${escape(serviceName)} \\
  -H 'Content-Type: application/json' \\
  -d '{"repoUrl":"${escape(registration.metadata?.repository ?? 'https://github.com/...')}"}'</code></pre>
  </div>

  <div class="card">
    <h2>Badge</h2>
    <img src="/api/registry/${escape(serviceName)}/badge" alt="ChittySchema Badge">
    <pre><code>[![ChittySchema ${escape(status)}](https://schema.chitty.cc/api/registry/${escape(serviceName)}/badge)](https://schema.chitty.cc/api/registry/${escape(serviceName)}/compliance)</code></pre>
  </div>
</body>
</html>
  `.trim();

  c.header('Content-Type', 'text/html');
  return c.html(html);
});
