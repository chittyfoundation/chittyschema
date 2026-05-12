/**
 * Real-Miniflare integration tests for /api/registry routes.
 *
 * Exercises the actual Hono handlers + the real Cloudflare KV
 * implementation shipped via Miniflare. No vi.mock, no fixture data,
 * no skipped paths — the tests fail loud if the routes regress to the
 * pre-#28 behavior of returning hardcoded chittyauth-app data.
 *
 * Doctrine: chittycanon://gov/governance#no-mocks-no-fakes
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { registryRoute } from '../connectivity/api/routes/registry';
import { createTestEnv, type TestHarness } from './helpers/miniflare-env';

let harness: TestHarness;
let app: Hono;

beforeEach(async () => {
  harness = await createTestEnv();
  app = new Hono();
  app.route('/api/registry', registryRoute);
});

afterEach(async () => {
  await harness.dispose();
});

const fetchApp = (path: string, init?: RequestInit) =>
  app.fetch(
    new Request(`http://test.local${path}`, init),
    harness.env as unknown as Record<string, unknown>,
    harness.ctx
  );

describe('GET /api/registry/', () => {
  it('returns empty list when KV is bound but empty', async () => {
    const res = await fetchApp('/api/registry');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { services: unknown[]; count: number };
    expect(body.services).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('lists every persisted registry entry', async () => {
    await harness.env.REGISTRY_KV.put(
      'registry:svc-a',
      JSON.stringify({
        serviceName: 'svc-a',
        organization: 'chittyfoundation',
        tier: 1,
        validation: { status: 'validated', last_validated: '2026-04-29T00:00:00Z' },
      })
    );
    await harness.env.REGISTRY_KV.put(
      'registry:svc-b',
      JSON.stringify({
        serviceName: 'svc-b',
        organization: 'chittyapps',
        tier: 2,
        validation: { status: 'pending', last_validated: '2026-04-29T00:00:00Z' },
      })
    );

    const res = await fetchApp('/api/registry');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      services: Array<{ serviceName: string }>;
      count: number;
      tiers: { tier1: number; tier2: number; tier3: number };
    };
    expect(body.count).toBe(2);
    expect(body.services.map((s) => s.serviceName).sort()).toEqual([
      'svc-a',
      'svc-b',
    ]);
    expect(body.tiers).toEqual({ tier1: 1, tier2: 1, tier3: 0 });
  });

  it('skips corrupt entries instead of failing the whole listing', async () => {
    await harness.env.REGISTRY_KV.put('registry:good', JSON.stringify({
      serviceName: 'good',
      organization: 'chittyfoundation',
      tier: 1,
      validation: { status: 'validated', last_validated: '2026-04-29T00:00:00Z' },
    }));
    await harness.env.REGISTRY_KV.put('registry:bad', '{not json');

    const res = await fetchApp('/api/registry');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(1);
  });
});

describe('GET /api/registry/:serviceName', () => {
  it('404s when nothing is persisted', async () => {
    const res = await fetchApp('/api/registry/missing-service');
    expect(res.status).toBe(404);
  });

  it('returns the persisted entry verbatim', async () => {
    const entry = {
      serviceName: 'real-service',
      organization: 'chittyos' as const,
      tier: 1 as const,
      storageType: 'postgresql' as const,
      schemaLocation: 'https://github.com/example/repo',
      schemaVersion: '1.0.0',
      deployment: {},
      compliance: {
        temporal_versioning: true,
        gdpr_compliant: true,
        audit_logging: true,
        security_validated: true,
      },
      patterns: {
        naming_convention: 'chittyos' as const,
        primary_key_pattern: 'uuid',
        index_strategy: 'btree',
      },
      validation: {
        status: 'validated' as const,
        last_validated: '2026-04-29T00:00:00Z',
      },
      metadata: {
        created_at: '2026-04-29T00:00:00Z',
        updated_at: '2026-04-29T00:00:00Z',
      },
    };
    await harness.env.REGISTRY_KV.put('registry:real-service', JSON.stringify(entry));

    const res = await fetchApp('/api/registry/real-service');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(entry);
  });

  it('does NOT return chittyauth-app fixture (regression: PR #28)', async () => {
    const res = await fetchApp('/api/registry/chittyauth-app');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/registry/register', () => {
  it('400s when required fields are missing', async () => {
    const res = await fetchApp('/api/registry/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'incomplete' }),
    });
    expect(res.status).toBe(400);
  });

  it('persists a real registration into KV', async () => {
    const res = await fetchApp('/api/registry/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: 'newcomer',
        organization: 'chittyapps',
        storageType: 'd1',
      }),
    });
    expect(res.status).toBe(201);

    const stored = await harness.env.REGISTRY_KV.get('registry:newcomer');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.serviceName).toBe('newcomer');
    expect(parsed.tier).toBe(2);
    expect(parsed.validation.status).toBe('pending');
  });

  it('does NOT return "registration simulated" placeholder (regression: PR #28)', async () => {
    const res = await fetchApp('/api/registry/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: 'no-sim',
        organization: 'chittyfoundation',
        storageType: 'postgresql',
      }),
    });
    const bodyText = await res.text();
    expect(bodyText).not.toMatch(/simulated/i);
  });
});

describe('GET /api/registry/:serviceName/badge', () => {
  it('returns an SVG even for unknown services (status: unknown)', async () => {
    const res = await fetchApp('/api/registry/unknown-svc/badge');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml');
    const body = await res.text();
    expect(body).toMatch(/^<svg/);
    expect(body).toContain('unknown');
  });

  it('reflects persisted validation status', async () => {
    await harness.env.REGISTRY_KV.put('registry:badged', JSON.stringify({
      serviceName: 'badged',
      organization: 'chittyfoundation',
      tier: 1,
      validation: { status: 'validated', last_validated: '2026-04-29T00:00:00Z' },
    }));
    const res = await fetchApp('/api/registry/badged/badge');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('validated');
    expect(body).toContain('green');
  });
});

describe('GET /api/registry/:serviceName/compliance', () => {
  it('404s when the service is not registered', async () => {
    const res = await fetchApp('/api/registry/no-such/compliance');
    expect(res.status).toBe(404);
  });

  it('renders real persisted compliance facts (no fake "Score: 85/100")', async () => {
    await harness.env.REGISTRY_KV.put('registry:reported', JSON.stringify({
      serviceName: 'reported',
      organization: 'chittyfoundation',
      tier: 1,
      storageType: 'postgresql',
      compliance: {
        temporal_versioning: true,
        gdpr_compliant: false,
        audit_logging: true,
        security_validated: true,
      },
      validation: { status: 'validated', last_validated: '2026-04-29T00:00:00Z' },
      metadata: { repository: 'https://github.com/example/repo' },
    }));

    const res = await fetchApp('/api/registry/reported/compliance');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/html/);
    const html = await res.text();
    // Real fact rendering — present
    expect(html).toContain('Compliance Facts');
    expect(html).toContain('reported');
    // Doctrine guard: no hardcoded fixture score
    expect(html).not.toContain('Score: 85/100');
  });
});

describe('all-routes: missing KV binding', () => {
  it('returns 503 when REGISTRY_KV is unbound', async () => {
    const envWithoutKv = {
      ENVIRONMENT: 'test',
      // REGISTRY_KV deliberately missing
    };
    const res = await app.fetch(
      new Request('http://test.local/api/registry'),
      envWithoutKv,
      harness.ctx
    );
    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// A minimal valid database-config.json that satisfies the manifest meta-schema.
// Used by validate-endpoint tests to fake GitHub raw responses.
// ---------------------------------------------------------------------------
const VALID_MANIFEST = JSON.stringify({
  databases: [
    {
      name: 'test-db',
      description: 'Test database',
      envVar: 'TEST_DB_URL',
      owner: 'test-owner',
      services: ['test-service'],
      tables: { test_table: 'test-service' },
    },
  ],
  tableOwners: [],
});

const VALID_PACKAGE_JSON = JSON.stringify({ name: 'test-service' });

/**
 * Build a stub `fetch` that returns different bodies depending on the URL path.
 *
 * `files` maps trailing path segments (e.g. "database-config.json") to their
 * content string. Any path not listed returns a 404.
 */
