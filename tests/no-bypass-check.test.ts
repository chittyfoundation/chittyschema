/**
 * Pure comparison logic for check-no-bypass-connections, run on real
 * Hyperdrive/role data fetched read-only from production (no secrets).
 * member_of keeps only is_member=true rows; absent rows mean not a member.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decidePage, evaluate, parseHyperdrive, parseRoles, type HyperdriveConfig } from '../identity/scripts/lib/no-bypass-check';

const load = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf-8'));
const configs = () => parseHyperdrive(load('no-bypass-hyperdrive.prod.json'));
const roles = () => parseRoles(load('no-bypass-roles.prod.json'));

describe('evaluate (real production data)', () => {
  it('refuses neondb-chittyos-core as neondb_owner and names every reason', () => {
    const v = evaluate(configs(), roles());
    expect(v.pass).toBe(false);
    expect(v.matched).toEqual(['comptroller-neon-reader', 'comptroller-neon-writer', 'neondb-chittyos-core']);
    expect(v.findings.map((f) => `${f.config}/${f.role}`)).toEqual(['neondb-chittyos-core/neondb_owner']);
    const reasons = v.findings[0].reasons.join('|');
    expect(reasons).toContain('BYPASSRLS');
    expect(reasons).toContain('owns');
    expect(reasons).toContain('neon_superuser');
  });

  it('does not flag the comptroller reader/writer roles', () => {
    const v = evaluate(configs().filter((c) => c.name.startsWith('comptroller')), roles());
    expect(v.findings).toEqual([]);
    expect(v.errors).toEqual([]);
    expect(v.pass).toBe(true);
  });

  it('refuses when the matched role is absent from roles data', () => {
    const r = roles();
    r.roles = r.roles.filter((x) => x.rolname !== 'neondb_owner');
    const v = evaluate(configs(), r);
    expect(v.pass).toBe(false);
    expect(v.errors.join()).toContain('absent');
  });

  it('refuses when nothing matches, and when scopes is missing', () => {
    expect(evaluate(configs(), roles(), 'ep-nonexistent').pass).toBe(false);
    const r = roles();
    r.tables = r.tables.filter((t) => t.table !== 'scopes');
    expect(evaluate(configs().filter((c) => c.name.startsWith('comptroller')), r).pass).toBe(false);
  });
});

// Synthetic additions: copies of the real fixture shape (origin.host/database/user),
// with only the host varied. Not production data.
const synthetic = (id: string, name: string, host: string): HyperdriveConfig => ({
  id,
  name,
  origin: { host, database: 'neondb', user: 'neondb_owner' },
});
const IP_CFG = synthetic('syn-ip-0001', 'synthetic-ip-config', '10.0.0.5');

describe('host classification (three classes)', () => {
  it('(a) real prod fixtures still refuse on neondb-chittyos-core / neondb_owner', () => {
    const v = evaluate(configs(), roles());
    expect(v.pass).toBe(false);
    expect(v.findings.map((f) => `${f.config}/${f.role}`)).toEqual(['neondb-chittyos-core/neondb_owner']);
    expect(v.errors).toEqual([]);
  });

  it('(b) a non-Neon host (IP) is unclassifiable and refuses, naming the config', () => {
    const v = evaluate([...configs().filter((c) => c.name.startsWith('comptroller')), IP_CFG], roles());
    expect(v.pass).toBe(false);
    expect(v.errors.join('\n')).toContain('synthetic-ip-config');
    expect(v.errors.join('\n')).toContain('unclassifiable');
  });

  it('(c) --ignore-config excludes it from the refusal and lists it as ignored', () => {
    const v = evaluate([...configs().filter((c) => c.name.startsWith('comptroller')), IP_CFG], roles(), undefined, {
      ignoreConfigs: ['syn-ip-0001'],
    });
    expect(v.errors).toEqual([]);
    expect(v.pass).toBe(true);
    expect(v.ignored).toEqual(['synthetic-ip-config (syn-ip-0001)']);
  });

  it('--ignore-config cannot exclude a target config, and unknown ids refuse', () => {
    const target = configs().find((c) => c.name === 'neondb-chittyos-core')!;
    const v = evaluate(configs(), roles(), undefined, { ignoreConfigs: [target.id!, 'no-such-id'] });
    expect(v.pass).toBe(false);
    expect(v.findings.map((f) => f.config)).toEqual(['neondb-chittyos-core']);
    expect(v.errors.join('\n')).toContain('no-such-id');
    expect(v.ignored).toEqual([]);
  });

  it('(d) mixed-case host with trailing dot for the target endpoint is a target', () => {
    const cfg = synthetic('syn-case-0002', 'synthetic-mixed-case', ' EP-Green-Water-AEL1LKSW-Pooler.C-2.US-East-2.AWS.Neon.Tech. ');
    const v = evaluate([cfg], roles());
    expect(v.matched).toEqual(['synthetic-mixed-case']);
    expect(v.findings.map((f) => f.config)).toEqual(['synthetic-mixed-case']);
  });

  it('(e) a different-endpoint Neon host is ignored', () => {
    const cfg = synthetic('syn-other-0003', 'synthetic-other-endpoint', 'ep-quiet-moon-abc12345-pooler.c-9.eu-west-1.aws.neon.tech');
    const v = evaluate([...configs().filter((c) => c.name.startsWith('comptroller')), cfg], roles());
    expect(v.otherNeon).toEqual(['synthetic-other-endpoint']);
    expect(v.matched).not.toContain('synthetic-other-endpoint');
    expect(v.pass).toBe(true);
  });

  it('does not match the endpoint as a mere substring (anchored grammar)', () => {
    const cfg = synthetic('syn-sub-0004', 'synthetic-substring', 'ep-green-water-ael1lksw.evil.example.com');
    const v = evaluate([...configs().filter((c) => c.name.startsWith('comptroller')), cfg], roles());
    expect(v.matched).not.toContain('synthetic-substring');
    expect(v.pass).toBe(false);
  });
});

describe('decidePage (pagination fails closed)', () => {
  const base = { perPage: 100, maxPages: 50 };
  it('stops on a short last page without result_info', () => {
    expect(decidePage({ ...base, page: 1, fetched: 15, lastLen: 15 })).toEqual({ action: 'done' });
  });
  it('errors at the ceiling when the last page was full', () => {
    const d = decidePage({ ...base, page: 50, fetched: 5000, lastLen: 100 });
    expect(d.action).toBe('error');
  });
  it('continues on a full page below the ceiling', () => {
    expect(decidePage({ ...base, page: 3, fetched: 300, lastLen: 100 })).toEqual({ action: 'continue' });
  });
  it('is done when fetched equals total_count, even on a full page', () => {
    expect(decidePage({ ...base, page: 2, fetched: 200, lastLen: 100, resultInfo: { total_count: 200 } })).toEqual({ action: 'done' });
  });
  it('errors when fetched count mismatches total_count', () => {
    expect(decidePage({ ...base, page: 1, fetched: 15, lastLen: 15, resultInfo: { total_count: 40 } }).action).toBe('continue');
    expect(decidePage({ ...base, page: 2, fetched: 15, lastLen: 0, resultInfo: { total_count: 40 } }).action).toBe('error');
    expect(decidePage({ ...base, page: 1, fetched: 15, lastLen: 15, resultInfo: { total_count: 10 } }).action).toBe('error');
  });
});
