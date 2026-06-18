/**
 * Real-Miniflare integration tests for /api/tools (canonical tool-schema surface).
 * Exercises the actual Hono handlers + real Cloudflare KV via Miniflare.
 * No vi.mock, no fixture data. Mirrors tests/registry.test.ts discipline.
 * @canon chittycanon://gov/governance#no-mocks-no-fakes
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { toolsRoute } from '../connectivity/api/routes/tools';
import { createTestEnv, type TestHarness } from './helpers/miniflare-env';

let harness: TestHarness;
let app: Hono;

beforeEach(async () => {
  harness = await createTestEnv();
  app = new Hono();
  app.route('/api/tools', toolsRoute);
});

afterEach(async () => {
  await harness.dispose();
});

const fetchApp = (path: string, init?: RequestInit) =>
  app.fetch(
    new Request(`http://test.local${path}`, init),
    harness.env as unknown as Record<string, unknown>,
    harness.ctx,
  );

// A real "Russian doll" input schema (input -> params wrapper).
const DOLL = {
  type: 'object',
  properties: {
    input: {
      type: 'object',
      properties: {
        params: {
          type: 'object',
          properties: {
            entityType: { type: 'string', enum: ['P', 'L', 'T', 'E', 'A'] },
          },
          required: ['entityType'],
        },
      },
    },
  },
};

describe('POST /api/tools/register', () => {
  it('400s when required fields are missing', async () => {
    const res = await fetchApp('/api/tools/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: 'x' }),
    });
    expect(res.status).toBe(400);
  });

  it('normalizes the doll and persists canonicalSchema + original to KV', async () => {
    const res = await fetchApp('/api/tools/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server: 'chittyos',
        name: 'mint',
        description: 'Mint a ChittyID',
        inputSchema: DOLL,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    // Flattened: entityType is hoisted to the top level.
    expect(body.tool.canonicalSchema.properties).toHaveProperty('entityType');
    expect(body.tool.canonicalSchema.properties).not.toHaveProperty('input');
    expect(body.tool.envelopeDepth).toBe(2);

    const stored = await harness.env.REGISTRY_KV.get('tool:chittyos:mint');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.originalSchema.properties).toHaveProperty('input');
    expect(parsed.canonicalSchema.properties.entityType.enum).toEqual([
      'P', 'L', 'T', 'E', 'A',
    ]);
  });
});

describe('GET /api/tools/:server/:name', () => {
  it('404s when nothing persisted', async () => {
    const res = await fetchApp('/api/tools/none/none');
    expect(res.status).toBe(404);
  });

  it('returns the persisted canonical entry', async () => {
    await harness.env.REGISTRY_KV.put(
      'tool:srv:foo',
      JSON.stringify({
        server: 'srv',
        name: 'foo',
        description: 'd',
        canonicalSchema: { type: 'object', properties: { a: { type: 'string' } } },
        originalSchema: { type: 'object', properties: { a: { type: 'string' } } },
        envelopeDepth: 0,
        updated_at: '2026-06-18T00:00:00Z',
      }),
    );
    const res = await fetchApp('/api/tools/srv/foo');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe('foo');
  });
});

describe('GET /api/tools and /api/tools/:server', () => {
  it('lists across all servers and per server', async () => {
    await fetchApp('/api/tools/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: 'a', name: 't1', inputSchema: { type: 'object', properties: {} } }),
    });
    await fetchApp('/api/tools/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: 'b', name: 't2', inputSchema: { type: 'object', properties: {} } }),
    });

    const all = await fetchApp('/api/tools');
    const allBody = (await all.json()) as any;
    expect(allBody.count).toBe(2);
    expect(allBody.servers.sort()).toEqual(['a', 'b']);

    const perServer = await fetchApp('/api/tools/a');
    const perBody = (await perServer.json()) as any;
    expect(perBody.count).toBe(1);
    expect(perBody.tools[0].name).toBe('t1');
  });

  it('skips corrupt entries instead of failing the listing', async () => {
    await harness.env.REGISTRY_KV.put('tool:c:good', JSON.stringify({ server: 'c', name: 'good' }));
    await harness.env.REGISTRY_KV.put('tool:c:bad', '{not json');
    const res = await fetchApp('/api/tools');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.count).toBe(1);
  });
});

describe('POST /api/tools/validate', () => {
  it('reports envelopeDepth and returns the flattened schema without persisting', async () => {
    const res = await fetchApp('/api/tools/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputSchema: DOLL }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.envelopeDepth).toBe(2);
    expect(body.jacked).toBe(true);
    expect(body.canonicalSchema.properties).toHaveProperty('entityType');

    // Nothing persisted.
    const list = await harness.env.REGISTRY_KV.list({ prefix: 'tool:' });
    expect(list.keys.length).toBe(0);
  });
});

describe('all-routes: missing KV binding', () => {
  it('returns 503 when REGISTRY_KV is unbound', async () => {
    const res = await app.fetch(
      new Request('http://test.local/api/tools'),
      { ENVIRONMENT: 'test' },
      harness.ctx,
    );
    expect(res.status).toBe(503);
  });
});
