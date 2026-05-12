import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import worker from '../connectivity/api/index';
import { createTestEnv, type TestHarness } from './helpers/miniflare-env';
// @ts-expect-error JSON import
import dbConfig from '../database-config.json';

let harness: TestHarness;

beforeEach(async () => {
  harness = await createTestEnv();
});

afterEach(async () => {
  await harness.dispose();
});

describe('GET /api/v1/status', () => {
  it('reports manifested-vs-bound DB URL coverage and unmanifested bound secrets', async () => {
    const env = {
      ...harness.env,
      CHITTYOS_CORE_DB_URL: 'postgres://core',
      CHITTYCOUNSEL_DB_URL: 'postgres://counsel',
      CHITTYEXTRA_DB_URL: 'postgres://extra',
    };

    const res = await worker.fetch(
      new Request('http://test.local/api/v1/status'),
      env,
      harness.ctx
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      databaseBindings: {
        manifestedCount: number;
        boundManifestedCount: number;
        missingManifested: string[];
        unmanifestedBound: string[];
      };
    };

    expect(body.databaseBindings.manifestedCount).toBe(
      (dbConfig as { databases: unknown[] }).databases.length
    );
    expect(body.databaseBindings.boundManifestedCount).toBe(2);
    expect(body.databaseBindings.missingManifested).toContain(
      'CHITTYAGENT_TASKS_DB_URL'
    );
    expect(body.databaseBindings.unmanifestedBound).toContain(
      'CHITTYEXTRA_DB_URL'
    );
  });
});
