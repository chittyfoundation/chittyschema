/**
 * Miniflare-backed test harness for ChittySchema's Hono app.
 *
 * Provides a real KV implementation (the same code that ships with
 * Cloudflare Workers) so route tests exercise actual binding behavior
 * instead of mocked stubs. Doctrine-compliant: no vi.mock of KV/R2.
 *
 * Each call to `createTestEnv()` returns a freshly initialized Miniflare
 * instance plus a typed env object suitable for passing to
 * `app.fetch(req, env, ctx)`.
 */

import { Miniflare } from 'miniflare';

export type TestEnv = {
  ENVIRONMENT: string;
  REGISTRY_KV: KVNamespace;
  BEACON_STORE: KVNamespace;
  CANON_CACHE: KVNamespace;
};

export interface TestHarness {
  env: TestEnv;
  ctx: ExecutionContext;
  dispose(): Promise<void>;
}

/**
 * Spin up a Miniflare instance with the three KV namespaces the Hono
 * app cares about. Each test gets isolated KVs (in-memory by default —
 * we never persist between tests).
 */
export async function createTestEnv(
  overrides: { environment?: string } = {}
): Promise<TestHarness> {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch: () => new Response("noop") };',
    kvNamespaces: ['REGISTRY_KV', 'BEACON_STORE', 'CANON_CACHE'],
  });

  // Force initialization so the bindings are ready.
  await mf.ready;

  const env: TestEnv = {
    ENVIRONMENT: overrides.environment ?? 'test',
    REGISTRY_KV: (await mf.getKVNamespace('REGISTRY_KV')) as unknown as KVNamespace,
    BEACON_STORE: (await mf.getKVNamespace('BEACON_STORE')) as unknown as KVNamespace,
    CANON_CACHE: (await mf.getKVNamespace('CANON_CACHE')) as unknown as KVNamespace,
  };

  const ctx: ExecutionContext = {
    waitUntil: (_p: Promise<unknown>) => {
      // No-op in tests — we await promises explicitly.
    },
    passThroughOnException: () => {
      // No-op.
    },
    props: {},
  };

  return {
    env,
    ctx,
    async dispose() {
      await mf.dispose();
    },
  };
}
