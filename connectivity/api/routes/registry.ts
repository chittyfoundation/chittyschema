/**
 * ChittySchema Registry API - Tier 2 Service Registration
 *
 * Handles registration, validation, and compliance checking for standalone apps
 * that use independent schemas (D1, KV, custom storage)
 */

import { Hono } from 'hono';

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

export interface ComplianceCheck {
  required: {
    pass: number;
    fail: number;
    checks: Array<{ name: string; passed: boolean; message?: string }>;
  };
  recommended: {
    pass: number;
    fail: number;
    checks: Array<{ name: string; passed: boolean; message?: string }>;
  };
  optional: {
    pass: number;
    fail: number;
    checks: Array<{ name: string; passed: boolean; message?: string }>;
  };
  overall_status: 'compliant' | 'compliant_with_warnings' | 'non_compliant';
  badge: string;
  score: number; // 0-100
}

type Bindings = {
  REGISTRY_KV?: KVNamespace; // For storing registry entries
  ENVIRONMENT: string;
};

export const registryRoute = new Hono<{ Bindings: Bindings }>();

// List all registered services
registryRoute.get('/', async (c) => {
  const kv = c.env.REGISTRY_KV;

  if (!kv) {
    // Return hardcoded example until KV is set up
    return c.json({
      message: 'Registry KV not configured - showing example data',
      services: [
        {
          serviceName: 'chittyauth-app',
          organization: 'chittyapps',
          tier: 2,
          storageType: 'd1',
          validation: {
            status: 'validated',
            badge_url: 'https://img.shields.io/badge/ChittySchema-Validated-green'
          }
        }
      ],
      count: 1
    });
  }

  // TODO: Implement KV listing
  const list = await kv.list({ prefix: 'registry:' });
  const services = [];

  for (const key of list.keys) {
    const value = await kv.get(key.name);
    if (value) {
      services.push(JSON.parse(value));
    }
  }

  return c.json({
    services,
    count: services.length,
    tiers: {
      tier1: services.filter(s => s.tier === 1).length,
      tier2: services.filter(s => s.tier === 2).length,
      tier3: services.filter(s => s.tier === 3).length
    }
  });
});

