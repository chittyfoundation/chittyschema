/**
 * Real-Miniflare integration tests for /api/owners routes.
 *
 * Doctrine: chittycanon://gov/governance#no-mocks-no-fakes
 *
 * Beacon endpoints persist into a real KV (Miniflare). Manifest endpoints
 * are deterministic over the bundled `database-config.json` — no mocks.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { ownersRoute } from '../connectivity/api/routes/owners';
import { createTestEnv, type TestHarness } from './helpers/miniflare-env';

let harness: TestHarness;
let app: Hono;

beforeEach(async () => {
  harness = await createTestEnv();
  app = new Hono();
  app.route('/api/owners', ownersRoute);
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

describe('GET /api/owners', () => {
  it('returns the bundled tableOwners manifest', async () => {
    const res = await fetchApp('/api/owners');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      owners: Array<{ table: string; canonType?: string }>;
      count: number;
    };
    expect(Array.isArray(body.owners)).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    // Every entry that declares a canonType MUST be one of P/L/T/E/A
    const types = new Set(
      body.owners.map((t) => t.canonType).filter(Boolean)
    );
    for (const t of types) {
      expect(['P', 'L', 'T', 'E', 'A']).toContain(t);
    }
  });

  it('filters by canonType', async () => {
    const res = await fetchApp('/api/owners?canonType=P');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      owners: Array<{ canonType?: string }>;
      count: number;
    };
    expect(body.count).toBeGreaterThan(0);
    for (const t of body.owners) {
      expect(t.canonType).toBe('P');
    }
  });
});

describe('GET /api/owners/summary', () => {
  it('returns rollup counts including all canonical types present', async () => {
    const res = await fetchApp('/api/owners/summary');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      byCanonType: Record<string, number>;
      totalManifestedTables: number;
    };
    expect(body.totalManifestedTables).toBeGreaterThan(0);
    // The bundled manifest covers all five P/L/T/E/A types — see PR #28 audit.
    for (const code of ['P', 'L', 'T', 'E', 'A']) {
      expect(body.byCanonType[code]).toBeGreaterThan(0);
    }
  });
});

describe('POST /api/owners/announce', () => {
  it('503s when neither BEACON_STORE nor REGISTRY_KV is bound', async () => {
    const envWithoutKv = { ENVIRONMENT: 'test' };
    const res = await app.fetch(
      new Request('http://test.local/api/owners/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'svc', version: '1.0.0' }),
      }),
      envWithoutKv,
      harness.ctx
    );
    expect(res.status).toBe(503);
  });

  it('persists a valid announcement into BEACON_STORE', async () => {
    const res = await fetchApp('/api/owners/announce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'chittyschema',
        version: '0.2.0',
        gitSha: 'abc123def456',
        deployedAt: '2026-04-29T00:00:00Z',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      announcement: { service: string };
    };
    expect(body.success).toBe(true);
    expect(body.announcement.service).toBe('chittyschema');

    // Confirm it actually landed in real KV.
    const stored = await harness.env.BEACON_STORE.get('beacon:chittyschema');
    expect(stored).not.toBeNull();
  });

  it('400s when the body fails meta-schema validation', async () => {
    const res = await fetchApp('/api/owners/announce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // missing required service+version
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { validation?: unknown };
    expect(body.validation).toBeDefined();
  });
});

describe('GET /api/owners/announcements', () => {
  it('returns the persisted announcement set', async () => {
    await fetchApp('/api/owners/announce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'svc-a',
        version: '1.0.0',
      }),
    });
    await fetchApp('/api/owners/announce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'svc-b',
        version: '2.0.0',
      }),
    });

    const res = await fetchApp('/api/owners/announcements');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      announcements: Array<{ service: string }>;
    };
    expect(body.announcements.map((a) => a.service).sort()).toEqual([
      'svc-a',
      'svc-b',
    ]);
  });
});