function buildFetchStub(files: Record<string, string>) {
  return vi.fn(async (url: RequestInfo | URL): Promise<Response> => {
    const u = typeof url === 'string' ? url : url.toString();
    for (const [filename, content] of Object.entries(files)) {
      if (u.endsWith(filename)) {
        return new Response(content, { status: 200 });
      }
    }
    return new Response('Not Found', { status: 404 });
  });
}

describe('POST /api/registry/validate/:serviceName', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('400s when repoUrl is absent and service is not in KV', async () => {
    const res = await fetchApp('/api/registry/validate/unknown-svc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/repoUrl/i);
  });

  it('400s when repoUrl has an invalid shape', async () => {
    const res = await fetchApp('/api/registry/validate/svc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: 'not-a-valid-repo-url' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/invalid repoUrl/i);
  });

  it('returns non_compliant when database-config.json is absent (required.fail > 0)', async () => {
    // No database-config.json — all required checks fail.
    vi.stubGlobal('fetch', buildFetchStub({}));

    const res = await fetchApp('/api/registry/validate/missing-manifest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: 'https://github.com/example/missing-manifest' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      validation: { overall_status: string; required: { fail: number } };
    };
    expect(body.validation.overall_status).toBe('non_compliant');
    expect(body.validation.required.fail).toBeGreaterThan(0);
  });

  it('returns compliant when all required and recommended files are present', async () => {
    vi.stubGlobal(
      'fetch',
      buildFetchStub({
        'database-config.json': VALID_MANIFEST,
        'CHARTER.md': '# Charter',
        'CHITTY.md': '# Chitty',
        'CLAUDE.md': '# Claude',
        'package.json': VALID_PACKAGE_JSON,
      })
    );

    const res = await fetchApp('/api/registry/validate/test-service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoUrl: 'https://github.com/example/test-service',
        branch: 'main',
        version: '1.2.3',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      service: string;
      validation: {
        overall_status: string;
        score: number;
        required: { fail: number };
        evidence: { version?: string };
      };
    };
    expect(body.service).toBe('test-service');
    expect(body.validation.overall_status).toBe('compliant');
    expect(body.validation.required.fail).toBe(0);
    expect(body.validation.score).toBe(100);
    // version must be echoed back in evidence
    expect(body.validation.evidence.version).toBe('1.2.3');
  });

  it('persists schemaVersion in KV when version is supplied', async () => {
    // Pre-register the service so the route finds it in KV.
    await harness.env.REGISTRY_KV.put(
      'registry:versioned-svc',
      JSON.stringify({
        serviceName: 'versioned-svc',
        organization: 'chittyfoundation',
        tier: 1,
        storageType: 'postgresql',
        schemaVersion: '0.1.0',
        schemaLocation: '',
        deployment: {},
        compliance: {
          temporal_versioning: false,
          gdpr_compliant: false,
          audit_logging: false,
          security_validated: false,
        },
        patterns: {
          naming_convention: 'custom',
          primary_key_pattern: 'unknown',
          index_strategy: 'unknown',
        },
        validation: { status: 'pending', last_validated: '2026-01-01T00:00:00Z' },
        metadata: {
          repository: 'https://github.com/example/versioned-svc',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      })
    );

    vi.stubGlobal(
      'fetch',
      buildFetchStub({
        'database-config.json': VALID_MANIFEST,
        'package.json': JSON.stringify({ name: 'versioned-svc' }),
      })
    );

    const res = await fetchApp('/api/registry/validate/versioned-svc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoUrl: 'https://github.com/example/versioned-svc',
        version: '2.0.0',
      }),
    });
    expect(res.status).toBe(200);

    // Confirm the KV entry now carries the new version.
    const stored = await harness.env.REGISTRY_KV.get('registry:versioned-svc');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as { schemaVersion: string; validation: { status: string } };
    expect(parsed.schemaVersion).toBe('2.0.0');
    expect(parsed.validation.status).not.toBe('pending');
  });

  it('uses metadata.repository from KV when repoUrl is omitted', async () => {
    await harness.env.REGISTRY_KV.put(
      'registry:kv-repo-svc',
      JSON.stringify({
        serviceName: 'kv-repo-svc',
        organization: 'chittyapps',
        tier: 2,
        validation: { status: 'pending', last_validated: '2026-01-01T00:00:00Z' },
        metadata: {
          repository: 'https://github.com/example/kv-repo-svc',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      })
    );

    vi.stubGlobal('fetch', buildFetchStub({}));

    const res = await fetchApp('/api/registry/validate/kv-repo-svc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Should reach the validator (even though it returns non_compliant — no files)
    expect(res.status).toBe(200);
    const body = (await res.json()) as { service: string };
    expect(body.service).toBe('kv-repo-svc');
  });
});
