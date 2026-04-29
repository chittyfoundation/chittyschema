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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
