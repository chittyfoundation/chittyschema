/**
 * Real-Miniflare integration tests for /meta routes.
 *
 * Doctrine: chittycanon://gov/governance#no-mocks-no-fakes
 *
 * The meta-schemas are loaded from the bundled `identity/schemas/meta/`
 * via the real Ajv-backed validator. No mocks of the validator or schemas.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { metaRoute } from '../connectivity/api/routes/meta';
import { createTestEnv, type TestHarness } from './helpers/miniflare-env';

let harness: TestHarness;
let app: Hono;

beforeEach(async () => {
  harness = await createTestEnv();
  app = new Hono();
  app.route('/meta', metaRoute);
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

describe('GET /meta', () => {
  it('lists every bundled meta-schema with $id + validate URL', async () => {
    const res = await fetchApp('/meta');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      count: number;
      schemas: Array<{ name: string; $id?: string; validateUrl: string }>;
    };
    expect(body.count).toBeGreaterThan(0);
    expect(body.schemas.find((s) => s.name === 'manifest')).toBeDefined();
    expect(body.schemas.find((s) => s.name === 'table-owner')).toBeDefined();
    for (const s of body.schemas) {
      expect(s.validateUrl).toMatch(/\/meta\/[\w-]+\/validate/);
    }
  });
});

describe('GET /meta/:name', () => {
  it('serves the manifest meta-schema with all five canonType enums', async () => {
    const res = await fetchApp('/meta/manifest');
    expect(res.status).toBe(200);
    const schema = (await res.json()) as {
      $id?: string;
      $defs?: {
        TableOwner?: { properties?: { canonType?: { enum?: string[] } } };
      };
    };
    expect(schema.$id).toBeDefined();
    const canonEnum =
      schema.$defs?.TableOwner?.properties?.canonType?.enum ?? [];
    expect([...canonEnum].sort()).toEqual(['A', 'E', 'L', 'P', 'T']);
  });

  it('also accepts the .schema.json suffix', async () => {
    const res = await fetchApp('/meta/manifest.schema.json');
    expect(res.status).toBe(200);
  });

  it('404s for unknown schemas', async () => {
    const res = await fetchApp('/meta/totally-fake-schema');
    expect(res.status).toBe(404);
  });
});

describe('POST /meta/:name/validate', () => {
  it('200s on a valid table-owner document', async () => {
    const validDoc = {
      table: 'identities',
      database: 'chittyos-core',
      service: 'chittyid',
      repo: 'CHITTYFOUNDATION/chittyid',
      authoringFile: 'migrations/001_init.sql',
      canonType: 'P',
      semver: '1.0.0',
      legalHold: false,
    };
    const res = await fetchApp('/meta/table-owner/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validDoc),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean; errors: unknown[] };
    expect(body.valid).toBe(true);
    expect(body.errors).toEqual([]);
  });

  it('422s on invalid canonType (rejects non-P/L/T/E/A)', async () => {
    const invalidDoc = {
      table: 'identities',
      database: 'chittyos-core',
      service: 'chittyid',
      repo: 'CHITTYFOUNDATION/chittyid',
      authoringFile: 'migrations/001_init.sql',
      canonType: 'X', // not one of P/L/T/E/A — must be rejected
      semver: '1.0.0',
      legalHold: false,
    };
    const res = await fetchApp('/meta/table-owner/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidDoc),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      valid: boolean;
      errors: Array<{ path?: string; message?: string }>;
    };
    expect(body.valid).toBe(false);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('400s on non-JSON body', async () => {
    const res = await fetchApp('/meta/table-owner/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{',
    });
    expect(res.status).toBe(400);
  });

  it('404s for unknown meta-schema', async () => {
    const res = await fetchApp('/meta/totally-fake-schema/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
  });
});
