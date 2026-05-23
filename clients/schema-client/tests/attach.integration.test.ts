/**
 * Real-network integration test for @chittyos/schema-client.
 *
 * Hits the live schema.chitty.cc/api/registry/validate/chittyschema endpoint —
 * no mocks (per project NO_MOCKS policy). The chittyschema repo itself is a
 * known-discoverable target since #59 landed.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { attach } from '../src/attach.js';
import type { AttachedSchema, DriftEvent } from '../src/types.js';

const LIVE_REGISTRY = process.env.SCHEMA_REGISTRY_URL ?? 'https://schema.chitty.cc';
const RUN_LIVE = process.env.SKIP_LIVE_TESTS !== '1';

const describeLive = RUN_LIVE ? describe : describe.skip;

describeLive('schema-client attach (live)', () => {
  let attached: AttachedSchema | undefined;

  afterEach(() => {
    attached?.stop();
    attached = undefined;
  });

  it('attaches to chittyschema and returns a real compliance envelope', async () => {
    attached = await attach({
      serviceName: 'chittyschema',
      serviceVersion: '0.0.0-attach-test',
      repoUrl: 'https://github.com/CHITTYFOUNDATION/chittyschema',
      branch: 'main',
      registry: LIVE_REGISTRY,
      pollIntervalMs: 24 * 60 * 60 * 1000,
    });

    expect(attached.serviceName).toBe('chittyschema');
    expect(attached.response.service).toBe('chittyschema');
    expect(attached.response.validation.overall_status).toMatch(
      /^(compliant|compliant_with_warnings|non_compliant)$/,
    );
    expect(attached.response.validation.required.checks.length).toBeGreaterThan(0);
    expect(attached.response.validation.evidence.repo).toBe('CHITTYFOUNDATION/chittyschema');
    expect(attached.response.badge_color).toMatch(/^(green|yellow|red)$/);
  }, 30_000);

  it('fires onDrift when bundled version differs from echoed evidence.version', async () => {
    const drifts: DriftEvent[] = [];

    attached = await attach({
      serviceName: 'chittyschema',
      serviceVersion: '0.0.0-attach-test',
      repoUrl: 'https://github.com/CHITTYFOUNDATION/chittyschema',
      branch: 'main',
      registry: LIVE_REGISTRY,
      pollIntervalMs: 24 * 60 * 60 * 1000,
      onDrift: (e) => drifts.push(e),
    });

    const echoedVersion = attached.response.validation.evidence.version;

    if (echoedVersion && echoedVersion !== '0.0.0-attach-test') {
      expect(drifts).toHaveLength(1);
      expect(drifts[0]?.bundledVersion).toBe('0.0.0-attach-test');
      expect(drifts[0]?.liveVersion).toBe(echoedVersion);
    } else {
      expect(drifts).toHaveLength(0);
    }
  }, 30_000);

  it('throws in enforce mode when overall_status is non_compliant', async () => {
    // octocat/Hello-World has no database-config.json → manifest_present fails →
    // required.fail > 0 → overall_status = non_compliant
    await expect(
      attach({
        serviceName: 'hello-world',
        serviceVersion: '0.0.0',
        repoUrl: 'https://github.com/octocat/Hello-World',
        branch: 'master',
        registry: LIVE_REGISTRY,
        mode: 'enforce',
        pollIntervalMs: 24 * 60 * 60 * 1000,
      }),
    ).rejects.toThrow(/non_compliant|HTTP/);
  }, 30_000);
});