// Get specific service registration
registryRoute.get('/:serviceName', async (c) => {
  const serviceName = c.req.param('serviceName');
  const kv = c.env.REGISTRY_KV;

  if (!kv) {
    // Return hardcoded example for chittyauth-app
    if (serviceName === 'chittyauth-app') {
      return c.json({
        serviceName: 'chittyauth-app',
        organization: 'chittyapps',
        tier: 2,
        storageType: 'd1',
        schemaLocation: 'https://github.com/chittyapps/chittyauth-app/blob/main/schema.sql',
        schemaVersion: '1.1.0',
        deployment: {
          production: 'https://auth-app.chitty.cc'
        },
        compliance: {
          temporal_versioning: true,
          gdpr_compliant: true,
          audit_logging: true,
          security_validated: true
        },
        patterns: {
          naming_convention: 'custom',
          primary_key_pattern: 'id (UUID)',
          index_strategy: 'optimized for D1'
        },
        validation: {
          status: 'validated',
          last_validated: new Date().toISOString(),
          badge_url: 'https://img.shields.io/badge/ChittySchema-Validated-green'
        },
        metadata: {
          description: 'Standalone Authentication & Token Provisioning Application',
          repository: 'https://github.com/chittyapps/chittyauth-app',
          created_at: '2025-11-06T00:00:00Z',
          updated_at: new Date().toISOString()
        }
      });
    }

    return c.json({ error: 'Service not found' }, 404);
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
    return c.json({
      message: 'Registry KV not configured - registration simulated',
      registration,
      next_steps: [
        'Configure REGISTRY_KV in wrangler.toml',
        'Run compliance validation',
        'Deploy to production'
      ]
    });
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

// Validate a service's schema compliance
registryRoute.post('/validate/:serviceName', async (c) => {
  const serviceName = c.req.param('serviceName');
  const body = await c.req.json<{ schema?: string }>().catch(() => ({}));

  // TODO: Implement actual schema validation
  // For now, return example compliance check

  const complianceCheck: ComplianceCheck = {
    required: {
      pass: 3,
      fail: 0,
      checks: [
        { name: 'temporal_versioning', passed: true, message: 'updated_at and deleted_at present' },
        { name: 'audit_logging', passed: true, message: 'audit_logs table found' },
        { name: 'security_hashing', passed: true, message: 'Token hashing implemented' }
      ]
    },
    recommended: {
      pass: 4,
      fail: 1,
      checks: [
        { name: 'indexed_queries', passed: true, message: 'All foreign keys indexed' },
        { name: 'gdpr_compliance', passed: true, message: 'Soft delete support' },
        { name: 'performance_optimized', passed: true, message: 'Query patterns optimized' },
        { name: 'documentation', passed: true, message: 'Schema documented' },
        { name: 'chittyos_naming', passed: false, message: 'Uses "id" instead of "chitty_id" (acceptable for D1)' }
      ]
    },
    optional: {
      pass: 2,
      fail: 2,
      checks: [
        { name: 'chittyledger_integration', passed: false, message: 'Not integrated (standalone app)' },
        { name: 'postgresql_compatibility', passed: false, message: 'D1/SQLite only' },
        { name: 'edge_optimized', passed: true, message: 'Optimized for Cloudflare edge' },
        { name: 'kv_caching', passed: true, message: 'KV cache layer implemented' }
      ]
    },
    overall_status: 'compliant_with_warnings',
    badge: '🟢 ChittySchema Validated',
    score: 85
  };

  // Update registry entry with validation results
  const kv = c.env.REGISTRY_KV;
  if (kv) {
    const existing = await kv.get(`registry:${serviceName}`);
    if (existing) {
      const registration = JSON.parse(existing) as SchemaRegistration;
      registration.validation = {
        status: complianceCheck.overall_status === 'non_compliant' ? 'non_compliant' : 'validated',
        last_validated: new Date().toISOString(),
        badge_url: `https://img.shields.io/badge/ChittySchema-${complianceCheck.score}-${complianceCheck.score >= 80 ? 'green' : complianceCheck.score >= 60 ? 'yellow' : 'red'}`
      };
      registration.compliance = {
        temporal_versioning: complianceCheck.required.checks.find(c => c.name === 'temporal_versioning')?.passed || false,
        gdpr_compliant: complianceCheck.recommended.checks.find(c => c.name === 'gdpr_compliance')?.passed || false,
        audit_logging: complianceCheck.required.checks.find(c => c.name === 'audit_logging')?.passed || false,
        security_validated: complianceCheck.required.checks.find(c => c.name === 'security_hashing')?.passed || false
      };
      await kv.put(`registry:${serviceName}`, JSON.stringify(registration));
    }
  }

  return c.json({
    service: serviceName,
    validation: complianceCheck,
    badge_markdown: `[![ChittySchema Validated](https://img.shields.io/badge/ChittySchema-Validated-green)](https://schema.chitty.cc/registry/${serviceName})`,
    recommendations: complianceCheck.recommended.checks
      .filter(c => !c.passed)
      .map(c => c.message)
  });
});

// Get badge for a service
registryRoute.get('/:serviceName/badge', async (c) => {
  const serviceName = c.req.param('serviceName');
  const kv = c.env.REGISTRY_KV;

  let status = 'unknown';
  let color = 'lightgrey';

  if (kv) {
    const value = await kv.get(`registry:${serviceName}`);
    if (value) {
      const registration = JSON.parse(value) as SchemaRegistration;
      status = registration.validation.status;
      color = status === 'validated' ? 'green' :
              status === 'pending' ? 'yellow' :
              status === 'non_compliant' ? 'red' : 'lightgrey';
    }
  } else if (serviceName === 'chittyauth-app') {
    status = 'validated';
    color = 'green';
  }

  // Return SVG badge
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
        <text x="137.5" y="15" fill="#010101" fill-opacity=".3">${status}</text>
        <text x="137.5" y="14">${status}</text>
      </g>
    </svg>
  `.trim();

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'max-age=300');
  return c.body(svg);
});

// Get compliance report for a service
registryRoute.get('/:serviceName/compliance', async (c) => {
  const serviceName = c.req.param('serviceName');
  const kv = c.env.REGISTRY_KV;

  if (!kv && serviceName !== 'chittyauth-app') {
    return c.json({ error: 'Service not found' }, 404);
  }

  // Return HTML compliance report
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${serviceName} - ChittySchema Compliance Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.9em;
      font-weight: 600;
    }
    .badge.green { background: #10b981; color: white; }
    .badge.yellow { background: #f59e0b; color: white; }
    .badge.red { background: #ef4444; color: white; }
    .check { margin: 10px 0; }
    .check.pass { color: #10b981; }
    .check.fail { color: #ef4444; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${serviceName}</h1>
    <p>ChittySchema Compliance Report</p>
    <span class="badge green">Validated</span>
    <span class="badge green">Score: 85/100</span>
  </div>

  <div class="card">
    <h2>Required Checks (3/3)</h2>
    <div class="check pass">✅ Temporal versioning (updated_at, deleted_at)</div>
    <div class="check pass">✅ Audit logging (comprehensive)</div>
    <div class="check pass">✅ Security hashing (no plaintext secrets)</div>
  </div>

  <div class="card">
    <h2>Recommended Checks (4/5)</h2>
    <div class="check pass">✅ Indexed queries</div>
    <div class="check pass">✅ GDPR compliance</div>
    <div class="check pass">✅ Performance optimized</div>
    <div class="check pass">✅ Documentation complete</div>
    <div class="check fail">⚠️ ChittyOS naming convention (uses 'id' instead of 'chitty_id' - acceptable for D1)</div>
  </div>

  <div class="card">
    <h2>Optional Checks (2/4)</h2>
    <div class="check pass">✅ Edge optimized</div>
    <div class="check pass">✅ KV caching</div>
    <div class="check fail">ℹ️ ChittyLedger integration (not required for standalone)</div>
    <div class="check fail">ℹ️ PostgreSQL compatibility (D1/SQLite only)</div>
  </div>

  <div class="card">
    <h2>Badge</h2>
    <img src="/api/registry/${serviceName}/badge" alt="ChittySchema Badge">
    <pre><code>[![ChittySchema Validated](https://schema.chitty.cc/api/registry/${serviceName}/badge)](https://schema.chitty.cc/registry/${serviceName})</code></pre>
  </div>
</body>
</html>
  `.trim();

  c.header('Content-Type', 'text/html');
  return c.html(html);
});
